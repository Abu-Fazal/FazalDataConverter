# Coding Standards

Follow the universal rules in `RULES.md` and the architecture in `TRD.md`.

## 1. Code Quality & Formatting
- All code must be clean, modular, and maintainable.
- Indentation: 2 spaces.
- Naming conventions:
  - React components: PascalCase (`.jsx`)
  - Utilities and services: camelCase (`.js`)
  - Hooks: `use` prefix (`useAuth.js`)
  - Constants: UPPER_SNAKE_CASE

## 2. Security Practices
- Never commit secrets, credentials, or `.env` files to git.
- Sanitize and validate all user inputs using Zod schemas.
- Ensure all database queries enforce user-level ownership checks (`userId`).
- Disallow execution of untrusted code from uploads (macros, scripts).
- Validate files against MIME type, extension, and magic numbers.

## 3. Error Handling
- Use structured JSON error responses with standard error codes and request IDs.
- Never expose raw stack traces, database internals, or internal paths in client-facing responses.

## 4. Testing Requirements
- Unit tests: Vitest.
- API tests: Supertest.
- E2E tests: Playwright.
- All new features must include tests.

## 5. Dependencies
- Use npm as the package manager.
- Pin dependency versions with package-lock.json.
- Use Node.js LTS runtime.
