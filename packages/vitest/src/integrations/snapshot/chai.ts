import type { Assertion, ChaiPlugin } from '@vitest/expect'
import type { Test } from '@vitest/runner'
import type { SnapshotMatcherInvocation } from '@vitest/runner/types'
import { equals, iterableEquality, subsetEquality } from '@vitest/expect'
import { getNames } from '@vitest/runner/utils'
import {
  addSerializer,
  SnapshotClient,
  stripSnapshotIndentation,
} from '@vitest/snapshot'
import { parseSingleStack } from '@vitest/utils/source-map'
import { createAssertionMessage, recordAsyncExpect } from '../../../../expect/src/utils'
import { rpc } from '../../runtime/rpc'

/**
 * Error used specifically for capturing the call site stack trace
 * of snapshot matcher invocations for location tracking purposes.
 *
 * This error is created at the exact moment a snapshot matcher is called
 * to capture the stack trace with accurate line and column information.
 * The stack trace is then parsed to determine where in the test file
 * the snapshot matcher was invoked.
 */
export class SnapshotMatcherStackTraceError extends Error {
  constructor() {
    super('SNAPSHOT_MATCHER_STACK_TRACE_CAPTURE')
    this.name = 'SnapshotMatcherStackTraceError'
  }
}

let _client: SnapshotClient

export function getSnapshotClient(): SnapshotClient {
  if (!_client) {
    _client = new SnapshotClient({
      isEqual: (received, expected) => {
        return equals(received, expected, [iterableEquality, subsetEquality])
      },
    })
  }
  return _client
}

function getError(expected: () => void | Error, promise: string | undefined) {
  if (typeof expected !== 'function') {
    if (!promise) {
      throw new Error(
        `expected must be a function, received ${typeof expected}`,
      )
    }

    // when "promised", it receives thrown error
    return expected
  }

  try {
    expected()
  }
  catch (e) {
    return e
  }

  throw new Error('snapshot function didn\'t throw')
}

function getTestNames(test: Test) {
  return {
    filepath: test.file.filepath,
    name: getNames(test).slice(1).join(' > '),
    testId: test.id,
  }
}

function recordSnapshotInvocation(
  test: Test,
  matcher: SnapshotMatcherInvocation['matcher'],
  passed: boolean,
  error?: Error,
  snapshotData?: { key: string; count: number },
) {
  try {
    // Get location from error stack trace using proper stack parsing
    const stack = error?.stack
    let line = 0
    let column = 0

    if (stack) {
      // Parse the stack to find the test file location
      const stackLines = stack.split('\n')
      for (const stackLine of stackLines) {
        const parsed = parseSingleStack(stackLine)
        if (parsed && parsed.file === test.file.filepath) {
          line = parsed.line
          column = parsed.column
          break
        }
      }
    }

    const invocation: SnapshotMatcherInvocation = {
      matcher,
      location: { line, column },
      name: getNames(test).slice(1).join(' > '),
      passed,
      snapshot: snapshotData,
    }

    // Record the invocation if the test context has the recording method
    const context = test.context
    if (context && typeof context._recordSnapshotInvocation === 'function') {
      context._recordSnapshotInvocation(invocation)
    }
  }
  catch (recordError) {
    // Don't let snapshot recording errors break the test
    console.warn('Failed to record snapshot invocation:', recordError)
  }
}

