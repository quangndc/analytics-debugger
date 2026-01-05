# System Architecture

## Architecture Overview

**Analytics Debugger** follows the classic Electron multi-process architecture with three distinct processes:

1. **Main Process** - Manages application lifecycle, native OS integration, and proxy server
2. **Preload Script** - Secure bridge between main and renderer processes
3. **Renderer Process** - React-based UI for displaying intercepted requests

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Main Process (Node.js)                  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  • App lifecycle (ready, quit, activate)       │  │  │
│  │  │  • Window management (BrowserWindow)           │  │  │
│  │  │  • MITM Proxy Server (port 8888)               │  │  │
│  │  │  • Certificate management                       │  │  │
│  │  │  • GA4 request parsing                         │  │  │
│  │  │  • IPC message handling                        │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────┬─────────────────────────────────────┘  │
│                 │ IPC (Inter-Process Communication)        │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Preload Script                          │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  • Context bridge (contextBridge)              │  │  │
│  │  │  • Secure API exposure                         │  │  │
│  │  │  • ipcRenderer wrapper                         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────┬─────────────────────────────────────┘  │
│                 │ window.ipcRenderer                       │
│                 ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Renderer Process (Chromium)                 │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  React 18 Application                          │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │  • UI Components (Layout, StreamView)    │  │  │  │
│  │  │  │  • State management (useState)           │  │  │  │
│  │  │  │  • IPC listeners (proxy-request)         │  │  │  │
│  │  │  │  • Tailwind CSS styling                  │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Main Process Architecture

### Responsibilities

The Main Process (`electron/main.ts`) is the entry point and orchestrator of the application.

#### 1. Application Lifecycle
```typescript
app.whenReady().then(createWindow)  // Initialize app
app.on('window-all-closed', ...)    // Cleanup on close
app.on('activate', ...)             // Handle dock clicks (macOS)
```

#### 2. Window Management
```typescript
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
}
```

**Current webPreferences**:
- ❌ Missing: `contextIsolation: true`
- ❌ Missing: `nodeIntegration: false`
- ❌ Missing: `sandbox: true`

**Security Recommendation**:
```typescript
win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    contextIsolation: true,    // Required for security
    nodeIntegration: false,     // Disable Node.js in renderer
    sandbox: true,              // Sandbox renderer process
  },
})
```

#### 3. Proxy Server Integration
```typescript
import { startProxy } from './proxy'

function createWindow() {
  win = new BrowserWindow({ ... })
  startProxy(win)  // Start proxy immediately
}
```

### IPC Channels (Main → Renderer)

| Channel | Data Type | Trigger | Purpose |
|---------|-----------|---------|---------|
| `main-process-message` | string (timestamp) | `did-finish-load` | Notify page load |
| `proxy-request` | GA4Request object | Every intercepted request | Stream GA4 data |
| `proxy-status` | `{status, port}` | Proxy startup | Notify proxy state |

---

## Preload Script Architecture

### Purpose
The preload script (`electron/preload.ts`) acts as a **secure bridge** between the privileged main process and the sandboxed renderer process.

### Context Bridge Pattern
```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
```

### Security Principles

#### 1. Principle of Least Privilege
Only expose necessary APIs:
```typescript
// ✅ Good - expose specific methods
contextBridge.exposeInMainWorld('api', {
  startProxy: (port) => ipcRenderer.invoke('proxy-start', port),
  stopProxy: () => ipcRenderer.send('proxy-stop'),
})

// ❌ Bad - expose entire ipcRenderer
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer)
```

#### 2. Type Safety
Define types for exposed APIs:
```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  onProxyRequest: (callback: (request: GA4Request) => void) => {
    ipcRenderer.on('proxy-request', (_event, request) => callback(request))
  }
})

// src/types/electron.d.ts
interface ElectronAPI {
  onProxyRequest: (callback: (request: GA4Request) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

---

## Renderer Process Architecture

### React Application Structure

```
src/
├── main.tsx              # React entry point
├── App.tsx               # Root component
├── index.css             # Global styles (Tailwind)
└── components/
    └── Layout.tsx        # Main layout with navigation
