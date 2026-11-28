import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

const DEFAULT_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB combined quota (TRD §9.7)

/**
 * In-memory metadata registry for registered-user stored files (TRD §9.3.4, §9.8).
 * History records and physical files are decoupled (PRD §7.3): deleting a history
 * entry or clearing history keeps vault records, so storage usage stays accurate.
 */
class FileVault {
  constructor() {
    this.files = new Map();
  }

  register({ filePath, ownerId, kind, sizeBytes = 0, fileName = '', jobId = null }) {
    if (!filePath || ownerId == null) return null;
    const record = {
      path: filePath,
      ownerId: String(ownerId),
      kind,
      sizeBytes,
      fileName,
      jobId,
      storedAt: new Date().toISOString(),
    };
    this.files.set(filePath, record);
    return record;
  }

  get(filePath) {
    return filePath ? this.files.get(filePath) || null : null;
  }

  has(filePath) {
    return Boolean(this.get(filePath));
  }

  listForOwner(ownerId) {
    if (ownerId == null) return [];
    return [...this.files.values()].filter((record) => record.ownerId === String(ownerId));
  }

  statsForOwner(ownerId) {
    const records = this.listForOwner(ownerId);
    const originals = records.filter((record) => record.kind === 'original');
    const outputs = records.filter((record) => record.kind === 'output');
    const originalBytes = originals.reduce((sum, record) => sum + record.sizeBytes, 0);
    const outputBytes = outputs.reduce((sum, record) => sum + record.sizeBytes, 0);

    return {
      originalCount: originals.length,
      outputCount: outputs.length,
      objectCount: records.length,
      originalBytes,
      outputBytes,
      usedBytes: originalBytes + outputBytes,
      quotaBytes: DEFAULT_QUOTA_BYTES,
    };
  }

  /**
   * Admin-only aggregate across all owners (PRD §8.1 system storage figure).
   */
  totalStats() {
    const records = [...this.files.values()];
    const originalBytes = records
      .filter((record) => record.kind === 'original')
      .reduce((sum, record) => sum + record.sizeBytes, 0);
    const outputBytes = records
      .filter((record) => record.kind === 'output')
      .reduce((sum, record) => sum + record.sizeBytes, 0);

    return {
      objectCount: records.length,
      ownerCount: new Set(records.map((record) => record.ownerId)).size,
      originalBytes,
      outputBytes,
      usedBytes: originalBytes + outputBytes,
      quotaBytes: DEFAULT_QUOTA_BYTES,
    };
  }

  /**
   * Removes a stored object and deletes the physical file first (TRD §9.8).
   * The metadata record is kept when deletion fails so the request can be retried.
   */
  async remove(filePath) {
    const record = this.get(filePath);
    if (!record) return { removed: false, reason: 'NOT_TRACKED' };

    if (!filePath.startsWith('memory:')) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.error('Vault file deletion failed', { filePath, error: error.message });
          return { removed: false, reason: 'PURGE_FAILED' };
        }
      }
    }

    this.files.delete(filePath);
    return { removed: true };
  }

  async purgeOwner(ownerId) {
    const records = this.listForOwner(ownerId);
    for (const record of records) {
      await this.remove(record.path);
    }
    return records.length;
  }

  clear() {
    this.files.clear();
  }
}

export const fileVault = new FileVault();
export { DEFAULT_QUOTA_BYTES };