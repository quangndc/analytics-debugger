# Analytics Debugger

A desktop application for intercepting and debugging Google Analytics 4 (GA4) requests in real-time. Built with Electron, React, and TypeScript.

## Overview

Analytics Debugger provides a local MITM (Man-in-the-Middle) proxy that captures GA4 traffic from mobile devices, emulators, or applications, making it easy to verify analytics implementation without relying on external debugging tools with delays.

### Key Features

- **Real-Time Interception** - See GA4 events as they fire with zero delay
- **Universal Support** - Works with iOS, Android, emulators, and web apps
- **Privacy-First** - All traffic stays local on your machine
- **GA4-Specific Parsing** - Extracts event names and parameters automatically
- **Modern UI** - Clean interface built with React and Tailwind CSS

### Use Cases

- Verify event tracking during mobile app development
- Debug e-commerce analytics (purchase, checkout flows)
- Validate cross-domain tracking
- Test custom dimensions and parameters
- QA analytics implementation before releases

---

## Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/analytics-debugger.git
cd analytics-debugger

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

This launches:
- Vite dev server on `http://localhost:5173`
- Electron window with hot-reload enabled
- MITM proxy on port 8888

### Building

```bash
# Create production build
npm run build
```

This generates:
- `dist/` - Renderer process bundle
- `dist-electron/` - Main process bundle
- `out/` - Packaged application (`.dmg`, `.exe`, `.AppImage`)

---

## Usage

### 1. Start the Application

Launch Analytics Debugger. The proxy starts automatically on port 8888.

### 2. Configure Your Device

#### For iOS/iPadOS
1. Connect your device to the same network as your Mac
2. Go to **Settings > Wi-Fi > (i) > HTTP Proxy**
3. Select **Manual** and configure:
   - **Server**: Your Mac's IP address (e.g., 192.168.1.5)
   - **Port**: 8888
4. Install the CA certificate from **Device Setup** view in the app
5. Go to **Settings > General > About > Certificate Trust Settings** and enable full trust

#### For Android
1. Connect your device to the same network as your computer
2. Long-press your Wi-Fi network and select **Modify Network**
3. Show advanced options and set **Proxy** to **Manual**
4. Configure:
   - **Proxy hostname**: Your computer's IP address
   - **Proxy port**: 8888
5. Download and install the CA certificate from **Device Setup** view
6. Go to **Settings > Security > Encryption & credentials > Trusted credentials > User** and verify the certificate

### 3. View Traffic

Trigger GA4 events on your device. They will appear in the **Live Stream** view in real-time.

---

## Project Structure

```
analytics-debugger/
├── electron/              # Main process code
│   ├── main.ts           # Entry point, window management
│   ├── preload.ts        # Context bridge for IPC
│   └── proxy.ts          # MITM proxy server
├── src/                  # React UI code
│   ├── components/       # UI components
│   ├── lib/              # Utilities
│   └── main.tsx          # React entry point
├── docs/                 # Full documentation
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md
│   ├── code-standards.md
│   └── system-architecture.md
└── package.json
```

---

## Technology Stack

### Core
- **Electron** 30.0 - Desktop framework
- **React** 18.2 - UI library
- **TypeScript** 5.2 - Type safety
- **Vite** 5.1 - Build tool

### Styling
- **Tailwind CSS** 4.1 - Utility-first CSS
- **lucide-react** - Icon library

### Networking
- **http-mitm-proxy** 1.1 - Traffic interception
- **selfsigned** 5.4 - Certificate generation

---

## Development Commands

```bash
# Start development server
npm run dev

# Run linter
npm run lint

# Type checking
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Documentation

Full documentation is available in the `docs/` directory:

- **[Project Overview & PDR](docs/project-overview-pdr.md)** - Product description, requirements, user stories, success metrics
- **[Codebase Summary](docs/codebase-summary.md)** - Project structure, file-by-file breakdown, LOC statistics
- **[Code Standards](docs/code-standards.md)** - TypeScript config, ESLint rules, styling conventions, naming conventions
- **[System Architecture](docs/system-architecture.md)** - Electron process model, IPC patterns, proxy architecture, security considerations

---

## How It Works

```
1. Device sends HTTP/HTTPS request → Proxy (port 8888)
2. Proxy intercepts and decrypts request
3. Parse GA4 event name and parameters
4. Stream data to UI via Electron IPC
5. Forward request to Google Analytics
6. UI displays real-time event data
```

### Architecture

- **Main Process** - Manages app lifecycle, proxy server, certificate generation
- **Preload Script** - Secure bridge between main and renderer processes
- **Renderer Process** - React UI for displaying intercepted requests

See [System Architecture](docs/system-architecture.md) for detailed diagrams.

---

## Current Limitations

- **Certificate Pinning**: Cannot intercept apps with certificate pinning enabled
- **Local Network Only**: Devices must be on the same network as the host machine
- **Single Session**: One proxy instance per machine (port conflicts if running multiple instances)
- **GA4 Only**: Specifically designed for GA4, doesn't parse Universal Analytics

---

## Roadmap

### v0.1.0 (Beta)
- [ ] Request history with filtering and search
- [ ] Certificate download functionality
- [ ] Proxy start/stop controls
- [ ] Export to JSON/CSV
- [ ] Basic error handling

### v1.0.0 (Release)
- [ ] Production-ready stability
- [ ] Comprehensive testing
- [ ] Auto-updater
- [ ] Signed binaries
- [ ] Complete documentation

### Future
- [ ] Request replay functionality
- [ ] Custom event highlighting
- [ ] Multiple device profiles
- [ ] BigQuery export integration
- [ ] Plugin system

---

## Contributing

Contributions are welcome! Please read our [Code Standards](docs/code-standards.md) before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/analytics-debugger/issues)
- **Documentation**: [docs/](docs/)
- **Email**: your.email@example.com

---

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [http-mitm-proxy](https://github.com/joeferner/node-http-mitm-proxy)

---

**Version**: 0.0.0 (Prototype)
**Last Updated**: 2026-01-05
