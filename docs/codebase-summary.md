# Codebase Summary

## Project Structure Overview

```
analytics-debugger/
├── electron/              # Electron main process & preload scripts
│   ├── main.ts           # Main process entry point
│   ├── preload.ts        # Context bridge for IPC
│   ├── proxy.ts          # MITM proxy server implementation
│   └── electron-env.d.ts # TypeScript definitions
│
├── src/                  # React renderer process (UI)
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Root component
│   ├── index.css         # Tailwind + design tokens
│   ├── App.css           # Legacy (unused)
│   ├── vite-env.d.ts     # Vite types
│   └── components/
│       ├── Layout.tsx    # Main UI layout with navigation
│       └── lib/
│           └── utils.ts  # Utility functions (cn)
│
├── public/               # Static assets
├── dist/                 # Built renderer output (generated)
├── dist-electron/        # Built main process output (generated)
├── docs/                 # Documentation (this directory)
│
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── README.md             # Project overview
```

---

## Technology Stack

### Core Framework
- **Electron**: v30.0.1 - Desktop application framework
- **React**: v18.2.0 - UI library for renderer process
- **TypeScript**: v5.2.2 - Type-safe JavaScript
- **Node.js**: v20.x (bundled with Electron 30)

### Build Tools
- **Vite**: v5.1.6 - Fast build tool and dev server
- **vite-plugin-electron**: v0.28.6 - Electron integration for Vite
- **vite-plugin-electron-renderer**: v0.14.5 - Renderer process optimizations
- **electron-builder**: v24.13.3 - Application packaging

### Styling
- **Tailwind CSS**: v4.1.18 - Utility-first CSS framework
- **PostCSS**: v8.5.6 - CSS transformation
- **Autoprefixer**: v10.4.23 - Vendor prefixing
- **clsx**: v2.1.1 - Conditional className utility
- **tailwind-merge**: v3.4.0 - Tailwind class merging

### UI Libraries
- **lucide-react**: v0.562.0 - Icon library
- **framer-motion**: v12.23.28 - Animation library (installed but not used yet)

### Proxy & Networking
- **http-mitm-proxy**: v1.1.0 - HTTP/HTTPS interception
- **selfsigned**: v5.4.0 - Certificate generation

### Development Tools
- **ESLint**: v8.57.0 - Code linting
- **@typescript-eslint/eslint-plugin**: v7.1.1 - TypeScript linting rules
- **@typescript-eslint/parser**: v7.1.1 - TypeScript parser for ESLint
- **eslint-plugin-react-hooks**: v4.6.0 - React hooks linting
- **eslint-plugin-react-refresh**: v0.4.5 - Fast refresh linting

---

## File-by-File Breakdown

### Electron Main Process (~183 LOC)

#### `electron/main.ts` (56 lines)
**Purpose**: Entry point for Electron main process

**Responsibilities**:
- Initialize Electron app
- Create BrowserWindow instance
- Start MITM proxy server
- Handle app lifecycle (ready, activate, window-all-closed)
- Configure Vite dev server or production build loading

**Key Code**:
```typescript
// Window creation with preload script
win = new BrowserWindow({
  icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
  },
})

// Start proxy immediately after window creation
startProxy(win)
```

**IPC Messages Sent**:
- `main-process-message` - Page load timestamp (did-finish-load)

**Dependencies**:
- `electron` (app, BrowserWindow)
- `node:path`, `node:url`, `node:module`
- `./proxy` (startProxy)

---

#### `electron/preload.ts` (25 lines)
**Purpose**: Secure bridge between main and renderer processes

**Responsibilities**:
- Expose safe IPC APIs via contextBridge
- Wrap ipcRenderer methods for security
- Prevent direct Node.js access in renderer

**Key Code**:
```typescript
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) { ... },
  off(...args: Parameters<typeof ipcRenderer.off>) { ... },
  send(...args: Parameters<typeof ipcRenderer.send>) { ... },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) { ... },
})
```

**Security**: Uses contextBridge to isolate Node.js APIs from renderer process

---

#### `electron/proxy.ts` (74 lines)
**Purpose**: MITM proxy server for traffic interception

**Responsibilities**:
- Create HTTP/HTTPS proxy on port 8888
- Generate and store CA certificates
- Intercept all requests
- Parse GA4-specific requests
- Stream parsed data to renderer via IPC

**Key Functions**:
```typescript
export function startProxy(win: BrowserWindow | null, port: number = 8888)
```

**Request Parsing Logic**:
```typescript
// Detect GA4 requests
if (host.includes('google-analytics.com') && url.includes('/g/collect')) {
  decoded.type = 'ga4'
  decoded.eventName = urlObj.searchParams.get('en') || 'unknown'
  // Extract all params
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })
}
```

**IPC Messages Sent**:
- `proxy-request` - Parsed request data (on every intercepted request)
- `proxy-status` - Proxy startup notification (running, port)

**Certificate Storage**:
- Location: `{app.getPath('userData')}/certs/`
- Auto-created if not exists

