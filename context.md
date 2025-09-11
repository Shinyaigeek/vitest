# Vitest Snapshot Matcher UI Implementation Context

## Project Overview
We have implemented a feature to display snapshot matcher results (like `toMatchSnapshot`, `toMatchInlineSnapshot`, etc.) in the Vitest UI. This implementation captures where snapshot matchers are invoked with accurate line and column information, and displays the results in the UI with **lazy-loaded** snapshot content that is fetched on-demand without any file system access.

## Current Implementation Status

### 1. Type Definitions (`packages/runner/src/types/tasks.ts`)

**Enhanced `SnapshotMatcherInvocation` interface (Metadata Only):**
```typescript
export interface SnapshotMatcherInvocation {
  matcher: 'toMatchSnapshot' | 'toMatchFileSnapshot' | 'toMatchImageSnapshot' | 'toThrowErrorMatchingSnapshot' | 'toMatchInlineSnapshot' | 'toThrowErrorMatchingInlineSnapshot'
  location: {
    line: number
    column: number
  }
  name: string
  passed: boolean
  snapshot?: {
    key: string // Snapshot key used for identification
    count: number // Snapshot count in test
  }
}
```

**Added to `TaskResult`:**
```typescript
snapshotMatchers?: SnapshotMatcherInvocation[]
```

### 2. Snapshot Recording (`packages/vitest/src/integrations/snapshot/chai.ts`)

**Key Components:**
- **`SnapshotMatcherStackTraceError`**: Custom error class for capturing call site stack traces
- **`recordSnapshotInvocation()`**: Records snapshot invocation with location and metadata only
- **`recordSnapshotInvocationWithResult()`**: Intercepts snapshot client to capture metadata and store content via RPC
- **Stack parsing**: Uses `parseSingleStack` from `@vitest/utils/source-map` for accurate location detection
- **RPC Storage**: Uses `rpc().storeSnapshotContent()` to store snapshot content in main process memory

**Integrated with all snapshot matchers:**
- `toMatchSnapshot`
- `toMatchFileSnapshot`
- `toMatchInlineSnapshot`
- `toThrowErrorMatchingSnapshot`
- `toThrowErrorMatchingInlineSnapshot`

### 3. RPC Integration (`packages/vitest/src/types/rpc.ts` & `packages/vitest/src/node/pools/rpc.ts`)

**Added RPC Method:**
```typescript
storeSnapshotContent: (filepath: string, testName: string, snapshotKey: string, content: { expected: string; actual: string; count: number }) => void
```

**Implementation:**
- Workers call `rpc().storeSnapshotContent()` during test execution
- Main process stores content in `ctx.snapshotContentStore` memory
- No functions passed to workers (avoids DataCloneError)

### 4. Test Runner Integration (`packages/vitest/src/runtime/runners/test.ts`)

**Enhanced test context:**
- Added `_recordSnapshotInvocation` method to test context
- Maintains `snapshotInvocations` WeakMap for test-to-invocations mapping
- Clears invocations on test retry/re-run
- Adds snapshot invocations to test result in `onAfterRunTask`

### 5. Main Process Storage (`packages/vitest/src/api/setup.ts`)

**In-Memory Snapshot Content Store:**
- `snapshotContentStore` Map with functions: `store()`, `get()`, `clear()`
- Key format: `"filepath:testName:snapshotKey"`
- Stores `{ expected: string, actual: string, count: number }`

### 6. UI Implementation (`packages/ui/client/components/views/ViewEditor.vue`)

**Features:**
- Collects snapshot matchers from all tests in a file
- Creates expandable UI elements for each snapshot invocation
- Visual indicators (✅/❌) based on pass/fail status
- **Lazy Loading**: Fetches snapshot content via `getSnapshotContent` API only when user opens toggle
- Shows snapshot key, count, expected vs actual content
- Line highlighting for snapshot matcher locations

**Data Flow:**
1. **Initial Load**: Only metadata transferred (no content)
2. **User Interaction**: User clicks toggle to expand snapshot details
3. **On-Demand Fetch**: `getSnapshotContent` API called
4. **In-Memory Lookup**: Content retrieved from main process memory
5. **Display**: Content shown in UI with loading indicator

### 7. API Implementation (`packages/vitest/src/api/setup.ts`)

**`getSnapshotContent` RPC method (Pure In-Memory):**
- Uses snapshot metadata to identify content
- Looks up content in `ctx.snapshotContentStore` memory
- **No file system access** - pure in-memory retrieval
- Returns empty content if not found in memory

## Key Improvements Made

### 1. **Accurate Location Detection**
- **Before**: Manual regex parsing of stack traces
- **After**: Uses `parseSingleStack` from `@vitest/utils/source-map`
- **Benefits**: Handles source maps, different browsers, path normalization

### 2. **Lazy Loading Architecture**
- **Before**: Snapshot content embedded in test results
- **After**: Metadata only in test results, content fetched on-demand
- **Benefits**: Faster initial loading, reduced memory usage, better UX

### 3. **Pure In-Memory Storage**
- **Before**: File system reads for snapshot content
- **After**: RPC-based storage in main process memory
- **Benefits**: Zero I/O, faster access, works with any configuration

### 4. **DataCloneError Fix**
- **Before**: Functions passed to worker context (caused cloning errors)
- **After**: RPC methods for cross-process communication
- **Benefits**: Worker-safe, no cloning issues, proper separation of concerns

### 5. **Enhanced Type Safety**
- Added all snapshot matcher types to union
- Metadata-only snapshot interface
- Proper TypeScript compilation across all components

## Architecture Overview

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

## Current State

### ✅ Completed Features
1. **Snapshot matcher tracking** - All matcher types supported
2. **Accurate location detection** - Using proper stack parsing
3. **Lazy loading UI** - Content fetched only when needed
4. **Pure in-memory storage** - Zero file system access
5. **RPC-based architecture** - Worker-safe communication
6. **DataCloneError fix** - No function cloning issues
7. **Type safety** - Full TypeScript support
8. **Error handling** - Graceful fallbacks and error display

### 🔧 Architecture Benefits
1. **Performance**: Faster initial test result loading (metadata only)
2. **Memory Efficiency**: Content loaded on-demand, not kept in UI state
3. **Reliability**: No file system dependencies, pure in-memory access
4. **Scalability**: Works with large test suites without performance degradation
5. **Worker Safety**: RPC communication prevents cloning errors

### 🎯 Technical Achievements
- **Zero File I/O**: All snapshot content access is in-memory
- **Lazy Loading**: UI fetches content only when user interacts
- **Cross-Process Safe**: RPC methods work across all pool types
- **Error Free**: No DataCloneError or function cloning issues

## File Locations Summary

**Core Implementation:**
- `packages/runner/src/types/tasks.ts` - Type definitions (metadata only)
- `packages/vitest/src/integrations/snapshot/chai.ts` - Recording logic with RPC storage
- `packages/vitest/src/runtime/runners/test.ts` - Test runner integration
- `packages/vitest/src/types/rpc.ts` - RPC method definitions
- `packages/vitest/src/node/pools/rpc.ts` - RPC method implementations

**UI Implementation:**
- `packages/ui/client/components/views/ViewEditor.vue` - Lazy loading display logic

**API Implementation:**
- `packages/vitest/src/api/setup.ts` - In-memory content retrieval

**Tests:**
- All existing snapshot tests pass
- No DataCloneError issues
- Full compatibility maintained

This implementation provides a **lazy-loading, zero-I/O, worker-safe** solution for displaying snapshot matcher results in the Vitest UI with optimal performance and reliability.
