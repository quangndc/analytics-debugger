# Security & Code Quality Improvements Plan

**Project**: analytics-debugger
**Plan ID**: 260105-2147-security-code-quality-improvements
**Status**: Draft
**Created**: 2026-01-05
**Priority**: Critical

---

## Overview

This plan addresses security vulnerabilities and code quality issues identified during the initial codebase analysis. These improvements are essential for production readiness and user trust.

---

## Critical Security Issues

### 1. Missing webPreferences Hardening (CRITICAL)

**Location**: `electron/main.ts:44-47`

**Problem**: BrowserWindow created without explicit security options.

**Current Code**:
```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.mjs'),
}
```

**Risks**:
- Renderer process may have unintended Node.js access
- Context isolation may not be enforced
- Sandbox not enabled

**Solution**: Add explicit security options.

**Implementation**:
```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.mjs'),
  contextIsolation: true,      // Isolate renderer from Node.js
  nodeIntegration: false,       // Disable Node.js in renderer
  sandbox: true,                // Enable renderer sandbox
  webSecurity: true,            // Enable web security
  allowRunningInsecureContent: false,
  preloadScript: undefined,     // Prevent additional preload scripts
}
```

**Testing**:
- Verify IPC still works via contextBridge
- Test that `require()` fails in renderer
- Test that `window.node` is undefined

**File**: `electron/main.ts`

---

### 2. No Proxy Authentication (CRITICAL)

**Location**: `electron/proxy.ts`

**Problem**: Proxy accepts connections from anyone on port 8888 without authentication.

**Risks**:
- Network neighbors can intercept traffic
- Sensitive data exposure on shared networks
- No audit trail of proxy usage

**Solution**: Add proxy authentication.

**Implementation Tasks**:
1. Add token-based authentication:
   ```typescript
   // Generate random token on startup
   const proxyToken = crypto.randomBytes(32).toString('hex')

   // Store in userData
   fs.writeFileSync(tokenPath, proxyToken, 'utf-8')

   // Validate requests
   if (req.headers['x-proxy-token'] !== proxyToken) {
     res.writeHead(401)
     res.end('Unauthorized')
     return
   }
   ```

2. Add token display in UI:
   - Show in Settings view
   - Copy to clipboard button
   - Regenerate token option

3. Add to device setup instructions:
   - Include token in curl examples
   - Document for advanced users

**Alternative**: Basic auth (username:password)
- Simpler for tools like curl
- Still requires UI to display credentials

**File**: `electron/proxy.ts`, `src/components/Layout.tsx`

---

### 3. Unencrypted CA Certificate Storage (HIGH)

**Location**: `electron/proxy.ts` (certificate generation)

**Problem**: Private key stored in plaintext in userData directory.

**Risks**:
- Key theft if system compromised
- MITM attacks using stolen cert
- Compliance issues (security standards)

**Solution**: Encrypt private key at rest.

**Implementation Tasks**:
1. Use Keytar (encrypted credential storage):
   ```typescript
   import keytar from 'keytar'

   const SERVICE_NAME = 'analytics-debugger'
   const ACCOUNT_NAME = 'ca-private-key'

   // Save encrypted
   await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, privateKey)

   // Retrieve
   const privateKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
   ```

2. Fallback for systems without keytar:
   - Use OS-provided encryption (Keychain, DPAPI)
   - Document security model

3. Add certificate pinning:
   - Warn if certificate file changes unexpectedly
   - Hash verification on startup

**Dependencies**: `keytar` package

**File**: `electron/proxy.ts`

---

## Code Quality Issues

### 4. Replace `any` Types in proxy.ts (HIGH)

**Location**: `electron/proxy.ts`

**Problem**: Function parameters use `any` type, losing type safety.

**Current Code**:
```typescript
function onRequest(ctx: any, err: any) {
  if (err) {
    console.error(err)
    return
  }
  // ...
}
```

**Solution**: Define proper interfaces.

