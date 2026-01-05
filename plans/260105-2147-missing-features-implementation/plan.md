# Missing Features Implementation Plan

**Project**: analytics-debugger
**Plan ID**: 260105-2147-missing-features-implementation
**Status**: Draft
**Created**: 2026-01-05
**Priority**: High

---

## Overview

This plan addresses the missing functionality identified during the initial documentation phase. These features are essential for v0.1.0 Beta release and will significantly improve the tool's usability and production readiness.

---

## Features to Implement

### 1. Request Persistence (Critical)

**Problem**: All request data is lost when the application restarts. Users cannot review previous debugging sessions.

**Solution**: Implement persistent storage for request history.

**Implementation Tasks**:
1. Choose storage solution:
   - Option A: Electron's `app.getPath('userData')` with JSON file
   - Option B: SQLite database via `better-sqlite3`
   - Option C: IndexedDB (renderer process)

2. Create storage service module:
   - `src/services/request-storage.ts` - Storage interface
   - `electron/services/storage.ts` - Electron backend (if using file/SQLite)

3. Implement data model:
   ```typescript
   interface StoredRequest {
     id: string
     timestamp: number
     method: string
     url: string
     host: string
     type: 'ga4' | 'unknown'
     eventName?: string
     params?: Record<string, string>
     sessionId: string
   }
   ```

4. Add storage operations:
   - `saveRequest(request: GA4Request): Promise<void>`
   - `getRequests(limit?: number): Promise<StoredRequest[]>`
   - `getRequestsByDateRange(start: Date, end: Date): Promise<StoredRequest[]>`
   - `clearHistory(): Promise<void>`
   - `deleteRequest(id: string): Promise<void>`

5. Update proxy.ts to save requests on intercept

6. Add retention policy:
   - Default: Keep last 1000 requests
   - Configurable in Settings
   - Auto-cleanup on startup

**Dependencies**: None
**Estimated Files**: 3-4 new files
**Affected Files**: `electron/proxy.ts`, `src/components/Layout.tsx`

---

### 2. Export Functionality (High)

**Problem**: Users cannot export request data for analysis or sharing with stakeholders.

**Solution**: Add export to JSON and CSV formats.

**Implementation Tasks**:
1. Create export utility module:
   - `src/utils/export.ts`

2. Implement export functions:
   ```typescript
   export function exportToJSON(requests: StoredRequest[]): string
   export function exportToCSV(requests: StoredRequest[]): string
   export function downloadFile(content: string, filename: string, mimeType: string): void
   ```

3. Add export UI controls:
   - Export button in StreamView header
   - Export dialog/modal for format selection
   - Date range selector for partial export

4. Implement CSV flattening:
   - Convert nested params object to flat columns
   - Handle special characters in CSV
   - Include UTF-8 BOM for Excel compatibility

5. Add metadata to exports:
   - Export timestamp
   - Session info
   - Request count

**Dependencies**: Request storage (Feature 1)
**Estimated Files**: 1 new file
**Affected Files**: `src/components/Layout.tsx`

---

### 3. Proxy Start/Stop Controls (High)

**Problem**: Proxy starts automatically and cannot be controlled from UI. Users cannot restart proxy without restarting app.

**Solution**: Add manual proxy control with status indicator.

**Implementation Tasks**:
1. Create IPC handlers in main process:
   ```typescript
   ipcMain.handle('proxy:start', async () => { ... })
   ipcMain.handle('proxy:stop', async () => { ... })
   ipcMain.handle('proxy:getStatus', async () => { ... })
   ```

2. Update proxy.ts for lifecycle management:
   - Add `stopProxy()` function
   - Add `isProxyRunning()` check
   - Handle port conflicts
   - Graceful shutdown

3. Create proxy service in renderer:
   ```typescript
   // src/services/proxy-control.ts
   export async function startProxy(): Promise<{ success: boolean; port?: number; error?: string }>
   export async function stopProxy(): Promise<{ success: boolean; error?: string }>
   export async function getProxyStatus(): Promise<{ running: boolean; port?: number }>
   ```

4. Update UI components:
   - Add Start/Stop button in sidebar
   - Update status indicator
   - Show error messages on failure
   - Disable controls when starting/stopping

5. Add port configuration:
   - Settings option to change default port (8888)
   - Port validation on start

**Dependencies**: None
**Estimated Files**: 1 new file
**Affected Files**: `electron/main.ts`, `electron/proxy.ts`, `electron/preload.ts`, `src/components/Layout.tsx`

---

### 4. Certificate Download in UI (Medium)

**Problem**: Users must navigate to file system to find CA certificate. Setup experience is poor.

**Solution**: Add certificate download button in Device Setup view.

**Implementation Tasks**:
1. Create IPC handler for certificate:
   ```typescript
   ipcMain.handle 'proxy:getCertificatePath', async () => {
     return path.join(app.getPath('userData'), 'certs', 'ca.crt')
   }
   ```

2. Add certificate download utility:
   ```typescript
   // src/utils/certificate.ts
   export async function downloadCertificate(): Promise<void>
   export async function getCertificateInfo(): Promise<{ path: string; exists: boolean }>
   ```

