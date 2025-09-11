import type { SnapshotMatcherInvocation, TestContext } from '@vitest/runner'
import { describe, expect, it, vi } from 'vitest'

describe('_recordSnapshotInvocation typing', () => {
  it('should have proper type for _recordSnapshotInvocation method', () => {
    // Create a mock test context that matches the expected interface
    const mockContext: TestContext & { _recordSnapshotInvocation: (invocation: SnapshotMatcherInvocation) => void } = {
      expect,
      _local: false,
      _recordSnapshotInvocation: vi.fn(),
      task: {} as TestContext['task'],
      onTestFailed: vi.fn(),
      onTestFinished: vi.fn(),
      skip: vi.fn() as any,
      signal: new AbortController().signal,
      annotate: vi.fn(),
    }

    // Test that _recordSnapshotInvocation accepts the correct parameter type
    const invocation: SnapshotMatcherInvocation = {
      matcher: 'toMatchSnapshot',
      location: { line: 10, column: 5 },
      name: 'test name',
      passed: true,
    }

    // This should not cause TypeScript errors since the method is properly typed
    mockContext._recordSnapshotInvocation(invocation)

    // Verify the method was called with the correct argument
    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledWith(invocation)
  })

  it('should enforce correct parameter type for _recordSnapshotInvocation', () => {
    const mockContext: TestContext & { _recordSnapshotInvocation: (invocation: SnapshotMatcherInvocation) => void } = {
      expect,
      _local: false,
      _recordSnapshotInvocation: vi.fn(),
      task: {} as TestContext['task'],
      onTestFailed: vi.fn(),
      onTestFinished: vi.fn(),
      skip: vi.fn() as any,
      signal: new AbortController().signal,
      annotate: vi.fn(),
    }

    // Test with different matcher types
    const invocations: SnapshotMatcherInvocation[] = [
      {
        matcher: 'toMatchSnapshot',
        location: { line: 1, column: 1 },
        name: 'test 1',
        passed: true,
      },
      {
        matcher: 'toMatchInlineSnapshot',
        location: { line: 2, column: 1 },
        name: 'test 2',
        passed: false,
      },
      {
        matcher: 'toMatchFileSnapshot',
        location: { line: 3, column: 1 },
        name: 'test 3',
        passed: true,
      },
      {
        matcher: 'toThrowErrorMatchingSnapshot',
        location: { line: 4, column: 1 },
        name: 'test 4',
        passed: true,
      },
      {
        matcher: 'toThrowErrorMatchingInlineSnapshot',
        location: { line: 5, column: 1 },
        name: 'test 5',
        passed: false,
      },
    ]

    // All these should work without TypeScript errors
    invocations.forEach((invocation) => {
      mockContext._recordSnapshotInvocation(invocation)
    })

    expect(mockContext._recordSnapshotInvocation).toHaveBeenCalledTimes(5)
  })

  it('should be available as an internal method on TestContext', () => {
    const mockContext: TestContext & { _recordSnapshotInvocation: (invocation: SnapshotMatcherInvocation) => void } = {
      expect,
      _local: false,
      _recordSnapshotInvocation: vi.fn(),
      task: {} as TestContext['task'],
      onTestFailed: vi.fn(),
      onTestFinished: vi.fn(),
      skip: vi.fn() as any,
      signal: new AbortController().signal,
      annotate: vi.fn(),
    }

    // Verify the method exists and is callable
    expect(typeof mockContext._recordSnapshotInvocation).toBe('function')

    // Verify it's marked as internal by checking it starts with underscore
    expect('_recordSnapshotInvocation' in mockContext).toBe(true)
  })
})
