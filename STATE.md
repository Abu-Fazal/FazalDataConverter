# FazalDataConverter — Active Implementation State & Task Tracker

This file preserves the exact project state across all AI agents (Antigravity, Cline, Qoder, Codex, Claude Code).
Whenever an agent finishes a subtask, it updates this file.
Whenever an agent starts a new session, it reads this file first to know exactly where the work stopped.

---

## Overall Project Status

- **Current Task:** Phase 3 — App shell (Navbar + Footer Figma-exact)
- **Roadmap:** 9 phases (0–8) to implement all 18 Figma screens from `docs/FIMGA.zip` plus SEO landing
- **Last Updated By:** Qoder (Phase 0–2 complete, live-verified via headless Chrome CDP)
- **Last Updated:** 2026-11-28

---

## Figma Implementation Roadmap (Phases 0–8)

### Phase 0: Design token lock [COMPLETED]
- [x] `frontend/src/styles/tokens.css` with full TRD §5.9 palette, gradients, shadows (Inter only).
- [x] `tailwind.config.js` aligned: type scale, spacing, semantic colors, shadows, gradient utilities.
- [x] `index.css` rewritten: tokens import, focus-visible ring, palette scrollbar, reduced-motion.
- [x] Inter weights 400–800 in `index.html`. Figma export fonts/colors (Plus Jakarta Sans, Material Symbols) rejected per RULES.md.

### Phase 1: Runtime crash fixes + routing + config hygiene [COMPLETED]
- [x] Removed bogus `"fazaldataconverter-monorepo": "file:.."` dependency from both workspaces; lockfile synced.
- [x] Created `frontend/public/logo.svg` (fixes favicon 404).
- [x] Fixed 16 runtime bugs: HistoryTable `getPaginationRowModel` crash, nested thead rows, pagination state; ConverterPage missing `Sheet` import; SecondarySection icon rendering; HistorySection ArrowRight; MetricCard semantic colors; Footer Link `to`; AuthGuard imports; button danger variant; api.client.test.js ESM.
- [x] `App.jsx` routes consolidated: `/`, `/login`, `/converter`, `/converter/progress/:jobId`, `/converter/error/:jobId`, `/history` (AuthGuard), `/admin`.
- [x] `auth.api.js` posts mock credential to backend so a real session cookie is set; `getCurrentUser` falls back to sessionStorage.
- [x] Backend: `GET /api/jobs` list endpoint + `jobManager.listJobs(ownerId)`; mongoose `readyState` guard in auth route prevents 10s buffering hang offline.
- [x] Verified in browser: `/`, `/login`, `/converter` (upload + sheet modal), `/history` (post-login, no 401), `/admin` all console-clean.
- [x] `npx vite build` passes; Vitest frontend 4/4, backend 14/14.

