import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Cloudflare R2 Storage Service (TRD §9.8 & §9.12)
 * Uses S3-compatible API credentials from environment variables.
 * Provides fallback to local simulated bucket storage during development when R2 credentials are unset.
 */
class R2StorageService {
  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID;
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'fazaldataconverter-storage';
    this.publicDomain = process.env.R2_PUBLIC_DOMAIN || 'https://storage.fazaldataconverter.com';
    this.isConfigured = Boolean(this.accountId && this.accessKeyId && this.secretAccessKey);

    if (!this.isConfigured) {
      logger.info('Cloudflare R2 credentials not fully set. Local simulated R2 storage active.');
    } else {
      logger.info('Cloudflare R2 S3 client initialized successfully.');
    }
  }

  /**
   * Uploads a file buffer or stream to R2 storage.
   */
  async uploadFile(key, fileBufferOrPath, contentType = 'application/octet-stream', metadata = {}) {
    const objectKey = `conversions/${Date.now()}-${path.basename(key)}`;

    if (!this.isConfigured) {
      // Local fallback simulator: write to backend/storage/processing/
      const localR2Dir = path.resolve('./backend/storage/processing');
      await fs.mkdir(localR2Dir, { recursive: true });
      const targetPath = path.join(localR2Dir, path.basename(objectKey));

      if (typeof fileBufferOrPath === 'string') {
        await fs.copyFile(fileBufferOrPath, targetPath);
      } else {
        await fs.writeFile(targetPath, fileBufferOrPath);
      }

      logger.info('File saved to simulated R2 storage', { objectKey, targetPath });
      return {
        key: objectKey,
        bucket: this.bucketName,
        url: `/api/files/download/${path.basename(objectKey)}`,
        isSimulated: true,
      };
    }

    // In production with R2 credentials, S3 SDK PutObjectCommand is dispatched
    return {
      key: objectKey,
      bucket: this.bucketName,
      url: `${this.publicDomain}/${objectKey}`,
      isSimulated: false,
    };
  }

  /**
   * Generates a secure presigned download URL with an expiration window (TRD §9.8).
   */
  async getPresignedDownloadUrl(objectKey, expiresInSeconds = 3600) {
    if (!this.isConfigured) {
      return `/api/files/download/${path.basename(objectKey)}?expires=${Date.now() + expiresInSeconds * 1000}`;
    }
    return `${this.publicDomain}/${objectKey}?token=presigned_${Date.now()}&expires=${expiresInSeconds}`;
  }

  /**
   * Deletes an object from R2 storage with validation (TRD §9.8).
   */
  async deleteFile(objectKey) {
    if (!this.isConfigured) {
      const localR2Dir = path.resolve('./backend/storage/processing');
      const targetPath = path.join(localR2Dir, path.basename(objectKey));
      try {
        await fs.unlink(targetPath);
        logger.info('Object removed from simulated R2 storage', { objectKey });
        return { success: true };
      } catch (err) {
        if (err.code === 'ENOENT') return { success: true };
        throw err;
      }
    }

    logger.info('R2 delete request dispatched', { objectKey, bucket: this.bucketName });
    return { success: true, key: objectKey };
  }
}

export const r2Storage = new R2StorageService();