function recordSnapshotInvocationWithResult(
  test: Test,
  matcher: SnapshotMatcherInvocation['matcher'],
  assertionFn: () => void,
) {
  // Capture the call site stack trace before any async operations
  const callSiteError = new SnapshotMatcherStackTraceError()

  // Store the original assert method
  const snapshotClient = getSnapshotClient()
  const originalAssert = snapshotClient.assert.bind(snapshotClient)

  let snapshotResult: { key: string; count: number } | undefined

  // Temporarily override the assert method to capture snapshot data
  snapshotClient.assert = function (options: Parameters<SnapshotClient['assert']>[0]) {
    try {
      const result = originalAssert(options)

      // Capture successful snapshot data
      const snapshotState = snapshotClient.getSnapshotState(options.filepath)
      const testName = options.name
      const count = (snapshotState as unknown as { _counters?: Map<string, number> })._counters?.get(testName) || 1
      const key = `${testName} ${count}`

      snapshotResult = {
        key,
        count,
      }

      // Store snapshot content in memory via RPC
      try {
        const expected = (snapshotState as unknown as { _snapshotData?: Record<string, string> })._snapshotData?.[key] || ''
        rpc().storeSnapshotContent(test.file.filepath, testName, key, {
          expected,
          actual: '', // For successful snapshots, actual matches expected
          count,
        })
      }
      catch (error) {
        console.warn('Failed to store snapshot content in memory:', error)
      }

      return result
    }
    catch (error) {
      // Capture failed snapshot data from the error
      if (error && typeof error === 'object' && 'actual' in error && 'expected' in error) {
        const snapshotState = snapshotClient.getSnapshotState(options.filepath)
        const testName = options.name
        const count = (snapshotState as unknown as { _counters?: Map<string, number> })._counters?.get(testName) || 1
        const key = `${testName} ${count}`

        snapshotResult = {
          key,
          count,
        }

        // Skip storing failed snapshot content since we don't display failed snapshots
      }
      throw error
    }
    finally {
      // Restore the original assert method
      snapshotClient.assert = originalAssert
    }
  }

  try {
    assertionFn()
    // Record the successful invocation using the captured call site and snapshot data
    recordSnapshotInvocation(test, matcher, true, callSiteError, snapshotResult)
  }
  catch (assertError) {
    // Record the failed invocation using the captured call site and snapshot data
    recordSnapshotInvocation(test, matcher, false, callSiteError, snapshotResult)
    throw assertError
  }
  finally {
    // Ensure the original assert method is restored
    snapshotClient.assert = originalAssert
  }
}

