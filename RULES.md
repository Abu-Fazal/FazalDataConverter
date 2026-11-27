# FazalDataConverter — Universal Project Rules & Strict Guardrails

This file is the single source of truth for **all rules and guardrails** shared across every AI agent and subagent (Antigravity, Claude Code, OpenAI Codex, Cursor, Cline, Windsurf, Qodo, Google AI Studio, GitHub Copilot).

---

## 🚨 MANDATORY ZERO-TOLERANCE GUARDRAILS

Every AI agent and subagent working on this repository MUST strictly abide by these 6 core guardrails:

### 1. No Unauthorized Execution Without Plan Approval
- **Rule:** Never execute any tool, script, build, or major file change without presenting a clear plan to the user and receiving explicit approval.
- **Enforcement:** Break complex tasks into steps, present the plan first, wait for the user's confirmation before executing.

### 2. Complete Git / GitHub Lockdown (User Only)
- **Rule:** AI agents and subagents are **STRICTLY PROHIBITED** from running ANY Git or GitHub command (`git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `gh pr`, etc.).
- **Who runs Git:** All Git and GitHub operations will be executed **ONLY by the USER**.
- **Action on violation:** If any subagent or process attempts to run Git commands, it must be intercepted and immediately terminated.

### 3. Absolute Database Protection (Zero Destructive Operations)
- **Rule:** AI agents must **NEVER execute DELETE or DROP operations** on MongoDB Atlas or any database.
- **Restrictions:** Never call `.dropDatabase()`, `collection.drop()`, `deleteMany()`, `remove()`, or run destructive migrations without the user's direct, explicit instruction.
- **Default posture:** Do not touch database records or schemas unless specifically instructed by the user.

### 4. Zero File / Folder Deletion Without Permission
- **Rule:** Never delete any file, directory, or asset (`rm`, `del`, `Remove-Item`, or automated cleanup) without the user's explicit prior permission.
- **Confirmation:** If an obsolete or temporary file needs removal, ask the user first and state the exact path.

### 5. Workspace Boundary Restriction (No Out-of-Bounds Navigation)
- **Rule:** Agents must **NEVER navigate or operate outside the project workspace directory**: `d:\OneDrive\Desktop\FazalDataConverter`.
- **Communication:** If any external dependency, global tool, or external resource is needed, the agent must ask the user **in Hinglish** first.

### 6. No File Creation Without Plan Approval
- **Rule:** Do not generate or create new source code files, components, services, or configs until the plan has been explained and approved by the user.

---

## 1. Project Identity

- **Name:** FazalDataConverter
- **Purpose:** Secure, web-based bidirectional converter for Excel and JSON files. Supports BSON output and static JavaScript data extraction.
- **Stack:** React + Vite (Frontend), Node.js + Express (Backend), MongoDB Atlas, Cloudflare R2, Tailwind CSS, shadcn/ui + Radix UI.

---

## 2. Source of Truth

| Document | Covers |
|---|---|
| `PRD.md` | All product features, user roles, limits, workflows, design tokens, and typography. |
| `TRD.md` | Technical architecture, folder structure, database schema, APIs, security, and design system implementation. |

**Rule:** Never invent, extrapolate, or assume any feature, screen, endpoint, or behavior not documented in `PRD.md` or `TRD.md`.

---

## 3. Language Rules

- All code, comments, variable names, commit messages, documentation, and config files must be written in **English only**.
- Chat conversations and discussions use **Hinglish** (Hindi + English mix).

---

## 4. Typography

- **Inter** is the only allowed font family across the entire application.
- Never introduce Plus Jakarta Sans, Poppins, Roboto, or any other font.
- Follow the typography scale defined in `PRD.md` Section 10.6 and `TRD.md` Section 5.10.

---

## 5. Color & Visual Design System

- Strictly follow the approved design tokens defined in `PRD.md` Section 10.5 and `TRD.md` Sections 5.7 through 5.11.
- Maintain a clean, white-first interface with selective gradient usage.
- Do not introduce random or undocumented colors.

---

## 6. Security Standards

- **File handling:** Never execute uploaded JavaScript files or XLSM macros. Conversion operates in Data Only mode.
- **File size cap:** Strictly enforce the 50 MB maximum file size across all workflows.
- **Data isolation:** Enforce server-side ownership checks (`userId`) on every protected request.
- **Secrets:** Never commit `.env` files, API keys, database credentials, or secret tokens to git.
- **Input validation:** Validate all incoming files against MIME type, extension, and magic numbers. Validate all API inputs with Zod schemas.
- **Error responses:** Use structured JSON error responses. Never expose stack traces or internal paths to clients.

---

## 7. Architecture Rules

- Follow the monorepo structure specified in `TRD.md` Section 4.
- Separate frontend and backend code cleanly.
- State: React Hooks, Context API, Zustand.
- Unified API client in `frontend/src/services/api.client.js`.
- Permanent storage: Cloudflare R2.
- Metadata: MongoDB Atlas.
- Temporary storage: Local disk buffers (`backend/storage/temp/`), purged after job completion.

---

## 8. Code Quality Standards

- **Indentation:** 2 spaces.
- **Naming conventions:**
  - React components: PascalCase (`.jsx`)
  - Utilities and services: camelCase (`.js`)
  - Hooks: `use` prefix (`useAuth.js`)
  - Constants: UPPER_SNAKE_CASE
- **Linting:** ESLint + Prettier compliance.
- **Validation:** Zod schemas for all API inputs and forms.
- **Testing:** Unit tests with Vitest, API tests with Supertest, E2E tests with Playwright.

---

## 9. Supported Formats & Roles

| From | To | Notes |
|---|---|---|
| Excel (.xlsx, .xls) | JSON | Normal Data JSON and Workbook JSON modes |
| JSON | Excel (.xlsx) | Bidirectional |
| Excel | BSON | Server-side only |
| JavaScript (.js) | JSON | Static data extraction only. No code execution. |

- **User Roles:** Exactly three roles: `Guest`, `Registered User`, `Admin`. No other roles exist.
- **CSV:** CSV is **NOT** a supported format.

---

## 10. Lifecycle Hooks Enforcement

This project enforces automated hooks (`.agent/hooks.json` + `.agent/scripts/guardrail_check.py`):
- `PreToolUse` hook intercepts `run_command`, `write_file`, and `edit_file`.
- Hard blocks git execution, DB drops, file deletions, and out-of-bounds operations automatically.