**Implementation**:
```typescript
import { IncomingMessage } from 'http'
import { ServerResponse } from 'http'

interface ProxyContext {
  clientToProxyRequest: IncomingMessage
  proxyToClientRequest: any
  proxyToServerRequest: any
  serverToProxyResponse: any
  isSSL: boolean
  filters?: any[]
}

interface ProxyError extends Error {
  code?: string
  errno?: number
  syscall?: string
}

function onRequest(ctx: ProxyContext, err: ProxyError | null): void {
  if (err) {
    console.error(`Proxy error: ${err.message}`)
    return
  }
  // ...
}
```

**Tasks**:
1. Create `electron/types/proxy.ts` with all interfaces
2. Update all function signatures
3. Run `tsc --noEmit` to verify

**File**: `electron/types/proxy.ts`, `electron/proxy.ts`

---

### 5. Add Error Handling (HIGH)

**Location**: Throughout codebase

**Problem**: Minimal try-catch blocks, errors may crash app.

**Solution**: Add comprehensive error handling.

**Implementation Tasks**:

1. **Main Process** (`electron/main.ts`):
   ```typescript
   app.on('ready', () => {
     try {
       createWindow()
       startProxy()
     } catch (error) {
       console.error('Failed to start:', error)
       app.quit()
     }
   })

   process.on('uncaughtException', (error) => {
     console.error('Uncaught exception:', error)
     // Show error dialog before quitting
     dialog.showErrorBox('Fatal Error', error.message)
     app.quit()
   })
   ```

2. **Proxy** (`electron/proxy.ts`):
   ```typescript
   proxyServer.on('error', (error: Error) => {
     if (error.message.includes('EADDRINUSE')) {
       win?.webContents.send('proxy-error', {
         type: 'port-in-use',
         message: 'Port 8888 is already in use'
       })
     } else {
       console.error('Proxy error:', error)
       win?.webContents.send('proxy-error', {
         type: 'unknown',
         message: error.message
       })
     }
   })
   ```

3. **Renderer** (`src/main.tsx`, `src/components/Layout.tsx`):
   ```typescript
   // Add React Error Boundary
   class ErrorBoundary extends React.Component {
     state = { hasError: false }

     static getDerivedStateFromError(error: Error) {
       return { hasError: true }
     }

     componentDidCatch(error: Error, errorInfo: any) {
       console.error('React error:', error, errorInfo)
     }

     render() {
       if (this.state.hasError) {
         return <div>Something went wrong.</div>
       }
       return this.props.children
     }
   }
   ```

**File**: Multiple

---

### 6. Unbounded Request Array Growth (MEDIUM)

**Location**: `src/components/Layout.tsx` (request state)

**Problem**: Requests array grows infinitely, consuming memory.

**Current Code**:
```typescript
const [requests, setRequests] = useState<GA4Request[]>([])

useEffect(() => {
  window.ipcRenderer.on('proxy-request', (_event, data) => {
    setRequests(prev => [...prev, data])  // Unbounded growth
  })
}, [])
```

**Solution**: Implement size limits.

**Implementation**:
```typescript
const MAX_REQUESTS = 1000

useEffect(() => {
  window.ipcRenderer.on('proxy-request', (_event, data) => {
    setRequests(prev => {
      const updated = [...prev, data]
      // Keep only most recent MAX_REQUESTS
      return updated.slice(-MAX_REQUESTS)
    })
  })
}, [])
```

**Alternative**: Virtual scrolling library for large lists.

**File**: `src/components/Layout.tsx`

---

### 7. Split Large Component (MEDIUM)

**Location**: `src/components/Layout.tsx` (148 lines)

**Problem**: Monolithic component handles too many responsibilities.

**Current Structure**:
```typescript
export function Layout() {
  // Sidebar, NavItem, StreamView, SetupView all in one file
}
```

**Solution**: Extract to separate components.

**Implementation**:
```
src/components/
├── Layout.tsx              # Main container (50 lines)
├── Sidebar/
│   ├── index.tsx           # Sidebar component (40 lines)
│   └── NavItem.tsx         # Navigation item (20 lines)
├── views/
│   ├── StreamView.tsx      # Live stream (40 lines)
│   ├── SetupView.tsx       # Device setup (50 lines)
│   └── SettingsView.tsx    # Settings (30 lines)
└── RequestList.tsx         # Request display (30 lines)
```

**Tasks**:
1. Extract `Sidebar` component
2. Extract `NavItem` component
3. Extract views (`StreamView`, `SetupView`, `SettingsView`)
4. Create `RequestList` for display logic
5. Update imports in Layout

**Files**: Multiple new files

---

## Implementation Order

### Phase 1: Critical Security (Do First)
1. **webPreferences Hardening** - Quick fix, high impact
2. **Proxy Authentication** - Essential for production use

### Phase 2: Type Safety
3. **Replace `any` Types** - Foundation for other work
4. **Split Layout Component** - Improves maintainability

### Phase 3: Reliability
5. **Error Handling** - Prevents crashes
6. **Request Array Limits** - Prevents memory issues

### Phase 4: Advanced Security
7. **Encrypt CA Certificates** - Requires external dependency

---

## File Structure Changes

### New Files
```
electron/
└── types/
    └── proxy.ts                 # Issue 4
src/components/
├── Sidebar/
│   ├── index.tsx               # Issue 7
│   └── NavItem.tsx             # Issue 7
├── views/
│   ├── StreamView.tsx          # Issue 7
│   ├── SetupView.tsx           # Issue 7
│   └── SettingsView.tsx        # Issue 7
└── RequestList.tsx             # Issue 7
```

### Modified Files
- `electron/main.ts` - Issues 1, 5
- `electron/proxy.ts` - Issues 2, 3, 4, 5
- `src/components/Layout.tsx` - Issues 6, 7
- `src/main.tsx` - Issue 5

---

## Testing Strategy

### Security Testing
1. **webPreferences**:
   - Verify `require()` fails in console
   - Test contextBridge still works
   - Confirm sandbox mode active

2. **Proxy Auth**:
   - Test without token (should fail)
   - Test with valid token
   - Test token regeneration

3. **Certificate Encryption**:
   - Verify key not in plaintext
   - Test retrieval after restart
   - Test on different OS

### Code Quality Testing
1. **Type Safety**:
   - Run `tsc --noEmit` (should pass)
   - Test with strict mode enabled

2. **Error Handling**:
   - Simulate port conflict
   - Test with invalid certificate
   - Test IPC message handling

3. **Memory Limits**:
   - Send 10,000 requests
   - Monitor memory usage
   - Verify cleanup

---

## Dependencies

**External**:
- `keytar` - Encrypted credential storage (Issue 3)

**Internal**:
- Existing codebase
- Type definitions

---

## Open Questions

1. **Auth Method**: Token vs Basic auth for proxy? Token is more flexible.

2. **Keytar Fallback**: What if keytar fails on some systems? Use environment variable with warning.

3. **Request Limit**: Should MAX_REQUESTS be configurable? Add to Settings.

4. **Error Reporting**: Send anonymous error reports? Defer to future.

---

## Success Criteria

### Security
- [ ] webPreferences explicitly set
- [ ] Proxy requires authentication
- [ ] CA certificates encrypted
- [ ] No plaintext credentials in storage

### Code Quality
- [ ] Zero `any` types in TypeScript
- [ ] All components under 100 lines
- [ ] `tsc --noEmit` passes with no errors
- [ ] Error handlers on all I/O operations
- [ ] Request array bounded at 1000 items

### Reliability
- [ ] App handles port conflicts gracefully
- [ ] Uncaught exceptions don't crash silently
- [ ] React errors caught by boundary

---

## Security Checklist

Before v0.1.0 release:
- [ ] Enable all webPreferences security options
- [ ] Implement proxy authentication
- [ ] Encrypt CA certificates
- [ ] Add CSP headers
- [ ] Disable Node.js in renderer
- [ ] Enable sandbox mode
- [ ] Add input sanitization
- [ ] Implement rate limiting (future)

---

**Last Updated**: 2026-01-05
**Priority**: Critical - Must complete before production use
