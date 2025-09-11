# Vitest Code Style and Conventions

## Code Style Configuration
- **ESLint**: Uses `@antfu/eslint-config` with custom rules
- **EditorConfig**: 2-space indentation, LF line endings, UTF-8
- **TypeScript**: Strict mode enabled with comprehensive type checking

## Key Style Rules
- **Indentation**: 2 spaces (no tabs)
- **Line Endings**: LF only
- **Quotes**: Single quotes preferred
- **Semicolons**: Required for single-line statements, omitted for multiline
- **Curly Braces**: Required for all control structures (`'curly': ['error', 'all']`)
- **Unused Imports**: Strictly forbidden (`'unused-imports/no-unused-imports': 'error'`)

## TypeScript Conventions
- **Target**: ESNext
- **Module**: ESNext with Bundler resolution
- **Strict Mode**: Enabled
- **Declaration**: Required for public APIs
- **Type Imports**: Prefer type-only imports where possible

## Import Restrictions
- **Path Module**: Restricted in favor of `pathe` for cross-platform compatibility
- **Internal Imports**: Cannot import from built `dist` directories
- **Cross-Package**: Specific rules for different package types

## Naming Conventions
- **Files**: kebab-case for most files
- **Types**: PascalCase
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for module-level constants

## Documentation Style
- **JSDoc**: Required for public APIs
- **Inline Comments**: Used sparingly, code should be self-documenting
- **README**: Each package should have comprehensive documentation

## Testing Conventions
- **Test Files**: `.test.ts` or `.spec.ts` suffix
- **Test Structure**: Descriptive `describe` blocks and `it` statements
- **Assertions**: Prefer `expect()` API over `assert`
- **Mocking**: Use built-in spy utilities

## File Organization
- **Index Files**: Export public APIs
- **Types**: Separate `.d.ts` files or inline with implementation
- **Utils**: Shared utilities in dedicated modules
- **Tests**: Co-located with source files or in dedicated test directories
