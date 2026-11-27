# FazalDataConverter — GitHub Copilot Instructions

Read and follow `RULES.md` in this repository root. It contains the complete, shared project rules.

## Quick Reference

- **Source of truth:** `PRD.md` (product), `TRD.md` (technical), `RULES.md` (dev rules).
- **Stack:** React + Vite, Node.js + Express, MongoDB Atlas, Cloudflare R2, Tailwind CSS.
- **Font:** Inter only. No other fonts allowed.
- **Colors:** Follow design tokens in PRD Section 10.5 and TRD Section 5.
- **Security:** No macro/script execution. 50 MB file limit. Server-side ownership checks. Zod validation.
- **Code style:** 2-space indent. PascalCase components. camelCase utils. ESLint + Prettier.
- **Testing:** Vitest (unit), Supertest (API), Playwright (E2E).
- **Language:** All code and docs in English only.
- **Never invent features** not in PRD.md or TRD.md.

## Architecture

- Monorepo: `TRD.md` Section 4.
- Frontend state: React Hooks, Context API, Zustand.
- API client: `frontend/src/services/api.client.js`.
- Storage: Cloudflare R2 (files), MongoDB Atlas (metadata), local temp (buffers).
- Supported formats: Excel (.xlsx, .xls), JSON, BSON, JS (static extraction only).
- User roles: Guest, Registered User, Admin. No other roles.
