# FazalDataConverter — Active Implementation State & Task Tracker

This file preserves the exact project state across all AI agents (Antigravity, Cline, Qoder, Codex, Claude Code).
Whenever an agent finishes a subtask, it updates this file.
Whenever an agent starts a new session, it reads this file first to know exactly where the work stopped.

---

## Overall Project Status

- **Current Task:** Phase 4 complete — next is Phase 5 (user screens)
- **Roadmap:** 9 phases (0–8) to implement all 18 Figma screens from `docs/FIMGA.zip` plus SEO landing
- **Last Updated By:** Qoder (Phase 0–4 complete, live-verified via headless Chrome CDP)
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

### Phase 3: App shell [COMPLETED]
- [x] 3.1 Extracted navbar/footer spec read-only from `docs/FIMGA.zip` (`unzip -p`; no files written).
- [x] 3.2 Navbar rebuilt from `navbar/code.html`: two-tone wordmark (fazal + gradient DataConverter), 40px gradient mark, desktop pill nav Home / Converter (gradient active) / History | About / Support, 40px Login + Get Started actions, account tile (guest login link, authed Radix dropdown with name/email/sign out), 44px hamburger. Mobile drawer: Figma header, icon links with chevrons (Active badge removed per user), account tile + Login/Get Started. Drawer portaled to body; Escape, scroll lock, focus restore. Nav switches to drawer below lg like the Figma spec.
- [x] 3.3 Footer rebuilt from `footer/code.html`: brand block with PRECISION DATA PIPELINE subtitle, full description, System Operational + 99.99% Node Uptime badge, zero-retention line; Product (5 links, v2.4 badge), User & Access (4 links, R2 dot), Platform (4 links, 100% badge), Legal & Trust (4 links); bottom bar with copyright, Browser-First Engine, Privacy/Terms/Security Spec/System Health. Column separators removed on mobile.
- [x] 3.4 New `/about` page (About heading, 4 spec cards, Support & docs section with `#support`, Privacy/security/trust section with `#trust`) so Home/About/Support destinations are real. Verified live at 1440/1024/768/390: nav labels and active states, Login + Get Started, drawer 340px with 0 Active badges + 4 chevrons, footer headings/links exactly matching the Figma columns, About active state, `#support` anchor scroll + Support active state, no horizontal overflow, zero console errors. Screenshots `.tmp-cdp/shots/20-24`.
- Deviations to review: nav/footer auth CTA reads "Login" per user request (Figma says "Sign In"); Account Settings routes to `/login` until the Phase 5 account screen exists; legal footer links route to `/about#trust` until policy pages exist; Support routes to `/about#support`; Figma marketing strings (browser-first, 99.99% uptime, v2.4) kept for parity and must be replaced with real telemetry/policy copy in Phases 6–7.

