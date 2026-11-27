import express from 'express';
import path from 'path';
import fs from 'fs';
import { r2Storage } from '../../services/r2Storage.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/files/download/:filename
 * Serves converted files or redirects to Cloudflare R2 presigned URL.
 */
router.get('/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);

  // 1. Check local simulated R2 processing directory
  const localR2Path = path.resolve('./backend/storage/processing', safeFilename);
  const tempPath = path.resolve('./backend/storage/temp', safeFilename);

  if (fs.existsSync(localR2Path)) {
    return res.download(localR2Path, safeFilename);
  }

  if (fs.existsSync(tempPath)) {
    return res.download(tempPath, safeFilename);
  }

  // 2. If using live Cloudflare R2, redirect to presigned URL
  try {
    const presignedUrl = await r2Storage.getPresignedDownloadUrl(`conversions/${safeFilename}`);
    if (!r2Storage.isConfigured) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'The requested file could not be found.' });
    }
    return res.redirect(presignedUrl);
  } catch (error) {
    logger.error('Failed to resolve download URL', { filename, error: error.message });
    return res.status(500).json({ error: 'DOWNLOAD_FAILED', message: 'Could not generate download link.' });
  }
});

export default router;
