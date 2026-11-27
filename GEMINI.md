# FazalDataConverter — Workspace Rules & Configuration

This file defines the primary operational guidelines for Antigravity when working on the FazalDataConverter repository.

## 1. Project Overview
- **Project Name:** FazalDataConverter
- **Purpose:** Secure, web-based bidirectional converter for Excel and JSON files (with support for BSON and static JS data extraction).
- **Core Technology:** React + Vite (Frontend), Node.js + Express (Backend), MongoDB Atlas, Cloudflare R2, Tailwind CSS.

## 2. Source of Truth
- **Requirements:** `PRD.md` is the sole source of truth for all product features, user roles, limits, and workflows.
- **Technical Architecture:** `TRD.md` is the sole source of truth for technical architecture, folder structure, database schema, APIs, and security rules.
- **Shared Rules:** `RULES.md` contains the universal project rules shared across all AI agents.
- **Rule:** Never invent, extrapolate, or assume features outside of `PRD.md` and `TRD.md`.

## 3. Core Development Rules
- **Language in Repository:** All code, comments, documentation, commit messages, and config files must be written in English only.
- **Typography Standard:** Use **Inter** as the only font family across the entire application. Never introduce Plus Jakarta Sans or any other font family.
- **Color System:** Strictly follow the approved design tokens defined in `PRD.md` Section 10 and `TRD.md` Section 5.
- **File Handling Security:** Never execute uploaded JavaScript files or XLSM macros. Conversion must operate in Data Only mode.
- **Data Isolation:** Enforce server-side ownership checks on every user file and conversion record.
- **File Size Cap:** Strictly enforce the 50 MB file size limit across all workflows.

## 4. Code and Architecture Standards
- **Monorepo Structure:** Follow the module-based architecture specified in `TRD.md` Section 4.
- **Type Safety and Validation:** Use Zod schemas for validating all API inputs and incoming data.
- **Testing Standard:** Unit tests with Vitest, API testing with Supertest, end-to-end tests with Playwright.

## 5. Cross-Agent Compatibility
- This project uses a shared `RULES.md` file at the repository root.
- All AI agents (Antigravity, Claude Code, Codex, Cursor, Cline, Windsurf, GitHub Copilot) follow the same rules.
- If `RULES.md` and this file conflict, `RULES.md` takes precedence.