### Phase 2: UI kit (Figma-exact primitives) [COMPLETED]
- [x] 2.1 Form controls: Input, Textarea, Label, Select, Checkbox, Switch (native-based, no new deps; input token group added to Tailwind; History search migrated to Input; SSR + browser verified).
- [x] 2.2 Feedback: Badge + StatusBadge (semantic tokens, dot + pulse), Alert (role alert/status), Skeleton, sonner Toaster mounted in App; StatusBadge moved out of progress.jsx; UserHistory uses Skeleton loading + toasts (fetch error, delete, cancel); New Conversion wired. SSR + live toast + build verified.
- [x] 2.3 Tabs (native, arrow-key nav verified live), Tooltip + DropdownMenu (Radix wrappers), Dialog polish (token overlay rgba(21,21,37,0.5), shadow-dialog, entrance animations, close focus ring); TooltipProvider in App; History action buttons get aria-label + Tooltip. Live browser verified: tab switch, menu items, dialog, focus trap.
- [x] 2.4 Table/Card/EmptyState primitives; Progress role=progressbar + aria values; HistoryTable, FailedJobsTable, SecurityLogsTable migrated (caption, aria-sort, keyboard sort buttons, Badge, real CSV exports, real date filter); MetricCard on Card + semantic tokens. CRITICAL FIX: TanStack infinite microtask loop (fresh columnFilters array identity each render triggered autoResetPageIndex every render) fixed via useMemo + autoResetPageIndex:false; proven with table-core simulation (9 resets/10 passes unstable vs 0 stable). SSR + build + tests pass.
- [x] 2.5 Accessibility + motion pass: skip-link in App (`#main-content`, visible on focus, verified live), Navbar rewrite (session user from sessionStorage, aria-current active links, aria-expanded/controls mobile menu, Sign in/out wired, icon aria-labels), SSR-safe window guards in Navbar (prerender-ready for Phase 7), contrast fixes (text-text-secondary footers/subtitles), global reduced-motion + focus-visible + palette scrollbar already in index.css. Login assets fixed: real 4-color Google G on white disc, ArrowLeftRight logo mark, Loader2 spinner (old SVG paths were corrupt garbage).
- [x] 2.6 Kit browser verification: live-verified in headless Chrome via CDP (`.tmp-cdp/driver.mjs` + verify/followup/final/shots scripts). Results: sort click NO freeze (aria-sort ascending/descending toggles, 25 seeded rows), search filter + pageIndex reset, 10/25 page-size aria-pressed, Next/Previous, download/delete/cancel handlers fire, progressbar aria values, status badges; skip-link focus; mobile menu open/close at 390px (aria-expanded + panel + 4 links); admin date filter proven with shifted clock (5 rows -> empty-range message -> 5 restored); both CSV exports produce real text/csv blobs with correct headers + success toasts; mock login 200 -> /api/jobs 200 -> empty state, zero console errors. AdminDashboard tables stacked full-width (were clipped in 1/3 column). Landing/footer polish: Hero CTAs wired (Get Started to /converter, View History to /history; dead animation state and mislabeled Docs button removed), feature copy un-clamped + ShieldCheck icon for Secure, sample conversion cards on kit StatusBadge (were raw hex lowercase chips), footer policy lines block-level + horizontal padding. Build + Vitest 4/4 pass. Screenshots in `.tmp-cdp/shots/`.

### Phase 3: App shell [PENDING]
- [ ] Navbar + Footer exact to Figma (fixed nav, mobile menu, active states).

### Phase 4: Conversion core screens [PENDING]
- [ ] Converter, sheet selection modal, progress state, validation error report, browser fallback consent dialog; wire to real backend APIs (currently mocked).

### Phase 5: User screens [PENDING]
- [ ] Sign in, History 1/2, Account, self-deletion re-auth modal.

### Phase 6: Admin suite [PENDING]
- [ ] Admin dashboard, user management, failure logs, security logs + CSV export, system config/maintenance, lockout/recovery.

### Phase 7: SEO landing + build-time prerender [PENDING]
- [ ] Semantic HTML, meta/OG, JSON-LD, GEO/AEO/IEO content; prerender static routes at build time.

### Phase 8: QA + completion [PENDING]
- [ ] Playwright E2E, contrast/a11y audit, cross-viewport pass, all 18 screens matched.

---

## Known Dev-Mode Facts

- Backend runs with in-memory session store and simulated R2 when `MONGODB_URI` / R2 creds are unset.
- Mock Google login active when `GOOGLE_CLIENT_ID` is unset/placeholder; session user id `mock_mongo_user_id`.
- Converter sheet list and conversion are still mocked in the frontend (wired for real in Phase 4).
- User's own Vite dev server runs on port 5173 — reuse it, never kill it.
- Backend `node --watch` restarts intermittently (OneDrive file touches); each restart wipes MemoryStore sessions, so `/api/jobs` can return 401 (or 500 via Vite proxy mid-restart). App degrades gracefully with an error toast. Re-login fixes it; not a code bug.
- Qoder in-app browser MCP target froze permanently on the old TanStack loop and never recovered (navigate/evaluate/screenshot all time out). Working verification channel: headless Chrome with `--remote-debugging-port=9222` (background task) + Node 24 built-in WebSocket CDP client in `.tmp-cdp/driver.mjs`. Run scripts with `node .tmp-cdp/<script>.mjs` from repo root. `.tmp-chrome-profile/` is its scratch profile.

---

## Handover Notes for Next Agent

- **Source of Truth:** Read `PRD.md`, `TRD.md`, and `RULES.md` before coding.
- **Strict Guardrails:** No Git execution, no DB drop, no file deletion without permission, Inter font only, 50 MB cap, no macro/script execution, no new dependencies without approval.
- **Rule:** Only work on ONE subtask at a time. After completion, mark `[x]` here and test before proceeding.
- **Verification:** Prefer the headless Chrome CDP channel (see Known Dev-Mode Facts); the in-app browser MCP is unreliable. Reuse `.tmp-cdp/driver.mjs`; screenshots land in `.tmp-cdp/shots/`.