```

### Component Hierarchy
```
App
└── Layout
    ├── Sidebar
    │   ├── Logo
    │   ├── NavItems (Stream, Setup, Settings)
    │   └── ProxyStatus
    ├── Header
    │   ├── Title
    │   └── SearchBar
    └── ContentArea
        ├── StreamView
        ├── SetupView
        └── SettingsView
```

### State Management (Current)
```typescript
// Local component state (no global state yet)
const [activeView, setActiveView] = useState<View>('stream')
```

### Planned State Management
For future enhancements, consider:
- **Zustand** - Lightweight state management
- **Jotai** - Atomic state management
- **React Context** - For simple global state

---

## Proxy Architecture

### MITM Proxy Server

**File**: `electron/proxy.ts`

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Device / Emulator                        │
│                  (iPhone, Android, etc.)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/HTTPS Request
                       │ (Proxy configured to host:8888)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   MITM Proxy (Port 8888)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Intercept incoming request                         │ │
│  │  2. Generate CA certificate for HTTPS                  │ │
│  │  3. Decrypt request                                    │ │
│  │  4. Check if GA4 request                               │ │
│  │  5. Parse event name & parameters                      │ │
│  │  6. Send to renderer via IPC                           │ │
│  │  7. Forward to Google Analytics                        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ Forwarded Request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Google Analytics Servers                     │
│              (google-analytics.com/g/collect)                │
└─────────────────────────────────────────────────────────────┘
```

### Certificate Management

```typescript
// Certificate storage location
const userData = app.getPath('userData')  // e.g., ~/Library/Application Support/analytics-debugger
const certsDir = path.join(userData, 'certs')

// Auto-create directory
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true })
}

// Proxy uses certsDir for CA generation
proxy.listen({ port: 8888, sslCaDir: certsDir }, callback)
```

**Certificate Files**:
- `certs/ca-cert.pem` - Root CA certificate
- `certs/ca-key.pem` - Root CA private key
- `certs/certs/` - Per-site certificates (auto-generated)

### GA4 Request Parsing

```typescript
proxy.onRequest(function (ctx: any, callback: any) {
  const host = ctx.clientToProxyRequest.headers.host
  const url = ctx.clientToProxyRequest.url
  const protocol = ctx.isSSL ? 'https:' : 'http:'
  const fullUrl = protocol + '//' + host + url

  // Base request object
  let decoded: any = {
    method: ctx.clientToProxyRequest.method,
    url: fullUrl,
    host: host,
    timestamp: Date.now(),
    type: 'unknown'
  }

  // GA4-specific parsing
  if (host.includes('google-analytics.com') && url.includes('/g/collect')) {
    decoded.type = 'ga4'
    try {
      const urlObj = new URL(fullUrl)
      decoded.eventName = urlObj.searchParams.get('en') || 'unknown'

      // Extract all parameters
      const params: any = {}
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })
      decoded.params = params
    } catch (e) {
      console.error('Error parsing GA4 url', e)
    }
  }

  // Stream to renderer
  if (win) {
    win.webContents.send('proxy-request', decoded)
  }

  return callback()
})
```

**Parsed Request Structure**:
```typescript
interface GA4Request {
  method: string          // e.g., "POST", "GET"
  url: string             // Full URL
  host: string            // e.g., "www.google-analytics.com"
  timestamp: number       // Unix timestamp (ms)
  type: 'ga4' | 'unknown' // Request type
  eventName?: string      // e.g., "purchase", "page_view"
  params?: Record<string, string>  // All query parameters
}
```

---

## Data Flow

### Complete Request Lifecycle