export const SnapshotPlugin: ChaiPlugin = (chai, utils) => {
  function getTest(assertionName: string, obj: object) {
    const test = utils.flag(obj, 'vitest-test')
    if (!test) {
      throw new Error(`'${assertionName}' cannot be used without test context`)
    }
    return test as Test
  }

  for (const key of ['matchSnapshot', 'toMatchSnapshot']) {
    utils.addMethod(
      chai.Assertion.prototype,
      key,
      function (
        this: Record<string, unknown>,
        properties?: object,
        message?: string,
      ) {
        utils.flag(this, '_name', key)
        const isNot = utils.flag(this, 'negate')
        if (isNot) {
          throw new Error(`${key} cannot be used with "not"`)
        }
        const expected = utils.flag(this, 'object')
        const test = getTest(key, this)
        if (typeof properties === 'string' && typeof message === 'undefined') {
          message = properties
          properties = undefined
        }
        const errorMessage = utils.flag(this, 'message')

        // Record snapshot invocation with result tracking
        recordSnapshotInvocationWithResult(test, 'toMatchSnapshot', () => {
          getSnapshotClient().assert({
            received: expected,
            message,
            isInline: false,
            properties,
            errorMessage,
            ...getTestNames(test),
          })
        })
      },
    )
  }

  utils.addMethod(
    chai.Assertion.prototype,
    'toMatchFileSnapshot',
    function (this: Assertion, file: string, message?: string) {
      utils.flag(this, '_name', 'toMatchFileSnapshot')
      const isNot = utils.flag(this, 'negate')
      if (isNot) {
        throw new Error('toMatchFileSnapshot cannot be used with "not"')
      }
      const error = new Error('resolves')
      const expected = utils.flag(this, 'object')
      const test = getTest('toMatchFileSnapshot', this)
      const errorMessage = utils.flag(this, 'message')

      // Capture the call site stack trace before async operations
      const callSiteError = new SnapshotMatcherStackTraceError()

      const promise = getSnapshotClient().assertRaw({
        received: expected,
        message,
        isInline: false,
        rawSnapshot: {
          file,
        },
        errorMessage,
        ...getTestNames(test),
      }).then(
        (result) => {
          // For async operations, we can't easily capture the snapshot data
          // The UI will need to fall back to the file system approach for file snapshots
          recordSnapshotInvocation(test, 'toMatchFileSnapshot', true, callSiteError)
          return result
        },
        (assertError) => {
          // Try to extract snapshot data from the error if available
          if (assertError && typeof assertError === 'object' && 'actual' in assertError && 'expected' in assertError) {
            const snapshotData = {
              key: file, // Use the file path as the key for file snapshots
              count: 1, // File snapshots typically have count 1
            }
            recordSnapshotInvocation(test, 'toMatchFileSnapshot', false, callSiteError, snapshotData)
          }
          else {
            recordSnapshotInvocation(test, 'toMatchFileSnapshot', false, callSiteError)
          }
          throw assertError
        },
      )

      return recordAsyncExpect(
        test,
        promise,
        createAssertionMessage(utils, this, true),
        error,
      )
    },
  )

  utils.addMethod(
    chai.Assertion.prototype,
    'toMatchInlineSnapshot',
    function __INLINE_SNAPSHOT__(
      this: Record<string, unknown>,
      properties?: object,
      inlineSnapshot?: string,
      message?: string,
    ) {
      utils.flag(this, '_name', 'toMatchInlineSnapshot')
      const isNot = utils.flag(this, 'negate')
      if (isNot) {
        throw new Error('toMatchInlineSnapshot cannot be used with "not"')
      }
      const test = getTest('toMatchInlineSnapshot', this)
      const isInsideEach = test.each || test.suite?.each
      if (isInsideEach) {
        throw new Error(
          'InlineSnapshot cannot be used inside of test.each or describe.each',
        )
      }
      const expected = utils.flag(this, 'object')
      const error = utils.flag(this, 'error')
      if (typeof properties === 'string') {
        message = inlineSnapshot
        inlineSnapshot = properties
        properties = undefined
      }
      if (inlineSnapshot) {
        inlineSnapshot = stripSnapshotIndentation(inlineSnapshot)
      }
      const errorMessage = utils.flag(this, 'message')

      getSnapshotClient().assert({
        received: expected,
        message,
        isInline: true,
        properties,
        inlineSnapshot,
        error,
        errorMessage,
        ...getTestNames(test),
      })
    },
  )
  utils.addMethod(
    chai.Assertion.prototype,
    'toThrowErrorMatchingSnapshot',
    function (this: Record<string, unknown>, message?: string) {
      utils.flag(this, '_name', 'toThrowErrorMatchingSnapshot')
      const isNot = utils.flag(this, 'negate')
      if (isNot) {
        throw new Error(
          'toThrowErrorMatchingSnapshot cannot be used with "not"',
        )
      }
      const expected = utils.flag(this, 'object')
      const test = getTest('toThrowErrorMatchingSnapshot', this)
      const promise = utils.flag(this, 'promise') as string | undefined
      const errorMessage = utils.flag(this, 'message')

      // Record snapshot invocation with result tracking
      recordSnapshotInvocationWithResult(test, 'toThrowErrorMatchingSnapshot', () => {
        getSnapshotClient().assert({
          received: getError(expected, promise),
          message,
          errorMessage,
          ...getTestNames(test),
        })
      })
    },
  )
  utils.addMethod(
    chai.Assertion.prototype,
    'toThrowErrorMatchingInlineSnapshot',
    function __INLINE_SNAPSHOT__(
      this: Record<string, unknown>,
      inlineSnapshot: string,
      message: string,
    ) {
      const isNot = utils.flag(this, 'negate')
      if (isNot) {
        throw new Error(
          'toThrowErrorMatchingInlineSnapshot cannot be used with "not"',
        )
      }
      const test = getTest('toThrowErrorMatchingInlineSnapshot', this)
      const isInsideEach = test.each || test.suite?.each
      if (isInsideEach) {
        throw new Error(
          'InlineSnapshot cannot be used inside of test.each or describe.each',
        )
      }
      const expected = utils.flag(this, 'object')
      const error = utils.flag(this, 'error')
      const promise = utils.flag(this, 'promise') as string | undefined
      const errorMessage = utils.flag(this, 'message')

      if (inlineSnapshot) {
        inlineSnapshot = stripSnapshotIndentation(inlineSnapshot)
      }

      getSnapshotClient().assert({
        received: getError(expected, promise),
        message,
        inlineSnapshot,
        isInline: true,
        error,
        errorMessage,
        ...getTestNames(test),
      })
    },
  )
  utils.addMethod(chai.expect, 'addSnapshotSerializer', addSerializer)
}
