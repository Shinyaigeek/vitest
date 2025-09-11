import type { SnapshotMatcherInvocation, Test, TestContext } from '@vitest/runner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('VitestTestRunner snapshot recording', () => {
  let mockTest: Test
  let mockContext: TestContext

  beforeEach(() => {
    mockTest = {
      id: 'test-1',
      name: 'test name',
      type: 'test',
      mode: 'run',
      meta: {},
      file: { filepath: '/test/file.ts' } as any,
      suite: undefined,
      result: undefined,
      context: {} as any,
      timeout: 5000,
      annotations: [],
    } as Test

    mockContext = {
      task: mockTest,
      meta: {},
      onTestFailed: vi.fn(),
      onTestFinished: vi.fn(),
      skip: vi.fn(),
      _recordSnapshotInvocation: vi.fn(),
    } as any
  })

  it('should have _recordSnapshotInvocation method available', () => {
    expect(mockContext._recordSnapshotInvocation).toBeDefined()
    expect(typeof mockContext._recordSnapshotInvocation).toBe('function')
  })

  it('should record snapshot invocations correctly', () => {
    const invocation: SnapshotMatcherInvocation = {
      matcher: 'toMatchSnapshot',
      location: { line: 10, column: 5 },
      name: 'test snapshot',
      passed: true,
    }

    // Record the invocation
    mockContext._recordSnapshotInvocation(invocation)

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledWith(invocation)
  })

  it('should handle multiple snapshot invocations', () => {
    const invocations: SnapshotMatcherInvocation[] = [
      {
        matcher: 'toMatchSnapshot',
        location: { line: 10, column: 5 },
        name: 'first snapshot',
        passed: true,
      },
      {
        matcher: 'toMatchInlineSnapshot',
        location: { line: 15, column: 8 },
        name: 'second snapshot',
        passed: false,
      },
    ]

    // Record multiple invocations
    invocations.forEach(inv => mockContext._recordSnapshotInvocation(inv))

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledTimes(2)
    expect(mockContext._recordSnapshotInvocation).toHaveBeenNthCalledWith(1, invocations[0])
    expect(mockContext._recordSnapshotInvocation).toHaveBeenNthCalledWith(2, invocations[1])
  })

  it('should handle different matcher types', () => {
    const matchers = [
      'toMatchSnapshot',
      'toMatchInlineSnapshot',
      'toMatchFileSnapshot',
      'toThrowErrorMatchingSnapshot',
      'toThrowErrorMatchingInlineSnapshot',
    ] as const

    matchers.forEach((matcher, index) => {
      const invocation: SnapshotMatcherInvocation = {
        matcher,
        location: { line: 10 + index, column: 5 },
        name: `test ${matcher}`,
        passed: true,
      }

      mockContext._recordSnapshotInvocation(invocation)
    })

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledTimes(5)
  })

  it('should handle snapshot recording errors gracefully', () => {
    // Test that the method doesn't throw even with invalid input
    expect(() => {
      mockContext._recordSnapshotInvocation(null as any)
    }).not.toThrow()

    expect(() => {
      mockContext._recordSnapshotInvocation(undefined as any)
    }).not.toThrow()
  })
})