```
1. DEVICE SENDS REQUEST
   │
   │  POST https://www.google-analytics.com/g/collect?v=2&tid=G-XXX&en=purchase
   │
   ▼
2. PROXY INTERCEPTS
   │
   │  http-mitm-proxy captures request
   │
   ▼
3. PARSE GA4 DATA
   │
   │  decoded = {
   │    type: 'ga4',
   │    eventName: 'purchase',
   │    params: { v: '2', tid: 'G-XXX', en: 'purchase', ... }
   │  }
   │
   ▼
4. SEND TO RENDERER (IPC)
   │
   │  win.webContents.send('proxy-request', decoded)
   │
   ▼
5. RENDERER RECEIVES
   │
   │  window.ipcRenderer.on('proxy-request', (_event, request) => {
   │    setRequests(prev => [request, ...prev])
   │  })
   │
   ▼
6. UI UPDATES
   │
   │  React re-renders with new request in list
   │
   ▼
7. FORWARD TO GA4
   │
   │  Proxy forwards original request to Google Analytics
   │
   ▼
8. GA4 PROCESSES
   │
   │  Google Analytics receives and processes the event
   │
   ▼
9. RESPONSE BACK
   │
   │  GA4 response → Proxy → Device
   │  (User sees normal behavior, no interruption)
```

### IPC Communication Flow

```
┌──────────────────┐                    ┌──────────────────┐
│   Main Process   │                    │ Renderer Process │
│  (electron/main) │                    │   (React App)    │
└────────┬─────────┘                    └────────┬─────────┘
         │                                       │
         │ 1. webContents.send('proxy-request')  │
         │──────────────────────────────────────>│
         │    { type: 'ga4', eventName: '...' } │
         │                                       │
         │                                       │ 2. ipcRenderer.on('proxy-request')
         │                                       │    → React setState()
         │                                       │    → UI re-render
         │                                       │
         │                                       │ 3. User clicks "Start Proxy"
         │                                       │
         │ 4. ipcRenderer.send('proxy-start')    │
         │<──────────────────────────────────────│
         │    { port: 8888 }                     │
         │                                       │
         │ 5. startProxy(port)                   │
         │                                       │
         │ 6. webContents.send('proxy-status')   │
         │──────────────────────────────────────>│
         │    { status: 'running', port: 8888 } │
         │                                       │
```

---

## Security Architecture

### Current Security Posture

#### Strengths ✅
1. **Context Bridge** - IPC properly isolated via contextBridge
2. **Local-Only** - No data transmitted externally
3. **Certificate Isolation** - CA certs stored per installation
4. **TypeScript** - Type safety reduces runtime errors

#### Weaknesses ⚠️
1. **Missing webPreferences**:
   - No `contextIsolation: true`
   - No `nodeIntegration: false`
   - No `sandbox: true`

2. **No Proxy Authentication**:
   - Anyone on network can use proxy
   - No access control

3. **No Certificate Password**:
   - CA private key unencrypted
   - Could be extracted if device compromised

### Security Recommendations

#### 1. Enable Renderer Sandbox
```typescript
// electron/main.ts
win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    contextIsolation: true,     // Isolate preload script
    nodeIntegration: false,      // Disable Node.js in renderer
    nodeIntegrationInWorker: false,
    sandbox: true,               // Sandbox renderer process
    webSecurity: true,           // Enable web security
    allowRunningInsecureContent: false,
  },
})
```

#### 2. Add Proxy Authentication
```typescript
// electron/proxy.ts
proxy.onRequestHeaders(function (ctx, callback) {
  const auth = ctx.clientToProxyRequest.headers['proxy-authorization']

  if (!auth || !validateAuth(auth)) {
    ctx.proxyToClientResponse.writeHead(407, {
      'Proxy-Authenticate': 'Basic realm="Analytics Debugger"'
    })
    ctx.proxyToClientResponse.end()
    return callback()
  }

  return callback()
})
```

#### 3. Encrypt CA Private Key
```typescript
import crypto from 'node:crypto'

// Generate encrypted key
const key = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: getAppSpecificPassphrase()
  }
})
```

---

## Build Architecture

### Development Build
```
┌─────────────────────────────────────────────────────────────┐
│                        Vite Dev Server                       │
│                      (http://localhost:5173)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HMR (Hot Module Replacement)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Electron Window                         │
│                  Loads Vite dev server URL                   │
└─────────────────────────────────────────────────────────────┘
```

