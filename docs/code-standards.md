# Code Standards & Conventions

## TypeScript Configuration

### Compiler Options
**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Safety Rules

#### 1. Enable Strict Mode
Always use `"strict": true` in tsconfig.json. This enables:
- `strictNullChecks`: Catch null/undefined errors
- `strictFunctionTypes`: Better function type checking
- `strictBindCallApply`: Proper bind/call/apply typing
- `strictPropertyInitialization`: Class properties must be initialized

#### 2. Avoid `any` Type
**Bad**:
```typescript
function handleRequest(ctx: any, err: any) {
  console.error(err)
}
```

**Good**:
```typescript
import { IncomingMessage } from 'http'

interface ProxyContext {
  clientToProxyRequest: IncomingMessage
  isSSL: boolean
}

function handleRequest(ctx: ProxyContext, err: Error) {
  console.error(err.message)
}
```

#### 3. Type Imports
Use `import type` for type-only imports to avoid runtime dependencies:

```typescript
// Type-only import
import type { BrowserWindow } from 'electron'
import type { GA4Request } from './types'

// Regular import
import { app } from 'electron'
import { parseGA4 } from './utils'
```

#### 4. Interface vs Type
- **Interface**: For object shapes that can be extended
- **Type**: For unions, intersections, primitives

```typescript
// Interface - extensible
interface GA4Request {
  method: string
  url: string
  eventName?: string
}

// Type - for unions
type View = 'stream' | 'settings' | 'setup'

type Theme = 'light' | 'dark' | 'auto'
```

---

## ESLint Configuration

### Current Setup
**File**: `.eslintrc.cjs` (if exists) or `package.json`

```javascript
export default {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'react-refresh/only-export-components': 'warn'
  }
}
```

### Linting Rules

#### 1. No Unused Variables
```typescript
// Bad - unused variable 'data'
const fetchData = async () => {
  const data = await fetch('/api')
  return true
}

// Good - prefix with underscore
const fetchData = async () => {
  const _data = await fetch('/api')
  return true
}
```

#### 2. React Hooks Rules
```typescript
// Bad - dependency missing
useEffect(() => {
  fetchEvent(activeView)
}, [])

// Good - all dependencies listed
useEffect(() => {
  fetchEvent(activeView)
}, [activeView])
```

#### 3. No Console Logs in Production
Use a logging library instead:
```typescript
// Bad
console.log('Request received:', request)

// Good
logger.info('Request received', { requestId: request.id })
```

---

## Styling Conventions (Tailwind CSS)

### Design Tokens
**File**: `src/index.css`

All colors must use CSS custom properties (design tokens):

```css
/* Good - using tokens */
.button {
  @apply bg-primary text-primary-foreground;
}

/* Bad - hardcoding colors */
.button {
  @apply bg-[#1a1a1a] text-white;
}
```

### Class Naming

#### 1. Component Patterns
Use semantic Tailwind classes, avoid arbitrary values:

```tsx
/* Good - semantic classes */
<div className="flex items-center gap-3 p-4 rounded-lg border border-border">

/* Bad - arbitrary values */
<div className="flex items-center gap-[12px] p-[16px] rounded-[8px] border border-gray-200">
```

#### 2. Dark Mode Support
Always provide dark mode variants:

```tsx
/* Good - dark mode support */
<div className="bg-background text-foreground border border-border">

/* Bad - no dark mode */
<div className="bg-white text-black border border-gray-200">
```

#### 3. Responsive Design
Use mobile-first approach:

```tsx
/* Good - mobile-first */
<div className="w-full md:w-64 lg:w-80">

/* Bad - desktop-first */
<div className="w-80 md:w-64 lg:w-full">
```

#### 4. Conditional Classes
Use `cn()` utility for conditional classes:

```tsx
import { cn } from '@/lib/utils'

// Good
<button className={cn(
  "px-4 py-2 rounded-md",
  isActive && "bg-primary text-primary-foreground",
  disabled && "opacity-50 cursor-not-allowed"
)}>

// Bad
<button className={`px-4 py-2 rounded-md ${isActive ? 'bg-primary' : ''}`}>
```

