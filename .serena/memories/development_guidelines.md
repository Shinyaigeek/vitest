# Vitest Development Guidelines

## Design Patterns and Principles

### Core Principles
1. **ESM First**: All code should be written as ES modules
2. **Lightweight**: Avoid unnecessary dependencies, prefer smaller alternatives
3. **Vite Integration**: Leverage Vite's transform and plugin ecosystem
4. **Jest Compatibility**: Maintain API compatibility with Jest where possible
5. **Performance**: Optimize for fast test execution and startup time

### Architectural Patterns
- **Plugin Architecture**: Extensible via Vite plugins
- **Worker-based Execution**: Tests run in separate worker threads
- **Transform Pipeline**: Code transformation via Vite's transform system
- **Event-driven**: Communication via events and message passing
- **Configuration-driven**: Behavior controlled via configuration objects

## Code Organization Guidelines

### Package Boundaries
- Keep packages focused on single responsibilities
- Minimize cross-package dependencies
- Use workspace: protocol for internal dependencies
- Export clean public APIs from index files

### Module Structure
- One class/function per file for complex code
- Group related utilities in single files
- Use barrel exports (index.ts) for public APIs
- Keep internal implementation details private

### Error Handling
- Use descriptive error messages
- Include context and suggestions for fixes
- Prefer throwing over returning error objects
- Handle async errors appropriately

## Testing Guidelines

### Test Organization
- Co-locate tests with source code when possible
- Use descriptive test names that explain behavior
- Group related tests with `describe` blocks
- Test both happy paths and error conditions

### Test Patterns
- Use `expect()` for assertions
- Prefer integration tests over unit tests where practical
- Mock external dependencies, not internal modules
- Use snapshots judiciously for complex outputs

### Performance Considerations
- Avoid unnecessary test setup/teardown
- Use `test.concurrent` for independent tests
- Consider test sharding for large suites
- Profile slow tests and optimize

## API Design Guidelines

### Public APIs
- Follow Jest conventions where applicable
- Use TypeScript for type safety
- Provide comprehensive JSDoc documentation
- Maintain backward compatibility when possible

### Configuration
- Use sensible defaults
- Validate configuration early
- Provide clear error messages for misconfigurations
- Support both object and function-based configs

### Plugin Development
- Follow Vite plugin conventions
- Document plugin hooks and lifecycle
- Handle plugin errors gracefully
- Test plugins in isolation

## Performance Guidelines
- Lazy load heavy dependencies
- Use worker threads for CPU-intensive tasks
- Implement efficient file watching
- Cache expensive computations
- Profile and benchmark critical paths