### Production Build
```
1. TypeScript Compiler
   │
   │  tsc --noEmit  (type checking only)
   │
   ▼
2. Vite Build (Renderer)
   │
   │  vite build  →  dist/
   │  ├─ index.html
   │  └─ assets/
   │      ├─ index-[hash].js
   │      └─ index-[hash].css
   │
   ▼
3. Vite Build (Main)
   │
   │  vite-plugin-electron  →  dist-electron/
   │  └─ main.js
   │
   ▼
4. Electron Builder
   │
   │  electron-builder
   │  ├─ macOS: analytics-debugger.dmg
   │  ├─ Windows: analytics-debugger-setup.exe
   │  └─ Linux: analytics-debugger.AppImage
   │
   ▼
5. Code Signing (Optional)
   │
   │  - macOS: codesign + notarization
   │  - Windows: signtool
   │
   ▼
6. Distribution
   │
   │  Upload to GitHub Releases / Website
```

### Build Outputs

```
analytics-debugger/
├── dist/                           # Renderer process
│   ├── index.html                  # Entry HTML
│   └── assets/
│       ├── index-abc123.js         # Bundled React app
│       └── index-def456.css        # Bundled styles
│
├── dist-electron/                  # Main process
│   ├── main.js                     # Bundled main process
│   └── preload.mjs                 # Bundled preload script
│
├── out/                            # Electron builder output
│   ├── analytics-debugger-0.0.0.dmg           (macOS)
│   ├── analytics-debugger-setup-0.0.0.exe      (Windows)
│   └── analytics-debugger-0.0.0.AppImage       (Linux)
│
└── node_modules/                   # Dependencies (not packaged)
```

---

## Deployment Architecture

### Distribution Channels

#### 1. GitHub Releases
```
Release v0.1.0
├── analytics-debugger-mac.dmg
├── analytics-debugger-win.exe
├── analytics-debugger-linux.AppImage
└── checksums.txt (SHA256)
```

#### 2. Auto-Update (Future)
```typescript
import { autoUpdater } from 'electron-updater'

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', () => {
    // Notify user
  })

  autoUpdater.on('update-downloaded', () => {
    // Install and restart
  })
})
```

### Installation Flow

```
1. DOWNLOAD
   │
   │  User downloads .dmg / .exe / .AppImage
   │
   ▼
2. INSTALL
   │
   │  macOS: Drag to Applications folder
   │  Windows: Run installer
   │  Linux: Make executable, run
   │
   ▼
3. FIRST LAUNCH
   │
   │  - Electron app starts
   │  - Proxy server initializes
   │  - Certificates generated
   │  - BrowserWindow created
   │
   ▼
4. CONFIGURE DEVICE
   │
   │  - Download CA certificate
   │  - Install certificate on device
   │  - Configure device proxy to host:8888
   │
   ▼
5. READY TO USE
   │
   │  - Device traffic flows through proxy
   │  - GA4 requests appear in UI
```

---

## Performance Considerations

### Memory Management

#### Current Issues
- **Unbounded growth**: Requests array grows indefinitely
- **No cleanup**: Old requests never removed
- **Memory leak risk**: IPC listeners not properly removed

#### Solutions

**1. Limit Request History**
```typescript
const MAX_REQUESTS = 1000

const [requests, setRequests] = useState<Request[]>([])

useEffect(() => {
  const listener = (_event: any, request: Request) => {
    setRequests(prev => {
      const next = [request, ...prev]
      return next.slice(0, MAX_REQUESTS)  // Keep only last 1000
    })
  }

  window.ipcRenderer.on('proxy-request', listener)
  return () => window.ipcRenderer.off('proxy-request', listener)
}, [])
```

**2. Virtual Scrolling**
```typescript
import { FixedSizeList } from 'react-window'

function RequestList({ requests }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={requests.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <RequestCard
          request={requests[index]}
          style={style}
        />
      )}
    </FixedSizeList>
  )
}
```

### CPU Optimization

#### Proxy Performance
```typescript
// Batch IPC updates (reduce renderer overhead)
let requestBuffer: GA4Request[] = []

proxy.onRequest(function (ctx, callback) {
  // ... parse request ...

  requestBuffer.push(decoded)

  // Flush buffer every 100ms
  if (requestBuffer.length >= 10 || !flushTimeout) {
    win.webContents.send('proxy-request-batch', requestBuffer)
    requestBuffer = []
  }

  return callback()
})
```

