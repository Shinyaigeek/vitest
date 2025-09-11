# Vitest Monorepo Structure

## Root Directory Layout
```
vitest/
├── packages/           # Core packages
├── test/              # Test suites
├── docs/              # Documentation
├── examples/          # Usage examples
├── scripts/           # Build and release scripts
├── .github/           # GitHub workflows and templates
└── patches/           # Dependency patches
```

## Packages Directory (`packages/`)
### Core Framework
- **`vitest/`** - Main testing framework and CLI
- **`runner/`** - Test execution engine and task management
- **`vite-node/`** - Vite integration for Node.js execution

### Testing Utilities
- **`expect/`** - Assertion library (Jest-compatible)
- **`spy/`** - Spying, mocking, and stubbing utilities
- **`snapshot/`** - Snapshot testing functionality
- **`mocker/`** - Module mocking system

### Coverage Providers
- **`coverage-v8/`** - V8 JavaScript coverage provider
- **`coverage-istanbul/`** - Istanbul coverage provider

### UI and Browser
- **`ui/`** - Web-based test results interface
- **`browser/`** - Browser testing capabilities
- **`ws-client/`** - WebSocket client for real-time updates

### Utilities
- **`utils/`** - Shared utilities across packages
- **`pretty-format/`** - Test output formatting
- **`web-worker/`** - Web Worker testing support

## Test Directory (`test/`)
### Core Test Suites
- **`core/`** - Core functionality tests
- **`browser/`** - Browser testing suite
- **`cli/`** - Command-line interface tests
- **`config/`** - Configuration testing
- **`typescript/`** - TypeScript integration tests

### Specialized Tests
- **`coverage-test/`** - Coverage functionality tests
- **`snapshots/`** - Snapshot testing validation
- **`workspaces/`** - Workspace functionality tests
- **`reporters/`** - Reporter functionality tests
- **`watch/`** - Watch mode tests

### Performance and Integration
- **`benchmark/`** - Performance benchmarks
- **`ui/`** - UI component tests
- **`vite-node/`** - Vite-node integration tests

## Configuration Files
- **`package.json`** - Root package configuration
- **`pnpm-workspace.yaml`** - Workspace configuration
- **`tsconfig.base.json`** - Base TypeScript config
- **`tsconfig.check.json`** - Type checking config
- **`eslint.config.js`** - ESLint configuration

## Key Patterns
- Each package has its own `package.json` with dependencies
- Shared TypeScript configuration via extends
- Cross-package imports use workspace: protocol
- Build outputs go to `dist/` directories
- Tests are either co-located or in dedicated test directories
