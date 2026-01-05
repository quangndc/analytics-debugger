# Project Overview & Product Development Requirements

## Product Description

**Analytics Debugger** is a desktop application designed for developers and QA engineers to intercept, inspect, and debug Google Analytics 4 (GA4) requests in real-time. Built with Electron, React, and TypeScript, this tool provides a local MITM (Man-in-the-Middle) proxy that captures analytics traffic from mobile devices, emulators, or other applications, making it easier to verify tracking implementation without relying on external debugging tools.

### Core Value Proposition

- **Real-Time Visibility**: See GA4 events as they fire, with zero delay
- **Zero Configuration Setup**: Works out of the box with automatic certificate generation
- **Privacy-First**: All traffic stays local on your machine - no cloud dependencies
- **Developer Focused**: Clean UI designed specifically for debugging analytics, not general HTTP traffic

### Why This Tool Exists

Traditional analytics debugging requires:
1. Using Google Analytics' built-in DebugView (12-24 hour delay)
2. Browser extensions (only work with web traffic)
3. General-purpose proxy tools (Charles, Proxyman) - overkill for simple GA4 debugging
4. Network inspection in Chrome DevTools (desktop-only, no mobile support)

**Analytics Debugger** solves these problems by providing a specialized, lightweight tool that just works for GA4 debugging across all platforms.

---

## Target Users

### Primary Users

1. **Mobile App Developers**
   - Need to verify GA4 event tracking in iOS/Android apps
   - Work with emulators and physical devices
   - Require real-time feedback during development

2. **Web Developers**
   - Implementing GA4 on web applications
   - Testing cross-domain tracking
   - Debugging e-commerce events and conversions

3. **QA Engineers**
   - Validate analytics implementation before releases
   - Regression testing for tracking code
   - Creating test reports with event logs

4. **Marketing Technologists**
   - Setting up and validating GA4 configurations
   - Testing custom dimensions and parameters
   - Auditing existing analytics implementations

### User Personas

**Persona 1: Dev Diana**
- Senior React Native Developer
- "I need to verify that my purchase events are firing correctly with all parameters"
- Pain point: Can't see mobile traffic in browser DevTools

**Persona 2: QA Quentin**
- QA Engineer at e-commerce company
- "I need to validate that all 50 tracking events work before our release"
- Pain point: Manual testing is slow and error-prone

**Persona 3: Marketing Mary**
- Marketing Operations Manager
- "I need to confirm our GA4 setup matches our analytics requirements"
- Pain point: DebugView has delay and doesn't show raw parameters

---

## Key Features

### Current Features (v0.0.0)

#### 1. MITM Proxy Server
- **Port**: 8888 (default)
- **Protocols**: HTTP & HTTPS interception
- **Certificate Management**: Auto-generates CA certificates in userData directory
- **GA4-Specific Parsing**: Extracts event names and parameters from `/g/collect` endpoints

#### 2. Live Traffic Stream
- Real-time display of intercepted GA4 requests
- Event name extraction (e.g., `purchase`, `page_view`, `add_to_cart`)
- Full parameter visibility (query params, custom dimensions)
- Timestamp tracking for each request

#### 3. Three-View Navigation
- **Live Stream**: Real-time request feed
- **Device Setup**: Certificate download and proxy configuration instructions
- **Settings**: Application configuration (placeholder in current version)

#### 4. Modern UI/UX
- Dark mode support via Tailwind CSS design tokens
- Responsive sidebar navigation
- Search/filter capabilities for requests
- Clean, distraction-free interface

### Planned Features (Future Releases)

#### Phase 1: Core Enhancements
- [ ] Request history with search and filtering
- [ ] Export functionality (JSON, CSV)
- [ ] Request inspection detail view
- [ ] Proxy start/stop controls
- [ ] Port configuration

#### Phase 2: Advanced Features
- [ ] Request replay capabilities
- [ ] Custom event highlighting
- [ ] Request annotations and notes
- [ ] Multiple device profiles
- [ ] Event validation rules

