# FazalDataConverter — Google Antigravity Configuration & Operational Rules

Read and follow `RULES.md` in this repository root. It contains the complete, shared project rules.

## Quick Reference
- **Source of truth:** `PRD.md` (product), `TRD.md` (technical), `RULES.md` (universal dev rules).
- **Stack:** React + Vite, Node.js + Express, MongoDB Atlas, Cloudflare R2, Tailwind CSS.
- **Font:** Inter only. No other fonts allowed.
- **Colors:** Follow design tokens in PRD Section 10.5 and TRD Section 5.
- **Security:** No macro/script execution. 50 MB file limit. Server-side ownership checks. Zod validation.
- **Code style:** 2-space indent. PascalCase components. camelCase utils. ESLint + Prettier.
- **Testing:** Vitest (unit), Supertest (API), Playwright (E2E).
- **Language:** All code and docs in English only.
- **Zero-Tolerance Guardrails:**
  1. Never run git commands (User only).
  2. Never drop/delete databases or collections.
  3. Never delete files or folders without user permission.
  4. Never access files outside workspace without permission in Hinglish.
  5. Never create files before plan approval.
  6. Never inspect or leak .env credentials.
  7. Typography: Inter only.
  8. Secrets: No hardcoding.
  9. Packages: Ask confirmation before npm/pnpm changes.
