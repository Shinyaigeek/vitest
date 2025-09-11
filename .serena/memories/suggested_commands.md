# Vitest Development Commands

## Essential Commands

### Setup and Installation
```bash
pnpm install          # Install all dependencies
nr build              # Build all packages (alias for pnpm run build)
nr dev                # Watch mode for development
```

### Development Workflow
```bash
nr typecheck          # TypeScript type checking
nr lint               # Run ESLint
nr lint:fix           # Fix ESLint issues automatically
```

### Testing Commands
```bash
nr test               # Run core tests
nr test:ci            # Run full test suite (CI mode)
nr test:examples      # Run example tests
cd test/(dir) && pnpm run test  # Run specific test suite
```

### Browser Testing
```bash
nr test:browser:playwright    # Run browser tests with Playwright
nr test:browser:webdriverio   # Run browser tests with WebDriverIO
```

### UI and Documentation
```bash
nr ui:dev             # Start UI development server
nr ui:build           # Build UI package
nr docs               # Start documentation server
nr docs:build         # Build documentation
```

### Build and Release
```bash
nr build              # Build all packages
nr publish-ci         # CI publishing script
nr release            # Release script
```

## macOS Specific Utilities
Since the system is Darwin (macOS), these standard Unix commands are available:
- `ls` - list directory contents
- `find` - search for files and directories
- `grep` - search text patterns
- `cd` - change directory
- `git` - version control
- `curl` - HTTP requests
- `ssh` - secure shell
- `rsync` - file synchronization

## Helpful Aliases (with ni package)
- `ni` = `pnpm install`
- `nr` = `pnpm run`
- `nu` = `pnpm update`
- `nci` = `pnpm clean-install`

## VS Code Integration
- Press `⇧⌘B` (Shift+Cmd+B) to launch all necessary dev tasks
- Use "Run and Debug" feature with JavaScript Debug Terminal for debugging
