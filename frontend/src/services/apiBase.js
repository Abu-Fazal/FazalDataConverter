/**
 * Base URL for all frontend → backend API calls.
 * Local dev uses the Vite proxy (`/api`); production sets VITE_API_URL to the
 * deployed backend origin, e.g. https://fazaldataconverter-api.vercel.app/api.
 */
export const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '');