# Vitest Snapshot Matcher UI Implementation - Progress Report

## Project Overview

This project implements a feature to display snapshot matcher results (like `toMatchSnapshot`, `toMatchInlineSnapshot`, etc.) in the Vitest UI. The implementation captures where snapshot matchers are invoked with accurate line and column information, and displays the results in the UI with **lazy-loaded** snapshot content that is fetched on-demand without any file system access.

## Context and Background

### Original Issue & PR
- **GitHub Issue**: [#4060](https://github.com/vitest-dev/vitest/issues/4060) - Request to display component snapshots in vitest-ui for easier verification
- **Related PR**: [#8335](https://github.com/vitest-dev/vitest/pull/8335) - Initial implementation of snapshot result visualization in Vitest UI

### Problem Statement
When creating component snapshots in tests, developers found it difficult to:
- Identify which specific component a snapshot represents
- Visually inspect snapshot details, especially for form components
- Verify component rendering without manually searching snapshot files

## Implementation Progress

### Phase 1: Core Infrastructure (Completed ✅)

#### 1. Type Definitions (`packages/runner/src/types/tasks.ts`)
- Enhanced `SnapshotMatcherInvocation` interface with metadata-only approach
- Added `snapshotMatchers?: SnapshotMatcherInvocation[]` to `TaskResult`
- Supports all snapshot matcher types: `toMatchSnapshot`, `toMatchFileSnapshot`, `toMatchInlineSnapshot`, etc.

#### 2. Snapshot Recording (`packages/vitest/src/integrations/snapshot/chai.ts`)
- **Key Components**:
  - `SnapshotMatcherStackTraceError`: Custom error class for capturing call site stack traces
  - `recordSnapshotInvocation()`: Records snapshot invocation with location and metadata only
  - `recordSnapshotInvocationWithResult()`: Intercepts snapshot client to capture metadata and store content via RPC
- **Stack Parsing**: Uses `parseSingleStack` from `@vitest/utils/source-map` for accurate location detection
- **RPC Storage**: Uses `rpc().storeSnapshotContent()` to store snapshot content in main process memory

#### 3. RPC Integration (`packages/vitest/src/types/rpc.ts` & `packages/vitest/src/node/pools/rpc.ts`)
- Added `storeSnapshotContent` RPC method for cross-process communication
- Workers call RPC during test execution, main process stores content in memory
- Avoids DataCloneError by using RPC instead of function passing

#### 4. Test Runner Integration (`packages/vitest/src/runtime/runners/test.ts`)
- Enhanced test context with `_recordSnapshotInvocation` method
- Maintains `snapshotInvocations` WeakMap for test-to-invocations mapping
- Clears invocations on test retry/re-run
- Adds snapshot invocations to test result in `onAfterRunTask`

### Phase 2: Storage & API (Completed ✅)

#### 5. Main Process Storage (`packages/vitest/src/api/setup.ts`)
- **In-Memory Snapshot Content Store**: Map with `store()`, `get()`, `clear()` functions
- **Key Format**: `"filepath:testName:snapshotKey"`
- **Content Structure**: `{ expected: string, actual: string, count: number }`
- **Utility Functions**: Abstracted storeKey generation and filtering logic
  - `snapshotStoreKeyUtils.generateKey()`: Generate store key from components
  - `snapshotStoreKeyUtils.parseKey()`: Parse store key back into components
  - `snapshotStoreKeyUtils.isForFile()`: Check if key belongs to specific file
  - `snapshotStoreKeyUtils.getKeysForFile()`: Get all keys for a file
  - `snapshotStoreKeyUtils.getContentForFile()`: Get all content for a file

#### 6. API Implementation (`packages/vitest/src/api/setup.ts`)
- **`getSnapshotContent` RPC method**: Pure in-memory content retrieval
- Uses snapshot metadata to identify content
- **No file system access** - pure in-memory retrieval
- Returns empty content if not found in memory

### Phase 3: UI Implementation (Completed ✅)

#### 7. UI Components
- **Original Component**: `packages/ui/client/components/views/ViewEditor.vue`
- **Extracted Component**: `packages/ui/client/components/views/SnapshotMatcher.vue`

#### 8. UI Features
- Collects snapshot matchers from all tests in a file
- **Only displays successful snapshots** (failed snapshots are filtered out)
- Visual indicators (✅) for passed snapshots
- **Lazy Loading**: Fetches snapshot content via `getSnapshotContent` API only when user opens toggle
- Shows snapshot key, count, expected vs actual content
- Line highlighting for snapshot matcher locations

#### 9. Data Flow
1. **Initial Load**: Only metadata transferred (no content)
2. **User Interaction**: User clicks toggle to expand snapshot details
3. **On-Demand Fetch**: `getSnapshotContent` API called
4. **In-Memory Lookup**: Content retrieved from main process memory
5. **Display**: Content shown in UI with loading indicator

### Phase 4: Code Quality & Architecture Improvements (Completed ✅)

#### 10. Type Safety Improvements
- Removed all `any` type usage in snapshot recording logic
- Proper TypeScript typing with `Parameters<SnapshotClient['assert']>[0]`
- Proper casting with `unknown` for private property access

#### 11. Error Handling Optimization
- Removed storage of failed snapshot content (since we don't display failed snapshots)
- Simplified error paths in snapshot recording

#### 12. UI Architecture Refactoring
- **From Imperative to Declarative**:
  - Before: Manual DOM manipulation with `createApp` + `mount`
  - After: State-managed components with reactive templates
- **Component Extraction**: Created reusable `SnapshotMatcher.vue` component
- **State Management**: Using `activeSnapshotComponents` ref for declarative rendering
- **Better Integration**: Components rendered in template and cloned to CodeMirror widgets

## Current Architecture

### Technical Stack
```
Test Execution Flow (RPC-Based):
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Snapshot Call   │ -> │ Stack Capture    │ -> │ Data Intercept  │
│ (toMatchSnap..) │    │ (StackTraceErr)  │    │ (assert hook)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐            │
│ Test Result     │ <- │ Record Metadata  │ <----------┤
│ (snapshotMatch) │    │ (location+key)   │            │
└─────────────────┘    └──────────────────┘            │
                                                        │
┌─────────────────┐    ┌──────────────────┐            │
│ Main Process    │ <- │ RPC Store Call   │ <----------┘
│ Memory Storage  │    │ (content data)   │
└─────────────────┘    └──────────────────┘

UI Display Flow (Lazy Loading):
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Test Results    │ -> │ Extract Metadata │ -> │ Display Toggle  │
│ (metadata only) │    │ (location+key)   │    │ (collapsed)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                              ┌─────────────────────────┘
                              │ User clicks toggle
                              ▼
                       ┌──────────────┐    ┌──────────────────┐
                       │ getSnapshot  │ -> │ In-Memory Lookup │
                       │ Content API  │    │ (main process)   │
                       └──────────────┘    └──────────────────┘
                              │                     │
                              ▼                     ▼
                       ┌──────────────┐    ┌──────────────────┐
                       │ Display      │ <- │ Return Content   │
                       │ Content      │    │ (expected/actual)│
                       └──────────────┘    └──────────────────┘
```

### Key Benefits Achieved
1. **Performance**: Faster initial test result loading (metadata only)
2. **Memory Efficiency**: Content loaded on-demand, not kept in UI state
3. **Reliability**: No file system dependencies, pure in-memory access
4. **Scalability**: Works with large test suites without performance degradation
5. **Worker Safety**: RPC communication prevents cloning errors
6. **Maintainability**: Declarative Vue components with proper state management

## File Structure

### Core Implementation
- `packages/runner/src/types/tasks.ts` - Type definitions (metadata only)
- `packages/vitest/src/integrations/snapshot/chai.ts` - Recording logic with RPC storage
- `packages/vitest/src/runtime/runners/test.ts` - Test runner integration
- `packages/vitest/src/types/rpc.ts` - RPC method definitions
- `packages/vitest/src/node/pools/rpc.ts` - RPC method implementations

### UI Implementation
- `packages/ui/client/components/views/ViewEditor.vue` - Main editor with declarative snapshot management
- `packages/ui/client/components/views/SnapshotMatcher.vue` - Reusable snapshot display component

### API Implementation
- `packages/vitest/src/api/setup.ts` - In-memory content retrieval with abstracted key management

## Status Summary

### ✅ Completed Features
1. **Snapshot matcher tracking** - All matcher types supported
2. **Accurate location detection** - Using proper stack parsing
3. **Lazy loading UI** - Content fetched only when needed
4. **Pure in-memory storage** - Zero file system access
5. **RPC-based architecture** - Worker-safe communication
6. **DataCloneError fix** - No function cloning issues
7. **Type safety** - Full TypeScript support
8. **Error handling** - Graceful fallbacks and error display
9. **Failed snapshot filtering** - Only successful snapshots shown
10. **Component architecture** - Proper Vue component separation
11. **Declarative UI** - State-managed components instead of imperative DOM manipulation
12. **Abstracted key management** - Reusable utility functions for store key operations

### 🎯 Technical Achievements
- **Zero File I/O**: All snapshot content access is in-memory
- **Lazy Loading**: UI fetches content only when user interacts
- **Cross-Process Safe**: RPC methods work across all pool types
- **Error Free**: No DataCloneError or function cloning issues
- **Vue Best Practices**: Declarative components with reactive state management

### 🔧 Architecture Benefits
1. **Performance**: Faster initial test result loading (metadata only)
2. **Memory Efficiency**: Content loaded on-demand, not kept in UI state
3. **Reliability**: No file system dependencies, pure in-memory access
4. **Scalability**: Works with large test suites without performance degradation
5. **Worker Safety**: RPC communication prevents cloning errors
6. **Maintainability**: Clean component architecture with proper separation of concerns

## Testing & Validation

- All existing snapshot tests pass
- No DataCloneError issues
- Full compatibility maintained
- TypeScript compilation successful across all components

This implementation provides a **lazy-loading, zero-I/O, worker-safe** solution for displaying snapshot matcher results in the Vitest UI with optimal performance and reliability.