### Tailwind Best Practices

#### 1. Order of Classes
Follow this order for consistency:
1. Layout (`flex`, `grid`, `block`)
2. Spacing (`p-4`, `m-2`, `gap-3`)
3. Sizing (`w-full`, `h-16`, `max-w-md`)
4. Typography (`text-sm`, `font-semibold`)
5. Colors (`bg-background`, `text-foreground`)
6. Borders (`border`, `rounded-lg`)
7. States (`hover:`, `focus:`, `active:`)
8. Responsive (`md:`, `lg:`)

```tsx
<div className="flex items-center gap-3 w-full h-16 px-4 py-2 text-sm font-medium bg-background border border-border rounded-lg hover:bg-accent focus:ring-2 md:w-64">
```

#### 2. Extract Reusable Patterns
Create components for repeated patterns:

```tsx
// Instead of repeating
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">

// Create a component
function Button({ children, ...props }) {
  return (
    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90" {...props}>
      {children}
    </button>
  )
}
```

---

## File Organization

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components
│   ├── ui/             # Generic UI components (Button, Input)
│   └── features/       # Feature-specific components
├── lib/                # Utility functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── constants/          # Constants and configuration
├── store/              # State management
├── App.tsx             # Root component
└── main.tsx            # Entry point

electron/
├── main.ts             # Main process entry
├── preload.ts          # Preload script
├── proxy/              # Proxy-related code
│   ├── server.ts       # Proxy server
│   ├── parser.ts       # Request parsing
│   └── certificates.ts # Certificate management
└── handlers/           # IPC handlers
```

### File Naming

#### 1. Component Files
Use PascalCase for components:

```
src/components/
├── Layout.tsx           # Good
├── RequestStream.tsx    # Good
├── request-stream.tsx   # Bad
```

#### 2. Utility Files
Use camelCase for utilities:

```
src/lib/
├── utils.ts             # Good
├── formatRequest.ts     # Good
├── FormatRequest.ts     # Bad
```

#### 3. Type Files
Use `.types.ts` suffix:

```
src/types/
├── ga4.types.ts         # Good
├── ipc.types.ts         # Good
├── ga4.ts               # Acceptable
```

#### 4. Index Files
Use `index.ts` to export related modules:

```
src/components/ui/
├── Button.tsx
├── Input.tsx
└── index.ts             # exports Button, Input

// Usage
import { Button, Input } from '@/components/ui'
```

---

## Naming Conventions

### Variables & Functions
Use camelCase:

```typescript
// Good
const requestCount = 0
const isActive = true
function parseRequest() {}

// Bad
const RequestCount = 0
const is_active = true
function Parse_Request() {}
```

### Constants
Use UPPER_SNAKE_CASE:

```typescript
// Good
const DEFAULT_PROXY_PORT = 8888
const GA4_ENDPOINT = 'google-analytics.com'
const MAX_REQUESTS = 1000

// Bad
const defaultProxyPort = 8888
const ga4_endpoint = 'google-analytics.com'
```

### Types & Interfaces
Use PascalCase:

```typescript
// Good
interface GA4Request {}
type View = 'stream' | 'settings'
type EventHandler = (event: Event) => void

// Bad
interface ga4Request {}
type view = 'stream' | 'settings'
```

### Enums
Use PascalCase for enum, UPPER_SNAKE_CASE for values:

```typescript
// Good
enum ProxyStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error'
}

// Bad
enum proxyStatus {
  Running = 'running',
  Stopped = 'stopped'
}
```

### React Components
Use PascalCase for components, camelCase for props:

```tsx
// Good
function RequestStream({ onRequest, isActive }) {}

// Bad
function requestStream({ onRequest, is_active }) {}
```

### Boolean Variables
Prefix with `is`, `has`, `should`, `can`:

```typescript
// Good
const isLoading = false
const hasError = true
const shouldRetry = false
const canIntercept = true