**Dependencies**:
- `http-mitm-proxy` (Proxy)
- `electron` (app, BrowserWindow)
- `node:path`, `node:fs`, `node:module`

---

#### `electron/electron-env.d.ts` (28 lines)
**Purpose**: TypeScript declarations for Electron APIs

**Contents**: Type definitions for `window.ipcRenderer` and Electron APIs

---

### React Renderer Process (~289 LOC)

#### `src/main.tsx` (16 lines)
**Purpose**: React application entry point

**Responsibilities**:
- Mount React app to DOM
- Load Tailwind CSS
- Listen for main process messages

**Key Code**:
```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// IPC listener for main process messages
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
```

---

#### `src/App.tsx` (11 lines)
**Purpose**: Root React component

**Responsibilities**:
- Import and render Layout component
- Ensure Tailwind CSS is loaded

**Structure**: Minimal wrapper, all logic in Layout

---

#### `src/components/Layout.tsx` (148 lines)
**Purpose**: Main UI layout with navigation and views

**Responsibilities**:
- Sidebar navigation (Stream, Setup, Settings)
- View state management
- Header with search
- Content area routing

**Components**:
- `Layout` - Main container with sidebar
- `NavItem` - Navigation button component
- `StreamView` - Live traffic stream (placeholder)
- `SetupView` - Device setup instructions

**Navigation Structure**:
```typescript
type View = 'stream' | 'settings' | 'setup'

// State
const [activeView, setActiveView] = useState<View>('stream')
```

**Tailwind Classes**: Extensive use of utility classes for layout, colors, spacing

**Dependencies**:
- `lucide-react` (Activity, Settings, Smartphone, Shield, Search icons)
- `../lib/utils` (cn function)

---

#### `src/lib/utils.ts` (7 lines)
**Purpose**: Utility functions for className merging

**Key Function**:
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Purpose**: Combines clsx (conditional classes) + tailwind-merge (deduplication)

---

#### `src/index.css` (60 lines)
**Purpose**: Tailwind CSS + design tokens

**Structure**:
- Tailwind directives (`@tailwind base/components/utilities`)
- CSS custom properties (design tokens) for:
  - Light mode colors
  - Dark mode colors
  - Spacing (radius)
  - Border, input, ring colors

**Design Tokens**:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  /* ... more tokens */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

**Usage**: Tokens used via `@apply` directive in Tailwind classes

---

#### `src/App.css` (Legacy - Unused)
**Status**: Not imported in any files, safe to delete

---

#### `src/vite-env.d.ts`
**Purpose**: Vite-specific TypeScript declarations

---

### Configuration Files

#### `package.json` (42 lines)
**Scripts**:
```json
{
  "dev": "vite",
  "build": "tsc && vite build && electron-builder",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview"
}
```

**Main Entry**: `"main": "dist-electron/main.js"`

**Dependencies**:
- Runtime: `clsx`, `framer-motion`, `http-mitm-proxy`, `lucide-react`, `react`, `react-dom`, `selfsigned`, `tailwind-merge`
- Dev: All build/lint tools (see Technology Stack)

---

#### `vite.config.ts` (30 lines)
**Purpose**: Vite build configuration with Electron integration

**Key Configuration**:
```typescript
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
```

**Features**:
- React Fast Refresh via `@vitejs/plugin-react`
- Electron main/preload bundling
- Development/production environment handling

---

#### `tsconfig.json` (26 lines)
**Purpose**: TypeScript compiler configuration

**Key Settings**:
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
  },
  "include": ["src", "electron"]
}
```

**Highlights**:
- Strict type checking enabled
- Unused locals/parameters detected
- ESNext modules with bundler resolution

---

#### `tailwind.config.js` (12 lines)
**Purpose**: Tailwind CSS configuration

**Content Paths**:
```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
]
```

**Theme**: Default (no customizations)

---

## LOC Statistics

### Total Project (excluding node_modules)
- **Total Files**: 17 TypeScript/TSX/CSS files
- **Total LOC**: ~472 lines (excluding config)

### Breakdown by Directory
| Directory | Files | LOC | Purpose |
|-----------|-------|-----|---------|
| `electron/` | 4 | ~183 | Main process, preload, proxy |
| `src/` | 5 | ~289 | React UI, components, styles |
| `src/components/` | 1 | ~148 | Layout component |
| `src/lib/` | 1 | ~7 | Utility functions |
| Root config | 6 | ~120 | Build tools, TypeScript, ESLint |

### File Size Distribution
**Largest Files**:
1. `src/components/Layout.tsx` - 148 lines (UI logic)
2. `electron/proxy.ts` - 74 lines (proxy server)
3. `electron/main.ts` - 56 lines (main process)
4. `src/index.css` - 60 lines (design tokens)
5. `electron/preload.ts` - 25 lines (context bridge)

**Smallest Files**:
1. `src/lib/utils.ts` - 7 lines (className utility)
2. `src/App.tsx` - 11 lines (root component)
3. `src/main.tsx` - 16 lines (React entry)

---

## Build Pipeline

### Development Workflow
```bash
npm run dev
```

**Process**:
1. Vite dev server starts (port 5173)
2. Vite-plugin-electron compiles main process
3. Electron launches with window pointing to Vite server
4. Hot Module Replacement (HMR) enabled for renderer
5. Main process auto-restarts on changes

### Production Build
```bash
npm run build
```

**Process**:
1. TypeScript compiler checks types (`tsc`)
2. Vite builds renderer process → `dist/`
3. Vite-plugin-electron builds main process → `dist-electron/`
4. electron-builder packages application
   - macOS: `.dmg` installer
   - Windows: `.exe` installer
   - Linux: `.AppImage`

### Output Structure
```
dist/
├── index.html          # Renderer HTML
├── assets/             # Bundled JS/CSS
│   ├── index-[hash].js
│   └── index-[hash].css

dist-electron/
└── main.js             # Bundled main process
```

---

## Dependency Overview

### Production Runtime
- **Electron**: Desktop framework
- **React**: UI rendering
- **clsx + tailwind-merge**: Styling utilities
- **lucide-react**: Icons
- **http-mitm-proxy**: Traffic interception
- **selfsigned**: Certificate generation

### Development Only
- **TypeScript**: Type checking
- **Vite**: Build tooling
- **ESLint**: Code quality
- **Tailwind CSS**: Styling
- **electron-builder**: Packaging

### Unused Dependencies
- **framer-motion**: Installed but not used in current codebase
- **App.css**: Referenced but not imported

---

## IPC Communication Channels

### Main → Renderer
| Channel | Data | Purpose |
|---------|------|---------|
| `main-process-message` | timestamp | Page load notification |
| `proxy-request` | GA4Request | Intercepted request data |
| `proxy-status` | {status, port} | Proxy startup status |

### Renderer → Main
Currently unused. Planned:
- `proxy-start` - Start proxy server
- `proxy-stop` - Stop proxy server
- `certificate-export` - Export CA certificate

---

## Architecture Patterns

### Electron Process Model
```
┌─────────────────────┐
│   Main Process      │
│   (electron/main.ts) │
│                     │
│ ┌─────────────────┐ │
│ │  MITM Proxy     │ │
│ │  (proxy.ts)     │ │
│ └─────────────────┘ │
└──────────┬──────────┘
           │ IPC (ipcRenderer)
┌──────────▼──────────┐
│  Preload Script     │
│  (preload.ts)       │
│  ┌──────────────┐   │
│  │contextBridge│   │
│  └──────────────┘   │
└──────────┬──────────┘
           │ window.ipcRenderer
┌──────────▼──────────┐
│  Renderer Process   │
│  (React App)        │
│  ┌──────────────┐   │
│  │ Layout.tsx   │   │
│  └──────────────┘   │
└─────────────────────┘
```

### Data Flow
```
1. HTTP Request → MITM Proxy
2. Proxy parses GA4 data
3. Proxy sends via IPC → Renderer
4. Renderer updates React state
5. UI re-renders with new request
```

---

## Key Design Decisions

### Why Electron?
- **Cross-platform**: Single codebase for macOS/Windows/Linux
- **Web Technologies**: Leverages React ecosystem
- **Network Access**: Node.js integration for proxy server
- **Local-First**: No cloud dependencies

### Why MITM Proxy?
- **Universal**: Works with any device/app
- **Real-Time**: Zero delay between request and visibility
- **Complete**: Captures all parameters, headers, body

### Why Tailwind CSS?
- **Fast Development**: Utility classes, no context switching
- **Consistency**: Design tokens for theming
- **Dark Mode**: Built-in support via CSS variables

### Why TypeScript?
- **Type Safety**: Catch errors at compile time
- **IDE Support**: Better autocomplete/refactoring
- **Documentation**: Types serve as inline docs

---

## Areas for Improvement

### Code Quality
1. **Error Handling**: Minimal try-catch blocks in proxy.ts
2. **Type Safety**: `any` types used in proxy.ts (ctx, err, callback)
3. **Logging**: No structured logging system
4. **Testing**: No test files or testing framework

### Architecture
1. **State Management**: No global state (Context API/Redux needed)
2. **Component Structure**: Layout.tsx is 148 lines (should split)
3. **IPC Types**: No shared types between main and renderer
4. **Constants**: Magic numbers/strings scattered (port 8888)

### Security
1. **webPreferences**: Missing contextIsolation, nodeIntegration settings
2. **Certificate**: No password protection on CA certs
3. **Proxy**: No authentication (anyone on network can use)

### Performance
1. **Memory**: No cleanup of old requests (unbounded growth)
2. **Rendering**: No virtualization for long request lists
3. **Proxy**: No connection pooling or optimization

---

## Migration Notes

### From Prototype to Production
1. Add error boundaries in React
2. Implement proper logging (winston/pino)
3. Add telemetry (self-tracking)
4. Write tests (Vitest + Playwright)
5. Set up CI/CD (GitHub Actions)
6. Add auto-updater (electron-updater)
7. Implement crash reporting (Sentry)

---

**Last Updated**: 2026-01-05
**Version**: 1.0.0
**Status**: Draft - Based on Scout Reports
