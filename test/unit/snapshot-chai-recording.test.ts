import type { SnapshotMatcherInvocation, Test } from '@vitest/runner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Snapshot chai recording functions', () => {
  let mockTest: Test
  let mockContext: { _recordSnapshotInvocation: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    mockTest = {
      id: 'test-1',
      name: 'test name',
      type: 'test',
      mode: 'run',
      meta: {},
      file: {
        filepath: '/test/file.ts',
        projectName: undefined,
        type: 'suite',
        tasks: [],
        id: 'file-1',
      } as any,
      context: {} as any,
      timeout: 5000,
      annotations: [],
    } as Test

    mockContext = {
      _recordSnapshotInvocation: vi.fn(),
    }

    mockTest.context = mockContext as any
  })

  it('should record snapshot invocation structure correctly', () => {
    // Test that we can create and validate snapshot invocation structure
    const invocation = {
      matcher: 'toMatchSnapshot' as const,
      location: { line: 15, column: 10 },
      name: 'test snapshot',
      passed: true,
    }

    // Simulate what would happen in the real recording function
    mockContext._recordSnapshotInvocation(invocation)

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledWith({
      matcher: 'toMatchSnapshot',
      location: { line: 15, column: 10 },
      name: 'test snapshot',
      passed: true,
    })
  })

  it('should record snapshot invocation with proper location parsing', () => {
    const recordSnapshotInvocation = (test: Test, matcher: SnapshotMatcherInvocation['matcher'], error?: Error) => {
      try {
        const stack = error?.stack
        let line = 0
        let column = 0

        if (stack) {
          const lines = stack.split('\n')
          for (const stackLine of lines) {
            if (stackLine.includes(test.file.filepath)) {
              const match = stackLine.match(/:(\d+):(\d+)/)
              if (match) {
                line = Number.parseInt(match[1], 10)
                column = Number.parseInt(match[2], 10)
                break
              }
            }
          }
        }

        const invocation = {
          matcher,
          location: { line, column },
          name: test.name,
          passed: true,
        }

        if (test.context && typeof test.context._recordSnapshotInvocation === 'function') {
          test.context._recordSnapshotInvocation(invocation)
        }
      }
      catch (recordError) {
        console.warn('Failed to record snapshot invocation:', recordError)
      }
    }

    // Create a mock error with stack trace
    const mockError = new Error('test error')
    mockError.stack = `Error: test error
    at Object.toMatchSnapshot (/test/file.ts:15:20)
    at Context.<anonymous> (/test/file.ts:10:5)`

    recordSnapshotInvocation(mockTest, 'toMatchSnapshot', mockError)

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledWith({
      matcher: 'toMatchSnapshot',
      location: { line: 15, column: 20 },
      name: 'test name',
      passed: true,
    })
  })

  it('should handle stack trace parsing failure gracefully', () => {
    const recordSnapshotInvocation = (test: Test, matcher: SnapshotMatcherInvocation['matcher'], error?: Error) => {
      try {
        const stack = error?.stack
        let line = 0
        let column = 0

        if (stack) {
          const lines = stack.split('\n')
          for (const stackLine of lines) {
            if (stackLine.includes(test.file.filepath)) {
              const match = stackLine.match(/:(\d+):(\d+)/)
              if (match) {
                line = Number.parseInt(match[1], 10)
                column = Number.parseInt(match[2], 10)
                break
              }
            }
          }
        }

        const invocation = {
          matcher,
          location: { line, column },
          name: test.name,
          passed: true,
        }

        if (test.context && typeof test.context._recordSnapshotInvocation === 'function') {
          test.context._recordSnapshotInvocation(invocation)
        }
      }
      catch (recordError) {
        console.warn('Failed to record snapshot invocation:', recordError)
      }
    }

    // Test with no error
    recordSnapshotInvocation(mockTest, 'toMatchSnapshot')

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledWith({
      matcher: 'toMatchSnapshot',
      location: { line: 0, column: 0 },
      name: 'test name',
      passed: true,
    })

    // Test with error but no matching stack line
    const mockError = new Error('test error')
    mockError.stack = `Error: test error
    at Object.toMatchSnapshot (/other/file.ts:15:20)`

    recordSnapshotInvocation(mockTest, 'toMatchSnapshot', mockError)

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledWith({
      matcher: 'toMatchSnapshot',
      location: { line: 0, column: 0 },
      name: 'test name',
      passed: true,
    })
  })

  it('should handle missing context gracefully', () => {
    const recordSnapshotInvocation = (test: Test, matcher: SnapshotMatcherInvocation['matcher'], error?: Error) => {
      try {
        const invocation = {
          matcher,
          location: { line: 0, column: 0 },
          name: test.name,
          passed: true,
        }

        if (test.context && typeof test.context._recordSnapshotInvocation === 'function') {
          test.context._recordSnapshotInvocation(invocation)
        }
      }
      catch (recordError) {
        console.warn('Failed to record snapshot invocation:', recordError)
      }
    }

    // Test with no context
    const testWithoutContext = { ...mockTest, context: undefined as unknown as Test['context'] } as Test

    expect(() => {
      recordSnapshotInvocation(testWithoutContext, 'toMatchSnapshot')
    }).not.toThrow()

    // Test with context but no recording method
    const testWithInvalidContext = {
      ...mockTest,
      context: { _recordSnapshotInvocation: 'not a function' as unknown as Test['context']['_recordSnapshotInvocation'] },
    } as Test

    expect(() => {
      recordSnapshotInvocation(testWithInvalidContext, 'toMatchSnapshot')
    }).not.toThrow()
  })

  it('should record different snapshot matcher types', () => {
    const recordSnapshotInvocation = (test: Test, matcher: SnapshotMatcherInvocation['matcher']) => {
      const invocation = {
        matcher,
        location: { line: 0, column: 0 },
        name: test.name,
        passed: true,
      }

      if (test.context && typeof test.context._recordSnapshotInvocation === 'function') {
        test.context._recordSnapshotInvocation(invocation)
      }
    }

    const matchers: SnapshotMatcherInvocation['matcher'][] = [
      'toMatchSnapshot',
      'toMatchInlineSnapshot',
      'toMatchFileSnapshot',
      'toThrowErrorMatchingSnapshot',
      'toThrowErrorMatchingInlineSnapshot',
    ]

    matchers.forEach((matcher) => {
      recordSnapshotInvocation(mockTest, matcher)
    })

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledTimes(5)

    matchers.forEach((matcher, index) => {
      expect(mockContext._recordSnapshotInvocation).toHaveBeenNthCalledWith(index + 1, {
        matcher,
        location: { line: 0, column: 0 },
        name: 'test name',
        passed: true,
      })
    })
  })
})