// Bad
const loading = false
const error = true
const retry = false
```

---

## Import Organization

### Import Order
Group imports in this order:

```typescript
// 1. Node.js built-ins
import path from 'node:path'
import fs from 'node:fs'

// 2. External libraries
import { app, BrowserWindow } from 'electron'
import React from 'react'

// 3. Internal modules (absolute imports)
import { Button } from '@/components/ui'
import { parseGA4 } from '@/lib/parser'

// 4. Relative imports
import { Layout } from './components/Layout'
import { cn } from './lib/utils'

// 5. Type imports
import type { GA4Request } from './types'

// 6. CSS imports
import './index.css'
```

### Absolute Imports
Configure path aliases in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

Usage:
```typescript
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { GA4Request } from '@/types/ga4.types'
```

---

## Code Formatting

### Indentation
- **Spaces**: 2 spaces (no tabs)
- **Indent width**: 2

```typescript
// Good
function parseRequest(request: Request) {
  if (request.url.includes('ga4')) {
    return 'ga4'
  }
}

// Bad - 4 spaces
function parseRequest(request: Request) {
    if (request.url.includes('ga4')) {
        return 'ga4'
    }
}
```

### Line Length
- **Max line length**: 100 characters (soft limit)
- **Hard limit**: 120 characters

```typescript
// Good - break long lines
const request = await fetch(
  'https://www.google-analytics.com/g/collect',
  options
)

// Bad - too long
const request = await fetch('https://www.google-analytics.com/g/collect', options)
```

### Semicolons
Always use semicolons:

```typescript
// Good
const port = 8888
console.log('Starting proxy')

// Bad
const port = 8888
console.log('Starting proxy')
```

### Quotes
Use single quotes for strings, double quotes for JSX attributes:

```typescript
// Good
const message = 'Hello world'
<div className="flex" />

// Bad
const message = "Hello world"
<div className='flex' />
```

---

## Comment Standards

### JSDoc Comments
Use JSDoc for function documentation:

```typescript
/**
 * Parses a GA4 request and extracts event data
 * @param url - The full request URL
 * @returns Parsed GA4 request object or null if invalid
 * @example
 * parseGA4Request('https://google-analytics.com/g/collect?en=purchase')
 * // => { eventName: 'purchase', params: {...} }
 */
function parseGA4Request(url: string): GA4Request | null {
  // ...
}
```

### Inline Comments
Use inline comments for complex logic:

```typescript
// Extract event name from URL parameter
const eventName = urlObj.searchParams.get('en') || 'unknown'

// Fallback to 'unknown' if event name is missing
if (eventName === 'unknown') {
  logger.warn('Missing event name in GA4 request')
}
```

### TODO Comments
Mark TODOs with context:

```typescript
// TODO(huy.nguyenquang): Add retry logic for failed requests
// TODO: Implement request filtering (search by event name)
```

---

## React Best Practices

### Component Structure

#### 1. Functional Components with Hooks
```tsx
// Good
function RequestStream() {
  const [requests, setRequests] = useState<Request[]>([])

  useEffect(() => {
    // ...
  }, [])

  return <div>{/* ... */}</div>
}

// Bad - class components (avoid)
class RequestStream extends React.Component {
  // ...
}
```

#### 2. Props Interface
Define props interface separately:

```tsx
// Good
interface RequestCardProps {
  request: GA4Request
  onExpand: () => void
}

function RequestCard({ request, onExpand }: RequestCardProps) {
  return <div onClick={onExpand}>{request.eventName}</div>
}

// Bad - inline props
function RequestCard({ request, onExpand }: { request: GA4Request; onExpand: () => void }) {
  return <div onClick={onExpand}>{request.eventName}</div>
}
```

#### 3. Custom Hooks
Extract complex logic into custom hooks:

```tsx
// Good
function useProxyRequests() {
  const [requests, setRequests] = useState<Request[]>([])

  useEffect(() => {
    const listener = (_event: any, request: Request) => {
      setRequests(prev => [request, ...prev])
    }

    window.ipcRenderer.on('proxy-request', listener)
    return () => window.ipcRenderer.off('proxy-request', listener)
  }, [])

  return requests
}

