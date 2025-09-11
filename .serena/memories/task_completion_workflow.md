# Task Completion Workflow for Vitest

## Standard Workflow After Code Changes

### 1. Type Checking
```bash
nr typecheck          # Check TypeScript types
```
- **When**: Always run after TypeScript changes
- **Purpose**: Ensure type safety across the monorepo
- **Config**: Uses `tsconfig.check.json`

### 2. Linting and Formatting
```bash
nr lint               # Check linting rules
nr lint:fix           # Auto-fix linting issues
```
- **When**: Always run before committing
- **Purpose**: Maintain consistent code style
- **Config**: Uses `@antfu/eslint-config` with custom rules

### 3. Building
```bash
nr build              # Build all packages
```
- **When**: After significant changes, before testing
- **Purpose**: Ensure all packages build correctly
- **Note**: Uses Rollup for production builds

### 4. Testing
```bash
# Choose appropriate test command:
nr test               # Core tests only
nr test:ci            # Full test suite (recommended for PRs)
nr test:examples      # If you modified examples
```
- **When**: Always run relevant tests
- **Purpose**: Ensure changes don't break existing functionality

### 5. Specific Package Testing
```bash
cd test/[specific-area] && pnpm run test
```
- **When**: For targeted testing of specific features
- **Examples**: `cd test/browser && pnpm run test`

## Pre-Commit Checklist
1. ✅ Code follows project conventions
2. ✅ `nr typecheck` passes
3. ✅ `nr lint` passes (or `nr lint:fix` applied)
4. ✅ `nr build` succeeds
5. ✅ Relevant tests pass
6. ✅ New features have accompanying tests
7. ✅ Documentation updated if needed

## CI/CD Workflow
The CI pipeline runs:
```bash
ni && nr typecheck && nr lint && nr build && nr test:ci
```

## Quick Development Loop
For rapid development iterations:
```bash
nr dev                # Watch mode for builds
# In another terminal:
nr test               # Run tests as needed
```

## Debugging
- Use VS Code's "Run and Debug" feature
- Add `debugger` statements in code
- Run tests with JavaScript Debug Terminal
