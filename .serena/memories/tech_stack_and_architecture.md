# Vitest Tech Stack and Architecture

## Core Technologies
- **Language**: TypeScript (strict mode enabled)
- **Module System**: ESM (ES Modules)
- **Build Tool**: Vite for development, Rollup for production builds
- **Package Manager**: pnpm (workspaces for monorepo)
- **Node.js**: ^18.0.0 || >=20.0.0

## Monorepo Structure
The project uses pnpm workspaces with the following key packages:

### Core Packages
- `packages/vitest` - Main testing framework and CLI
- `packages/runner` - Test execution engine
- `packages/vite-node` - Vite integration for Node.js
- `packages/utils` - Shared utilities across packages

### Testing & Coverage
- `packages/coverage-v8` - V8 code coverage provider
- `packages/coverage-istanbul` - Istanbul code coverage provider
- `packages/spy` - Spying and mocking utilities
- `packages/expect` - Assertion library
- `packages/snapshot` - Snapshot testing utilities

### UI & Browser
- `packages/ui` - Web-based test results interface
- `packages/browser` - Browser testing capabilities
- `packages/ws-client` - WebSocket client for real-time updates

### Utilities
- `packages/mocker` - Module mocking utilities
- `packages/pretty-format` - Test output formatting
- `packages/web-worker` - Web Worker testing support

## Key Dependencies
- **Vite**: Build tool and dev server
- **Chai**: Assertion library
- **Tinypool**: Worker threading
- **Tinybench**: Benchmarking
- **JSDOM/Happy-DOM**: DOM simulation
- **Istanbul/V8**: Code coverage
- **Magic String**: Source code transformation

## Architecture Patterns
- ESM-first approach
- Plugin-based architecture inherited from Vite
- Worker-based parallel execution
- Hot Module Replacement (HMR) for tests
- Source map support for debugging
- Transform pipeline for TypeScript/JSX