// Usage
function StreamView() {
  const requests = useProxyRequests()
  return <RequestList requests={requests} />
}
```

### Performance

#### 1. Memoization
Use `useMemo` and `useCallback` for expensive operations:

```tsx
function RequestList({ requests }: { requests: Request[] }) {
  // Memoize filtered results
  const filteredRequests = useMemo(() => {
    return requests.filter(r => r.type === 'ga4')
  }, [requests])

  // Memoize callback
  const handleExpand = useCallback((id: string) => {
    console.log('Expand', id)
  }, [])

  return filteredRequests.map(r => (
    <RequestCard key={r.id} request={r} onExpand={handleExpand} />
  ))
}
```

#### 2. Key Props
Always provide stable keys for lists:

```tsx
// Good - unique ID
{requests.map(request => (
  <RequestCard key={request.id} request={request} />
))}

// Bad - using index (causes issues with reordering)
{requests.map((request, index) => (
  <RequestCard key={index} request={request} />
))}
```

---

## Error Handling

### Try-Catch Blocks
Always handle errors from async operations:

```typescript
// Good
async function startProxy() {
  try {
    await proxy.listen({ port: 8888 })
    logger.info('Proxy started successfully')
  } catch (error) {
    logger.error('Failed to start proxy', error)
    showNotification('Proxy startup failed')
  }
}

// Bad - no error handling
async function startProxy() {
  await proxy.listen({ port: 8888 })
}
```

### Error Types
Create custom error types:

```typescript
class ProxyError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ProxyError'
  }
}

// Usage
throw new ProxyError('Port already in use', 'EADDRINUSE', { port: 8888 })
```

---

## Git Workflow Recommendations

### Commit Messages
Use conventional commits:

```
feat(proxy): add certificate management functionality
fix(ui): resolve dark mode color issues
docs(readme): update installation instructions
refactor(parser): extract GA4 parsing logic
test(components): add RequestCard unit tests
```

### Branch Naming
```
feature/proxy-auto-restart
bugfix/certificate-trust
hotfix/security-vulnerability
release/v0.1.0
```

### .gitignore
Ensure `.gitignore` includes:

```
# Dependencies
node_modules/

# Build outputs
dist/
dist-electron/
out/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local

# Certificates (security)
*.pem
*.key
*.crt
```

---

## Security Best Practices

### 1. Context Isolation
Always enable context isolation in Electron:

```typescript
// electron/main.ts
win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    contextIsolation: true,      // REQUIRED
    nodeIntegration: false,      // REQUIRED
    sandbox: true                // RECOMMENDED
  }
})
```

### 2. IPC Security
Validate all IPC messages:

```typescript
// electron/handlers/proxy.ts
ipcMain.handle('proxy-start', (event, port) => {
  // Validate input
  if (typeof port !== 'number' || port < 1024 || port > 65535) {
    throw new Error('Invalid port number')
  }

  // Sanitize
  const safePort = Math.min(Math.max(port, 1024), 65535)
  return startProxy(safePort)
})
```

### 3. No Sensitive Data in Logs
Redact sensitive information:

```typescript
function logRequest(request: GA4Request) {
  // Redact PII
  const safeParams = { ...request.params }
  delete safeParams.client_id
  delete safeParams.user_id

  logger.info('GA4 Request', {
    eventName: request.eventName,
    params: safeParams
  })
}
```

---

## Testing Guidelines (Future)

### Unit Tests
- Use Vitest for unit testing
- Test pure functions, hooks, utilities
- Aim for 80%+ code coverage

### Integration Tests
- Use Playwright for Electron
- Test IPC communication
- Test proxy functionality

### E2E Tests
- Test critical user flows
- Certificate installation
- Proxy startup
- Request interception

---

**Last Updated**: 2026-01-05
**Version**: 1.0.0
**Status**: Draft - Ready for Implementation
