import fs from 'node:fs';

// The upload middleware derives its temp directory from TEMP_STORAGE_PATH.
// Create it before any backend module is imported.
const tempDir = process.env.TEMP_STORAGE_PATH || 'tests/.tmp-storage';
fs.mkdirSync(tempDir, { recursive: true });