---

## Scalability Considerations

### Current Limitations
1. **Single Proxy Instance**: Only one port (8888)
2. **No Multi-Device Support**: Can't distinguish between devices
3. **No Persistence**: Requests lost on app restart
4. **No Filtering**: All requests stored in memory

### Future Enhancements

#### 1. Multiple Proxy Ports
```typescript
interface ProxyConfig {
  name: string
  port: number
  enabled: boolean
}

const proxyConfigs: ProxyConfig[] = [
  { name: 'iOS Device', port: 8888, enabled: true },
  { name: 'Android Emulator', port: 8889, enabled: true },
  { name: 'Test Server', port: 8890, enabled: false }
]
```

#### 2. Device Identification
```typescript
interface GA4Request {
  // ... existing fields ...
  deviceId?: string  // Extract from User-Agent or IP
  deviceName?: string  // User-configured
}

// Attach metadata based on source IP/port
decoded.deviceId = getClientIdentifier(ctx)
```

#### 3. Data Persistence
```typescript
import { Database } from 'better-sqlite3'

// Store requests in SQLite
const db = new Database('requests.db')

function saveRequest(request: GA4Request) {
  db.prepare('INSERT INTO requests (data) VALUES (?)')
    .run(JSON.stringify(request))
}
```

---

## Monitoring & Observability (Future)

### Self-Tracking Events

```typescript
// Track app usage (privacy-first, local-only)
interface AppEvent {
  event: string
  timestamp: number
  metadata: Record<string, unknown>
}

const events: AppEvent[] = []

// App lifecycle
events.push({ event: 'app_start', timestamp: Date.now(), metadata: { version: '0.0.0' } })
events.push({ event: 'proxy_start', timestamp: Date.now(), metadata: { port: 8888 } })

// Error tracking
proxy.onError(function (ctx, err) {
  events.push({
    event: 'proxy_error',
    timestamp: Date.now(),
    metadata: { error: err.message, host: ctx.clientToProxyRequest.headers.host }
  })
})
```

### Health Checks

```typescript
// Proxy health monitoring
interface ProxyHealth {
  uptime: number
  requestsIntercepted: number
  ga4RequestsParsed: number
  errors: number
  lastRequestAt: number
}

function getProxyHealth(): ProxyHealth {
  return {
    uptime: Date.now() - proxyStartTime,
    requestsIntercepted: totalRequests,
    ga4RequestsParsed: ga4Count,
    errors: errorCount,
    lastRequestAt: lastRequestTimestamp
  }
}
```

---

## Architecture Decision Records (ADR)

### ADR-001: Why Electron?
**Decision**: Use Electron for desktop application
**Rationale**:
- Cross-platform (macOS, Windows, Linux) from single codebase
- Access to Node.js for proxy server
- Web technologies (React) for fast UI development
- Large ecosystem and community support

**Alternatives Considered**:
- Tauri (Rust-based) - Less mature, smaller ecosystem
- Native (Swift/Kotlin) - Requires 3 separate codebases
- Web app (browser-based) - Can't run system-level proxy

### ADR-002: Why MITM Proxy?
**Decision**: Use http-mitm-proxy for traffic interception
**Rationale**:
- Works with any device/app (no SDK integration required)
- Real-time interception (no delay)
- Captures complete request data (headers, body, params)
- Universal (works with iOS, Android, web apps)

**Alternatives Considered**:
- Browser DevTools - Desktop only, no mobile support
- GA4 DebugView - 12-24 hour delay, limited visibility
- Network logging in apps - Requires code changes

### ADR-003: Why Tailwind CSS?
**Decision**: Use Tailwind CSS for styling
**Rationale**:
- Fast development (utility classes)
- Consistent design system (design tokens)
- Dark mode support (via CSS variables)
- No CSS file maintenance (styles in components)

**Alternatives Considered**:
- CSS Modules - More boilerplate, harder theming
- Styled Components - Runtime overhead, larger bundle
- Chakra UI - Too heavy for current needs

---

**Last Updated**: 2026-01-05
**Version**: 1.0.0
**Status**: Draft - Architecture Review Complete
