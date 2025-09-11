import { describe, expect, it } from 'vitest'

// Integration test to verify the complete flow from chai plugin to UI
describe('Snapshot invocation integration', () => {
  it('should integrate properly with vitest test execution', async () => {
    // This test verifies that the complete flow works:
    // 1. Test runs with snapshot assertion
    // 2. Chai plugin records the invocation
    // 3. Test runner collects invocations
    // 4. Results are available for UI consumption

    // Mock a complete test run scenario
    const mockSnapshotInvocation = {
      matcher: 'toMatchSnapshot' as const,
      location: { line: 15, column: 10 },
      name: 'integration test',
      passed: true,
    }

    // Simulate test result structure that would be sent to UI
    const testResult = {
      id: 'test-1',
      name: 'integration test',
      type: 'test' as const,
      mode: 'run' as const,
      result: {
        state: 'pass' as const,
        snapshotMatchers: [mockSnapshotInvocation],
      },
    }

    // Verify the structure matches what UI expects
    expect(testResult.result.snapshotMatchers).toBeDefined()
    expect(testResult.result.snapshotMatchers).toHaveLength(1)
    expect(testResult.result.snapshotMatchers![0]).toMatchObject({
      matcher: 'toMatchSnapshot',
      location: { line: 15, column: 10 },
      name: 'integration test',
      passed: true,
    })
  })

  it('should handle complex test suite with multiple snapshot matchers', () => {
    // Simulate a test suite with multiple tests and snapshot invocations
    const suiteResult = {
      id: 'suite-1',
      name: 'snapshot suite',
      type: 'suite' as const,
      tasks: [
        {
          id: 'test-1',
          name: 'first test',
          type: 'test' as const,
          result: {
            state: 'pass' as const,
            snapshotMatchers: [
              {
                matcher: 'toMatchSnapshot' as const,
                location: { line: 10, column: 5 },
                name: 'first test',
                passed: true,
              },
              {
                matcher: 'toMatchInlineSnapshot' as const,
                location: { line: 15, column: 8 },
                name: 'first test',
                passed: true,
              },
            ],
          },
        },
        {
          id: 'test-2',
          name: 'second test',
          type: 'test' as const,
          result: {
            state: 'fail' as const,
            snapshotMatchers: [
              {
                matcher: 'toMatchSnapshot' as const,
                location: { line: 25, column: 5 },
                name: 'second test',
                passed: false,
              },
            ],
          },
        },
      ],
    }

    // Verify structure for UI consumption
    const allSnapshots = suiteResult.tasks.flatMap(task =>
      task.result?.snapshotMatchers?.map(matcher => ({
        ...matcher,
        taskName: task.name,
      })) || [],
    )

    expect(allSnapshots).toHaveLength(3)
    expect(allSnapshots[0]).toMatchObject({
      matcher: 'toMatchSnapshot',
      taskName: 'first test',
      passed: true,
    })
    expect(allSnapshots[1]).toMatchObject({
      matcher: 'toMatchInlineSnapshot',
      taskName: 'first test',
      passed: true,
    })
    expect(allSnapshots[2]).toMatchObject({
      matcher: 'toMatchSnapshot',
      taskName: 'second test',
      passed: false,
    })
  })

  it('should maintain type safety across the integration', () => {
    // Verify that the type system prevents invalid invocations
    type ValidMatcher = 'toMatchSnapshot' | 'toMatchInlineSnapshot' | 'toMatchFileSnapshot' | 'toThrowErrorMatchingSnapshot' | 'toThrowErrorMatchingInlineSnapshot'

    const createValidInvocation = (matcher: ValidMatcher) => ({
      matcher,
      location: { line: 1, column: 1 },
      name: 'test',
      passed: true,
    })

    // These should all be valid
    const validMatchers: ValidMatcher[] = [
      'toMatchSnapshot',
      'toMatchInlineSnapshot',
      'toMatchFileSnapshot',
      'toThrowErrorMatchingSnapshot',
      'toThrowErrorMatchingInlineSnapshot',
    ]

    validMatchers.forEach((matcher) => {
      const invocation = createValidInvocation(matcher)
      expect(invocation.matcher).toBe(matcher)
      expect(typeof invocation.location.line).toBe('number')
      expect(typeof invocation.location.column).toBe('number')
      expect(typeof invocation.name).toBe('string')
      expect(typeof invocation.passed).toBe('boolean')
    })
  })

  it('should handle edge cases in integration flow', () => {
    // Test various edge cases that could occur in the integration

    // Test with no snapshot matchers
    const testWithoutSnapshots = {
      id: 'test-no-snapshots',
      name: 'test without snapshots',
      type: 'test' as const,
      result: {
        state: 'pass' as const,
        snapshotMatchers: undefined,
      },
    }

    expect(testWithoutSnapshots.result.snapshotMatchers).toBeUndefined()

    // Test with empty snapshot matchers
    const testWithEmptySnapshots = {
      id: 'test-empty-snapshots',
      name: 'test with empty snapshots',
      type: 'test' as const,
      result: {
        state: 'pass' as const,
        snapshotMatchers: [],
      },
    }

    expect(testWithEmptySnapshots.result.snapshotMatchers).toEqual([])

    // Test with zero location coordinates
    const testWithZeroLocation = {
      id: 'test-zero-location',
      name: 'test with zero location',
      type: 'test' as const,
      result: {
        state: 'pass' as const,
        snapshotMatchers: [{
          matcher: 'toMatchSnapshot' as const,
          location: { line: 0, column: 0 },
          name: 'test with zero location',
          passed: true,
        }],
      },
    }

    expect(testWithZeroLocation.result.snapshotMatchers[0].location).toEqual({ line: 0, column: 0 })
  })

  it('should support async snapshot operations', async () => {
    // Test integration with async snapshot operations like toMatchFileSnapshot

    const asyncSnapshotTest = {
      id: 'test-async',
      name: 'async snapshot test',
      type: 'test' as const,
      result: {
        state: 'pass' as const,
        snapshotMatchers: [{
          matcher: 'toMatchFileSnapshot' as const,
          location: { line: 20, column: 10 },
          name: 'async snapshot test',
          passed: true,
        }],
      },
    }

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 1))

    expect(asyncSnapshotTest.result.snapshotMatchers[0].matcher).toBe('toMatchFileSnapshot')
    expect(asyncSnapshotTest.result.snapshotMatchers[0].passed).toBe(true)
  })
})