#### Phase 3: Integrations
- [ ] BigQuery export
- [ ] Slack/Discord notifications
- [ ] GA4 API integration for comparison
- [ ] Custom webhook support

---

## Product Development Requirements (PDR)

### Functional Requirements

#### FR-1: Proxy Server Management
**Priority**: P0 (Critical)
**Description**: Application must run a local proxy server capable of intercepting HTTP/HTTPS traffic

**Acceptance Criteria**:
- Proxy starts automatically on application launch
- Listens on configurable port (default: 8888)
- Generates and installs CA certificates for HTTPS interception
- Proxy status displayed in UI (Running/Stopped)
- Graceful error handling for port conflicts

**Technical Specifications**:
- Library: `http-mitm-proxy` v1.1+
- Certificate storage: `{userData}/certs/`
- Error logging: Console + optional file logging

#### FR-2: GA4 Request Parsing
**Priority**: P0 (Critical)
**Description**: System must identify and parse GA4 measurement protocol requests

**Acceptance Criteria**:
- Detects requests to `google-analytics.com/g/collect`
- Extracts event name (`en` parameter)
- Parses all query parameters into key-value pairs
- Handles URL-encoded data correctly
- Timestamps each request with millisecond precision

**Technical Specifications**:
```typescript
interface GA4Request {
  method: string
  url: string
  host: string
  timestamp: number
  type: 'ga4' | 'unknown'
  eventName?: string
  params?: Record<string, string>
}
```

#### FR-3: Real-Time UI Updates
**Priority**: P0 (Critical)
**Description**: Intercepted requests must appear in UI within 100ms of receipt

**Acceptance Criteria**:
- IPC communication from main to renderer process
- No duplicate requests displayed
- Requests sorted by timestamp (newest first)
- Smooth rendering with no UI freezing
- Maximum 1000 requests displayed in memory

**Technical Specifications**:
- IPC Channel: `proxy-request`
- Update mechanism: React state + IPC listeners
- Performance: <16ms render time per request

#### FR-4: Certificate Management
**Priority**: P1 (High)
**Description**: Users must be able to download and install CA certificates

**Acceptance Criteria**:
- "View/Download Certificate" button functional
- Certificate file accessible from UI
- Instructions provided for iOS/Android/macOS/Windows
- Certificate validation status displayed

#### FR-5: Dark Mode
**Priority**: P1 (High)
**Description**: Application must support light and dark themes

**Acceptance Criteria**:
- System preference detection
- Manual theme toggle option
- Consistent design tokens across all views
- Smooth theme transitions

### Non-Functional Requirements

#### NFR-1: Performance
- **Startup Time**: <3 seconds from launch to ready state
- **Memory Usage**: <200MB RSS with 1000 requests in memory
- **CPU Usage**: <5% when idle, <15% under heavy load
- **Request Processing**: <50ms per intercepted request

#### NFR-2: Reliability
- **Crash Rate**: <0.1% of sessions
- **Data Loss**: Zero request data loss during operation
- **Recovery**: Automatic recovery from proxy failures
- **Uptime**: Support continuous operation for 8+ hours

#### NFR-3: Security
- **Local-Only**: No data transmitted to external servers
- **Certificate Isolation**: CA certificates stored per installation
- **IPC Security**: ContextBridge for all IPC communications
- **No Code Execution**: Sandboxed renderer process

#### NFR-4: Compatibility
- **Platforms**: macOS 12+, Windows 10+, Linux (Ubuntu 20.04+)
- **Node Version**: Electron 30.0+ (Node.js 20.x)
- **GA4 Protocol**: Measurement Protocol v2 (current)

#### NFR-5: Usability
- **Onboarding Time**: <5 minutes from install to first intercepted request
- **Documentation**: Inline help for all critical features
- **Error Messages**: Clear, actionable error messages
- **Accessibility**: Keyboard navigation, screen reader support

---

## User Stories & Use Cases

### Use Case 1: Mobile App Event Verification

**Story**: As a mobile developer, I want to see my app's GA4 events in real-time so that I can verify my tracking implementation during development.

