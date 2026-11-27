# Architecture Guidelines

Follow the monorepo structure defined in `TRD.md` Section 4 and the universal rules in `RULES.md`.

## 1. Monorepo Organization
- Organized by feature modules according to `TRD.md` Section 4.
- Avoid deeply nested folders inside feature modules.
- Separate frontend and backend code cleanly.

## 2. State & Data Flow
- Frontend state: Feature-based using React Hooks, Context API, and Zustand when needed.
- Server communication: Unified API client in `frontend/src/services/api.client.js`.
- Async jobs: Polling-based conversion progress updates with cancellation support.

## 3. Storage Separation
- Permanent storage: Cloudflare R2 for original and converted files.
- Metadata: MongoDB Atlas for user records, history entries, file links, and audit logs.
- Temporary storage: Local disk buffers (`backend/storage/temp/`) strictly purged after job completion.

## 4. Component Library
- Use shadcn/ui + Radix UI for accessible UI components.
- Use React Icons for interface icons.
- Use Framer Motion for animations and transitions.
- Use TanStack Table for data tables.
- Use React Hook Form + Zod for form handling and validation.
