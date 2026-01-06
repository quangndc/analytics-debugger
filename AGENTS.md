# AGENTS.md - Coding Guidelines for AI Agents

This document provides essential information for AI agents (Claude, Copilot, etc.) working in the Analytics Debugger codebase.

## Quick Commands

### Development
```bash
npm run dev          # Start dev server with HMR (Electron + Vite)
npm run build        # Full production build (TypeScript + Vite + Electron Builder)
npm run lint         # ESLint check (fails on warnings - max-warnings 0)
npx tsc --noEmit     # TypeScript type checking only
```

### Testing
Tests are managed with Vitest. For single test files:
```bash
npx vitest src/utils/__tests__/request-filters.test.ts     # Run specific test file
npx vitest --watch src/utils/__tests__               # Watch mode for utilities
npx vitest --coverage                                 # Full coverage report
npm run test:ui                                       # Vitest UI dashboard
```

**Coverage Target**: 70% minimum (currently 88%)

## Code Style & Conventions

### Imports & Organization
- **ESM modules only** (`import`/`export`, no CommonJS)
- Group imports: React → Third-party → Internal utilities → Types
- Use relative paths for internal imports (e.g., `'../lib/utils'`, `'../../types/request'`)
- Import types separately: `import type { RequestData } from '../types/request'`

### TypeScript & Types
- **Strict mode enabled** - all code must pass `tsc --noEmit`
- Explicit return types on all functions: `function getName(): string { ... }`
- Use type aliases for complex types: `type View = 'stream' | 'settings' | 'setup'`
- No implicit `any` - always specify types
- Avoid `as` assertions unless absolutely necessary
- Use `readonly` for immutable data structures

### Naming Conventions
- **Files**: kebab-case (`request-filters.ts`, `http-proxy.ts`)
- **Components**: PascalCase (`Layout.tsx`, `NavItem.tsx`)
- **Functions/Variables**: camelCase (`getActiveView()`, `requestData`)
- **Constants**: UPPER_SNAKE_CASE only for truly global constants
- **Type/Interface**: PascalCase (`RequestData`, `ProxyConfig`)
- **Booleans**: prefix with `is`/`has` (`isActive`, `hasError`)

### React Components
- Functional components only (hooks preferred)
- Props interface: Define inline with destructuring or separate type
- Component structure:
  ```typescript
  // 1. Imports (grouped)
  // 2. Type definitions
  // 3. Component function
  // 4. Helper functions (if any)
  // 5. Export at bottom
  ```
- Use `useState` over class state
- Extract complex logic to custom hooks
- Memoize expensive computations with `useMemo`

### Styling
- **Tailwind CSS v4** with CSS variables for theming
- Use `cn()` utility for conditional classes: `cn('base-class', isActive && 'active-class')`
- CSS variables defined in `src/index.css`: `--background`, `--foreground`, `--border`, etc.
- Dark mode support via `.dark` class
- No inline styles - use Tailwind classes

### Error Handling
- Explicit error types: `new Error('Specific error message')`
- Log errors before throwing: `console.error('Context:', error)`
- Validate inputs at function boundaries
- Return `null`/`undefined` for optional operations, throw for critical failures
- Use try-catch for async operations

### Formatting
- **Semicolons**: Required (enforced by ESLint)
- **Indentation**: 4 spaces (Vite default, see tsconfig.json)
- **Line length**: Max 120 characters (soft limit)
- **Quotes**: Single quotes for strings (`'string'`)
- **Trailing commas**: Yes (ES5+ compatible)
- **Unused variables**: Error if declared but unused (noUnusedLocals: true)

## Project Structure

```
├── src/
│   ├── components/          # React UI components
│   ├── lib/                 # Utilities (classname merging, etc.)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Business logic (filtering, export)
│   ├── __tests__/           # Test files mirror src/ structure
│   └── App.tsx              # Root component
├── electron/                # Electron main process & proxy
│   ├── main.ts              # Electron app entry point
│   ├── proxy.ts             # MITM proxy implementation
│   └── types/               # Electron-specific types
├── dist/                    # Built UI (Vite output)
├── dist-electron/           # Built Electron process
├── release/                 # macOS DMG installer (built)
├── vitest.config.ts         # Test configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
└── electron-builder.json5   # macOS build config
```

## Key Dependencies

- **React 18**: UI framework (hooks, functional components)
- **TypeScript 5.2**: Type safety
- **Vite 5**: Fast build tool with HMR
- **Electron 30**: Desktop app framework
- **Tailwind CSS 4**: Utility-first CSS
- **Lucide React**: Icon library
- **http-mitm-proxy**: HTTPS proxy interception
- **Vitest**: Unit testing framework

## Quality Gates

- **Zero TypeScript errors** (tsc --noEmit must pass)
- **Zero ESLint errors** (max-warnings: 0)
- **88% code coverage** minimum (Vitest coverage)
- **All tests passing** (npm run test)
- **No console warnings** in production build

## Common Patterns

### Request Filtering
```typescript
import { filterRequests } from '../utils/request-filters';
const filtered = filterRequests(requests, { text: 'purchase', eventName: 'add_to_cart' });
```

### Data Export
```typescript
import { exportAsJSON, exportAsCSV } from '../utils/export';
const json = exportAsJSON(requests);
const csv = exportAsCSV(requests);
```

### Class Merging
```typescript
import { cn } from '../lib/utils';
const className = cn('base-class', isActive && 'active-class', 'another-class');
```

## Debugging Tips

- Dev mode runs TypeScript checks on save (`npm run dev`)
- ESLint runs automatically in some editors
- Check browser DevTools: F12 in dev mode
- Electron DevTools: DevTools menu in app window
- Test individually: `npx vitest --watch <filename>`

## Before Committing

1. Run `npm run lint` (fix with `npm run lint -- --fix`)
2. Run `npx tsc --noEmit` (no type errors allowed)
3. Run `npm run test` or `npx vitest` (all tests pass)
4. Check for unused imports/variables
5. Verify console.log() statements are removed (except errors)

## Resources

- TypeScript Strict Mode: https://www.typescriptlang.org/tsconfig#strict
- ESLint Rules: `.eslintrc.cjs` in project root
- Tailwind v4 CSS Variables: https://tailwindcss.com/docs/customization
- Vitest Documentation: https://vitest.dev/