**Scenario**:
1. Developer opens Analytics Debugger
2. Connects iPhone to same WiFi as Mac
3. Configures iPhone WiFi proxy to Mac's IP:8888
4. Installs certificate from Analytics Debugger
5. Opens test app and triggers purchase flow
6. Sees `purchase` event appear in Analytics Debugger
7. Expands event to verify all parameters are correct

**Success Criteria**:
- Event appears within 1 second of triggering
- All custom parameters visible
- Revenue value matches expected amount

### Use Case 2: E-Commerce Testing

**Story**: As a QA engineer, I want to systematically test all GA4 events on our checkout flow so that I can ensure no tracking breaks during releases.

**Scenario**:
1. QA opens Analytics Debugger
2. Creates checklist of 20 events to verify
3. Configures Android emulator proxy
4. Navigates through checkout flow step by step
5. Marks off events as they appear in debugger
6. Exports event log as evidence
7. Reports any missing or malformed events

**Success Criteria**:
- All expected events captured
- Event parameters validated
- Log export available for test report

### Use Case 3: Cross-Domain Tracking

**Story**: As a web developer, I want to verify that GA4 cross-domain tracking works correctly so that user sessions aren't fragmented.

**Scenario**:
1. Developer has two domains: store.com and checkout.com
2. Opens Analytics Debugger
3. Configures browser to use proxy
4. Navigates from store.com to checkout.com
5. Verifies same `ga_session_id` appears in events
6. Confirms no duplicate session_start events

**Success Criteria**:
- Session ID consistency verified
- Event flow matches user journey

### Use Case 4: Custom Dimension Validation

**Story**: As a marketing technologist, I want to verify that custom parameters are sent with events so that our GA4 configuration is correct.

**Scenario**:
1. Marketer has configured custom dimension `user_tier` in GA4
2. Opens Analytics Debugger
3. Triggers events that should include `user_tier`
4. Checks each event for the parameter
5. Confirms values match expected tiers (free, pro, enterprise)

**Success Criteria**:
- Custom parameter present in all events
- Values match business logic
- No encoding issues in parameter values

---

## Success Metrics

### Product Metrics (North Star)

#### Primary Metrics
1. **Time to First Value**: <5 minutes from download to first intercepted event
2. **Weekly Active Users**: Target 100 WAU by end of Q1
3. **User Retention**: 40% return within 7 days

#### Secondary Metrics
1. **Average Requests per Session**: 50+ requests
2. **Session Duration**: 10+ minutes per session
3. **Export Rate**: 30% of sessions include data export

### Technical Metrics

#### Performance Metrics
1. **Startup Time**: p95 <3 seconds
2. **Request Latency**: p95 <100ms from network to UI
3. **Memory Efficiency**: <100MB baseline RSS
4. **Crash Rate**: <0.5% of sessions

#### Quality Metrics
1. **Request Parsing Accuracy**: >99.5%
2. **Certificate Installation Success**: >95%
3. **Error Recovery Success**: >90%

### Usage Analytics (Self-Tracking)

The application should track its own usage (privacy-first, local-only):

**Events to Track**:
- `app_start` - Application launch
- `proxy_start` - Proxy server started
- `proxy_error` - Proxy failures
- `request_intercepted` - Each GA4 request captured
- `export_triggered` - Data export actions
- `view_changed` - Navigation between views

**Parameters to Track**:
- `app_version` - Current version
- `platform` - OS platform
- `request_count` - Total requests in session
- `session_duration` - Time in app

---

## Technical Constraints & Dependencies

### External Dependencies

#### Runtime Dependencies
- **Electron**: v30.0+ (main process framework)
- **React**: v18.2+ (UI framework)
- **Node.js**: v20.x (via Electron)
- **http-mitm-proxy**: v1.1+ (proxy server)

#### Development Dependencies
- **TypeScript**: v5.2+ (type safety)
- **Vite**: v5.1+ (build tooling)
- **Tailwind CSS**: v4.1+ (styling)

### Platform Limitations

#### macOS
- Requires certificate trust in Keychain Access
- Requires helper tool for low-port binding (<1024) if needed
- Notarization required for distribution