### Phase 4: Conversion core screens [COMPLETED]
- [x] 4.1 Backend pipeline: workbook inspector (sheets, visibility, dimensions, formula counts, header/row previews); Zod job schema + consent gate; async job manager wired to `jobProcessor`; staged progress (8/25/45/80/94/100); validation engine with fatal/recoverable/warning diagnostics, integrity score, ObjectId heuristic; inline overrides applied to both validation and conversion; session ownership for uploads/jobs; `discard`, `inspect`, `jobs`, `jobs/:id/retry`, guest-safe status/cancel, and download streaming with output consumption.
- [x] 4.2 Frontend data layer: `converter.api.js` (XHR upload progress, typed errors, job create/retry/status/cancel/download, Content-Disposition filename); dependency-free browser fallback engine (`ZIP` central directory + `DecompressionStream('deflate-raw')`, shared strings, sheet XML, Normal Data JSON, local inspection and overrides).
- [x] 4.3 Converter screen: Figma direction cards, dropzone with keyboard support, server inspect + pre-conversion editable table (headers and data cells, live empty/NaN/id signals), sheet mode and Figma sheet-selection modal, first-conversion consent modal, engine switch (server/browser), browser fallback consent with required checkbox, local output review.
- [x] 4.4 Progress screen: real polling with terminal-state stop and 3-failure error state, animated progress, 5-stage pipeline with observed timings, elapsed/ETA/velocity stats, retention/type/engine cards, Radix cancel dialog, completed output review with real download, failed/cancelled states.
- [x] 4.5 Validation error report: Figma header badges and stats (total/fatal/recoverable/warnings), filterable severity table (All/Fatal when present/Recoverable/Warnings), raw diagnostics panel + copy, JSON/CSV diagnostic export, inline cell editor with ObjectId generator and client regex validation, `Save & Revalidate` via retry job, `Download Converted Output Anyway`, integrity footer and truncation note.
- [x] 4.6 Verification: `vite build` passes; Vitest backend 14/14 and frontend 4/4; live CDP run covered upload/inspect, sheet modal, consent, async job to 100%, output review, error-report filters and editor, JSON+CSV downloads (real blobs), inline correction retry (ERR_INVALID_OBJECTID cleared, only duplicate-key warning remains), browser fallback with server copy discard (200) and zero uploads/jobs after fallback, mobile error report with no horizontal overflow and zero console errors.
- Deviations to review: PRD §6.8 describes browser processing as default while TRD §7.14 makes server processing primary; implementation uses server-default with an explicit, consent-gated browser fallback and reports this conflict. Consent is stored in `localStorage` plus the server session/job request (no DB `consents` collection exists in dev). Completed jobs with diagnostics retain the source file until download/restart so inline corrections can retry; clean outputs purge immediately. Failed and flagged sources live in MemoryStore without a TTL until backend restart (Phase 8 cleanup candidate). Figma `Re-verify Rules` is wired to refetch job state, and `Raw Diagnostics` toggles a raw JSON panel instead of a separate route. Maintenance banner remains deferred to Phase 6.

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
- Converter uses real APIs end to end. Jobs, uploads, and sessions are in-memory; a backend restart wipes them, so open progress/error URLs then return `JOB_NOT_FOUND`.
- User's own Vite dev server runs on port 5173 — reuse it, never kill it.
- Backend `node --watch` restarts intermittently (OneDrive file touches); each restart wipes MemoryStore sessions, so `/api/jobs` can return 401 (or 500 via Vite proxy mid-restart). App degrades gracefully with an error toast. Re-login fixes it; not a code bug.
- Qoder in-app browser MCP target froze permanently on the old TanStack loop and never recovered (navigate/evaluate/screenshot all time out). Working verification channel: headless Chrome with `--remote-debugging-port=9222` (background task) + Node 24 built-in WebSocket CDP client in `.tmp-cdp/driver.mjs`. Run scripts with `node .tmp-cdp/<script>.mjs` from repo root. `.tmp-chrome-profile/` is its scratch profile.
- Tailwind config edits are NOT picked up by the already-running Vite server (it caches the config; restarting would kill the user's server). Put new keyframes/utilities in `frontend/src/index.css` instead; same output in build.
- `backdrop-filter` (e.g. Navbar `backdrop-blur-md`) makes that ancestor a containing block for `position: fixed` descendants. Viewport overlays rendered inside the header must be portaled to `document.body` (mobile drawer does this).

---

## Handover Notes for Next Agent

- **Source of Truth:** Read `PRD.md`, `TRD.md`, and `RULES.md` before coding.
- **Strict Guardrails:** No Git execution, no DB drop, no file deletion without permission, Inter font only, 50 MB cap, no macro/script execution, no new dependencies without approval.
- **Rule:** Only work on ONE subtask at a time. After completion, mark `[x]` here and test before proceeding.
- **Verification:** Prefer the headless Chrome CDP channel (see Known Dev-Mode Facts); the in-app browser MCP is unreliable. Reuse `.tmp-cdp/driver.mjs`; screenshots land in `.tmp-cdp/shots/`.