3. Update SetupView component:
   - Add prominent "Download Certificate" button
   - Show certificate status (exists/missing)
   - Display certificate path
   - Add instructions for installation

4. Handle certificate regeneration:
   - Add "Regenerate Certificate" button (in Settings)
   - Warning that invalidates existing trust
   - Backup old certificate

**Dependencies**: None
**Estimated Files**: 1 new file
**Affected Files**: `electron/proxy.ts`, `electron/preload.ts`, `src/components/Layout.tsx`

---

### 5. Request Filtering and Search (High)

**Problem**: Users cannot find specific events in large request streams. UI becomes unusable with high traffic.

**Solution**: Add search and filtering capabilities.

**Implementation Tasks**:
1. Create filter utility module:
   ```typescript
   // src/utils/request-filters.ts
   export interface FilterOptions {
     search?: string
     eventName?: string
     dateFrom?: Date
     dateTo?: Date
     hosts?: string[]
   }

   export function filterRequests(requests: GA4Request[], options: FilterOptions): GA4Request[]
   ```

2. Update StreamView component:
   - Add search input (already exists in UI, need to wire up)
   - Add event name filter dropdown
   - Add date range picker (future enhancement)
   - Show filtered result count

3. Implement debounced search:
   - 300ms delay for typing
   - Prevent UI lag on large datasets

4. Add filter persistence:
   - Save filter state to localStorage
   - Restore on app restart
   - Clear filter button

5. Performance optimizations:
   - Virtual scrolling for large lists (future)
   - Limit display to 100 visible items initially

**Dependencies**: Request storage (Feature 1)
**Estimated Files**: 1 new file
**Affected Files**: `src/components/Layout.tsx`

---

## Implementation Order

### Phase 1: Foundation (Priority 1)
1. **Proxy Start/Stop Controls** - Enables better testing
2. **Certificate Download** - Improves setup experience

### Phase 2: Data Layer (Priority 2)
3. **Request Persistence** - Foundation for export and filtering
4. **Request Filtering** - Immediately useful with persistence

### Phase 3: Output (Priority 3)
5. **Export Functionality** - Completes the data workflow

---

## File Structure Changes

### New Files
```
src/
├── services/
│   ├── request-storage.ts      # Feature 1
│   └── proxy-control.ts         # Feature 3
├── utils/
│   ├── export.ts                # Feature 2
│   ├── certificate.ts           # Feature 4
│   └── request-filters.ts       # Feature 5
electron/
└── services/
    └── storage.ts               # Feature 1 (if using file/SQLite)
```

### Modified Files
- `electron/main.ts` - Proxy lifecycle IPC handlers
- `electron/proxy.ts` - Start/stop, request saving
- `electron/preload.ts` - IPC API exposure
- `src/components/Layout.tsx` - UI for all features

---

## Technical Decisions (ADRs)

### ADR-004: Storage Solution Choice

**Context**: Need to persist request history.

**Options**:
1. JSON file in userData - Simple, human-readable
2. SQLite via better-sqlite3 - Fast, queryable
3. IndexedDB - Renderer-side, async API

**Decision**: Start with JSON file (Option 1)
- Simplicity for MVP
- No native dependencies
- Easy to migrate later

**Future**: Migrate to SQLite if performance issues arise.

### ADR-005: Filter Implementation Approach

**Context**: Need to filter potentially large request lists.

**Options**:
1. Client-side filtering - Simple, works with small datasets
2. Server-side filtering - Requires database queries
3. Hybrid - Cache recent, query older

**Decision**: Client-side filtering (Option 1)
- Sufficient for <1000 requests
- No backend complexity
- Can add pagination later

---

## Testing Strategy

### Unit Tests
- Storage operations (save, get, clear)
- Export functions (JSON, CSV)
- Filter logic (search, date range)

### Integration Tests
- Proxy lifecycle (start, stop, restart)
- Certificate file operations
- IPC communication

### Manual Testing
- End-to-end workflow for each feature
- Performance with 1000+ requests
- Error handling (port conflicts, disk full)

---

## Open Questions

1. **Data Retention**: Should requests auto-delete after X days? Default to count-based limit.

2. **Export Scope**: Export all history or just visible/filtered? Default to filtered.

3. **Proxy Port**: Allow port configuration in v0.1.0 or defer? Include basic config.

4. **Certificate Backup**: Should we backup old certificate on regeneration? Yes, add timestamp.

---

## Success Criteria

- [ ] Requests persist across app restarts
- [ ] Can export to JSON and CSV
- [ ] Can start/stop proxy from UI
- [ ] Can download certificate from Setup view
- [ ] Can search and filter requests
- [ ] All features work with 1000+ stored requests
- [ ] No data loss on crashes
- [ ] Error handling for all edge cases

---

## Dependencies

**Internal**:
- Existing codebase (Electron + React structure)
- IPC communication patterns
- Tailwind CSS styling system

**External**:
- `better-sqlite3` (if using SQLite - deferred)

---

**Last Updated**: 2026-01-05
**Next Review**: After Phase 1 completion
