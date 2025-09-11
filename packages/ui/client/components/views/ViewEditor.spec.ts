import type { SnapshotMatcherInvocation } from '@vitest/runner'
import { describe, expect, it } from 'vitest'

// Test for the ViewEditor component's snapshot matcher handling
describe('ViewEditor snapshot matcher invocations', () => {
  it('should properly type SnapshotMatcherInvocation objects', () => {
    // Test that SnapshotMatcherInvocation objects have the correct structure
    const snapshotInvocation: SnapshotMatcherInvocation = {
      matcher: 'toMatchSnapshot',
      location: { line: 15, column: 10 },
      name: 'should match snapshot',
      passed: true,
    }

    expect(snapshotInvocation).toEqual({
      matcher: 'toMatchSnapshot',
      location: { line: 15, column: 10 },
      name: 'should match snapshot',
      passed: true,
    })
  })

  it('should handle different snapshot matcher types', () => {
    const matchers: SnapshotMatcherInvocation[] = [
      {
        matcher: 'toMatchSnapshot',
        location: { line: 1, column: 1 },
        name: 'test 1',
        passed: true,
      },
      {
        matcher: 'toMatchInlineSnapshot',
        location: { line: 2, column: 5 },
        name: 'test 2',
        passed: false,
      },
      {
        matcher: 'toMatchFileSnapshot',
        location: { line: 3, column: 10 },
        name: 'test 3',
        passed: true,
      },
      {
        matcher: 'toThrowErrorMatchingSnapshot',
        location: { line: 4, column: 15 },
        name: 'test 4',
        passed: true,
      },
      {
        matcher: 'toThrowErrorMatchingInlineSnapshot',
        location: { line: 5, column: 20 },
        name: 'test 5',
        passed: false,
      },
    ]

    expect(matchers).toHaveLength(5)
    expect(matchers[0].matcher).toBe('toMatchSnapshot')
    expect(matchers[1].matcher).toBe('toMatchInlineSnapshot')
    expect(matchers[2].matcher).toBe('toMatchFileSnapshot')
    expect(matchers[3].matcher).toBe('toThrowErrorMatchingSnapshot')
    expect(matchers[4].matcher).toBe('toThrowErrorMatchingInlineSnapshot')
  })

  it('should handle snapshot matchers with taskName extension', () => {
    // Test the extended interface used in ViewEditor
    const extendedMatcher: SnapshotMatcherInvocation & { taskName: string } = {
      matcher: 'toMatchSnapshot',
      location: { line: 10, column: 5 },
      name: 'snapshot test',
      passed: true,
      taskName: 'my test task',
    }

    expect(extendedMatcher.taskName).toBe('my test task')
    expect(extendedMatcher.matcher).toBe('toMatchSnapshot')
    expect(extendedMatcher.passed).toBe(true)
  })

  it('should handle zero location coordinates', () => {
    // Test case where location is not available (line: 0, column: 0)
    const matcherWithoutLocation: SnapshotMatcherInvocation = {
      matcher: 'toMatchSnapshot',
      location: { line: 0, column: 0 },
      name: 'test without location',
      passed: true,
    }

    expect(matcherWithoutLocation.location.line).toBe(0)
    expect(matcherWithoutLocation.location.column).toBe(0)
  })

  it('should handle failed snapshot invocations', () => {
    const failedInvocation: SnapshotMatcherInvocation = {
      matcher: 'toMatchInlineSnapshot',
      location: { line: 25, column: 8 },
      name: 'failed snapshot test',
      passed: false,
    }

    expect(failedInvocation.passed).toBe(false)
    expect(failedInvocation.matcher).toBe('toMatchInlineSnapshot')
  })

  it('should validate the structure of snapshot matcher collection', () => {
    // Simulate the structure used in ViewEditor's snapshotMatchers computed property
    const mockMatchers: Array<SnapshotMatcherInvocation & { taskName: string }> = []

    // Add some mock data
    mockMatchers.push({
      matcher: 'toMatchSnapshot',
      location: { line: 12, column: 4 },
      name: 'user snapshot',
      passed: true,
      taskName: 'user tests',
    })

    mockMatchers.push({
      matcher: 'toMatchInlineSnapshot',
      location: { line: 18, column: 6 },
      name: 'inline snapshot',
      passed: false,
      taskName: 'integration tests',
    })

    expect(mockMatchers).toHaveLength(2)
    expect(mockMatchers.every(m => typeof m.taskName === 'string')).toBe(true)
    expect(mockMatchers.every(m => typeof m.passed === 'boolean')).toBe(true)
    expect(mockMatchers.every(m => typeof m.location === 'object')).toBe(true)
  })
})
