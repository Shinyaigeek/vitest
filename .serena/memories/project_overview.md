# Vitest Project Overview

## Purpose
Vitest is a next-generation testing framework powered by Vite. It provides:
- Fast unit testing with Vite's transformation and hot reload capabilities
- Jest-compatible API with Chai built-in assertions
- Native code coverage via v8 or istanbul
- Browser mode for component testing
- TypeScript/JSX support out of the box
- ESM first architecture
- Multi-threading via Tinypool
- Snapshot testing capabilities

## Project Type
- **Type**: Monorepo testing framework
- **Language**: TypeScript
- **Module System**: ESM
- **Package Manager**: pnpm (required, version 10.13.1)
- **Node Version**: ^18.0.0 || >=20.0.0

## Key Features
- Vite integration for fast builds and transforms
- Jest snapshot testing compatibility
- Chai assertions with Jest expect API compatibility
- Smart watch mode with HMR-like experience
- Native code coverage
- Browser mode for component testing
- Projects support for complex setups
- Worker threading for parallelization
- TypeScript support without additional configuration

## Main Entry Points
- Core package: `packages/vitest` - main testing framework
- Runtime: `packages/runner` - test execution engine
- UI: `packages/ui` - web-based test results interface
- Browser: `packages/browser` - browser testing capabilities
- Coverage: `packages/coverage-v8`, `packages/coverage-istanbul` - code coverage
