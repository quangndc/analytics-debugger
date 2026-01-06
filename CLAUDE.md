# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Project Context: Analytics Debugger

**What it is**: Desktop app (Electron) for intercepting and debugging Google Analytics 4 requests in real-time.

**Tech Stack**: 
- Frontend: React 18, TypeScript 5.2, Tailwind CSS 4
- Backend: Electron 30, Node.js 20, http-mitm-proxy
- Build: Vite 5, electron-builder
- Tests: Vitest (88% coverage, 50 tests)

**Quick Commands**:
```bash
npm run dev              # Start development (Electron + Vite HMR)
npm run build            # Production build → release/0.0.0/
npm run lint             # ESLint (max-warnings: 0)
npx tsc --noEmit         # Type checking
npx vitest               # Run tests
npx vitest --coverage    # Coverage report
```

**Code Guidelines**: See **AGENTS.md** (171 lines with imports, types, naming, formatting, patterns)

## Workflows

- Primary workflow: `./.claude/workflows/primary-workflow.md`
- Development rules: `./.claude/workflows/development-rules.md`
- Orchestration protocols: `./.claude/workflows/orchestration-protocol.md`
- Documentation management: `./.claude/workflows/documentation-management.md`
- And other workflows: `./.claude/workflows/*`

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/workflows/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Always read `AGENTS.md` for code standards (TypeScript, React, Tailwind, naming conventions).
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## Quality Gates (Must Pass Before Commit)

1. **No TypeScript errors**: `npx tsc --noEmit` → exit code 0
2. **No linting violations**: `npm run lint` → max-warnings 0
3. **88% code coverage minimum**: `npx vitest --coverage`
4. **All tests passing**: `npx vitest` → 100% pass rate
5. **No console.log** in production code (except error logging)
6. **No unused variables** (enforced by tsconfig noUnusedLocals)

## Project Structure

```
src/
├── components/          # React UI components
├── lib/                # Utilities (cn() for Tailwind classes)
├── types/              # TypeScript type definitions
├── utils/              # Business logic (filtering, export)
└── __tests__/          # Tests (mirror src/ structure)

electron/               # Electron main process
├── main.ts            # App initialization
├── proxy.ts           # MITM proxy for GA4 interception
└── types/             # Electron-specific types

.claude/                # ClaudeKit Engineer (workflows, skills, agents)
docs/                   # Project documentation
```

## Code Standards (See AGENTS.md for full details)

### TypeScript
- Strict mode: `noUnusedLocals: true`, `noUnusedParameters: true`, `strict: true`
- Explicit return types on all functions
- No `any` without explicit justification
- Import types separately: `import type { Type }`

### React Components
- Functional only (hooks preferred)
- Props with explicit types: `{ label: string, isActive: boolean }`
- No inline styles (use Tailwind + `cn()` utility)
- Structure: Imports → Types → Component → Helpers → Export

### Tailwind CSS v4
- CSS variables: `--background`, `--foreground`, `--border` (in `src/index.css`)
- Use `cn()` for conditional classes: `cn('base', isActive && 'active')`
- Dark mode via `.dark` class
- No hardcoded colors

### Imports
- ESM only (`import`/`export`, no CommonJS)
- Group: React → 3rd-party → Internal → Types
- Relative paths: `'../lib/utils'`, not absolute
- Files: kebab-case, Components: PascalCase, Functions: camelCase

### Error Handling
- Log before throwing: `console.error('Context:', error)`
- Explicit messages: `new Error('Specific description')`
- Try-catch for async, throw only for critical failures

### Formatting
- Semicolons required (ESLint enforced)
- 4-space indentation
- Single quotes for strings
- Trailing commas (ES5+)
- Max 120 chars per line (soft)

## Common Patterns

### Request Filtering
```typescript
import { filterRequests } from '../utils/request-filters';
const filtered = filterRequests(requests, { 
  text: 'purchase',
  eventName: 'add_to_cart'
});
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
const className = cn('base-class', isActive && 'active-class');
```

## Hook Response Protocol

### Privacy Block Hook (`@@PRIVACY_PROMPT@@`)

When a tool call is blocked by the privacy-block hook, the output contains a JSON marker between `@@PRIVACY_PROMPT_START@@` and `@@PRIVACY_PROMPT_END@@`. **You MUST use the `AskUserQuestion` tool** to get proper user approval.

**Required Flow:**

1. Parse the JSON from the hook output
2. Use `AskUserQuestion` with the question data from the JSON
3. Based on user's selection:
   - **"Yes, approve access"** → Use `bash cat "filepath"` to read the file (bash is auto-approved)
   - **"No, skip this file"** → Continue without accessing the file

**Example AskUserQuestion call:**
```json
{
  "questions": [{
    "question": "I need to read \".env\" which may contain sensitive data. Do you approve?",
    "header": "File Access",
    "options": [
      { "label": "Yes, approve access", "description": "Allow reading .env this time" },
      { "label": "No, skip this file", "description": "Continue without accessing this file" }
    ],
    "multiSelect": false
  }]
}
```

**IMPORTANT:** Always ask the user via `AskUserQuestion` first. Never try to work around the privacy block without explicit user approval.

## Python Scripts (Skills)

When running Python scripts from `.claude/skills/`, use the venv Python interpreter:
- **Linux/macOS:** `.claude/skills/.venv/bin/python3 scripts/xxx.py`
- **Windows:** `.claude\skills\.venv\Scripts\python.exe scripts\xxx.py`

This ensures packages installed by `install.sh` (google-genai, pypdf, etc.) are available.

## Documentation Management

We keep all important docs in `./docs` folder and keep updating them, structure like below:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

## Before Committing

```bash
# 1. Auto-fix linting issues
npm run lint -- --fix

# 2. Type check (must be 0 errors)
npx tsc --noEmit

# 3. Run all tests (must pass)
npx vitest

# 4. Check coverage (must be ≥88%)
npx vitest --coverage

# 5. Remove console.log (except errors)
# 6. Check for unused variables
```

## Resources

- **AGENTS.md** - Complete coding guidelines (171 lines)
- **README.md** - Project overview and architecture
- **TypeScript Strict Mode**: https://www.typescriptlang.org/tsconfig#strict
- **Tailwind v4**: https://tailwindcss.com/docs/customization
- **Vitest**: https://vitest.dev/
- **Electron**: https://www.electronjs.org/docs
- **React Hooks**: https://react.dev/reference/react/hooks

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./CLAUDE.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*