import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

/**
 * Safely removes a file from local temporary processing storage.
 */
export async function purgeTempFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
    logger.info('Temporary processing file purged successfully', { filePath });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('Failed to purge temporary file', { filePath, error: error.message });
    }
  }
}