#### Windows
- SmartScreen warning on first download
- Certificate installation via Certificate Manager
- Windows Defender may flag proxy behavior

#### Linux
- Certificate trust varies by distribution
- May require additional dependencies for OpenSSL
- Package format: AppImage preferred

### Known Limitations

1. **HTTPS Only**: Cannot intercept apps with certificate pinning
2. **Local Network**: Devices must be on same network as host machine
3. **Single Session**: One proxy instance per machine (port conflict)
4. **GA4 Only**: Focused on GA4 protocol, doesn't parse UA/GA3

---

## Risk Assessment

### Technical Risks

#### Risk 1: Certificate Trust Issues
**Impact**: High
**Probability**: Medium
**Mitigation**:
- Clear installation instructions per platform
- Automated trust prompts where possible
- Video tutorials for complex platforms

#### Risk 2: GA4 Protocol Changes
**Impact**: High
**Probability**: Low
**Mitigation**:
- Follow GA4 documentation updates
- Modular parsing logic for easy updates
- Version detection and fallback support

#### Risk 3: Network Configuration
**Impact**: Medium
**Probability**: High
**Mitigation**:
- IP detection and display
- Network troubleshooting guide
- Common error patterns and solutions

### Business Risks

#### Risk 1: Google Official Tools
**Impact**: Medium
**Probability**: Low
**Mitigation**:
- Focus on developer experience over features
- Maintain speed/usability advantage
- Build for edge cases official tools miss

#### Risk 2: Market Size
**Impact**: High
**Probability**: Medium
**Mitigation**:
- Target specific use cases (mobile debugging)
- Word-of-mouth in developer communities
- Open-source core for community trust

---

## Roadmap & Phasing

### Phase 1: MVP (Current - v0.0.0)
**Status**: ✅ Complete (Prototype)
**Duration**: 2 weeks
**Deliverables**:
- ✅ Basic Electron app with React UI
- ✅ MITM proxy on port 8888
- ✅ GA4 request parsing
- ✅ Real-time request display
- ✅ Three-view navigation skeleton

### Phase 2: Beta (v0.1.0)
**Target**: 4 weeks
**Deliverables**:
- Request history with filtering
- Certificate download functionality
- Proxy start/stop controls
- Dark/light mode toggle
- Export to JSON
- Basic error handling

### Phase 3: v1.0 Release
**Target**: 8 weeks
**Deliverables**:
- Production-ready stability
- Comprehensive documentation
- Automated testing suite
- CI/CD pipeline
- Signed binaries for all platforms
- Installation guides

### Phase 4: Advanced Features (v1.5+)
**Target**: 12+ weeks
**Deliverables**:
- Request replay functionality
- Custom event rules/alerts
- Multiple device profiles
- BigQuery integration
- Plugin system

---

## Open Questions

1. **Data Persistence**: Should request history persist between sessions? If so, for how long?
2. **Multi-Device**: Support multiple simultaneous devices? How to identify/separate them?
3. **Analytics**: Should we track anonymous usage metrics? How to implement privacy-first?
4. **Pricing**: Will this be open-source, freemium, or paid?
5. **Platform Priority**: Which platform to optimize for first? (macOS most common for developers)

---

## Appendix: GA4 Protocol Reference

### Measurement Protocol v2 Endpoint
```
POST https://www.google-analytics.com/g/collect
```

### Key Parameters
- `v` - Protocol version (typically 2)
- `tid` - Measurement ID (e.g., G-XXXXXXXXXX)
- `en` - Event name (required)
- `cid` - Client ID (required)
- `sid` - Session ID
- `dl` - Document location URL
- `ep.*` - Event parameters (custom)
- `up.*` - User properties (custom)

### Common Event Names
- `page_view` - Page navigation
- `session_start` - New session
- `user_engagement` - Active session
- `first_visit` - New user
- `purchase` - E-commerce transaction
- `add_to_cart` - Item added
- `begin_checkout` - Checkout started
- `search` - Site search

---

**Last Updated**: 2026-01-05
**Version**: 1.0.0
**Status**: Draft - Ready for Review
