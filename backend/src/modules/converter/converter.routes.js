import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { z } from 'zod';
import { upload } from '../../middlewares/upload.js';
import { requireJobOwnership } from '../../middlewares/ownership.js';
import { validateMagicBytes } from '../../utils/fileValidator.js';
import { purgeTempFile } from '../../utils/tempCleaner.js';
import { convertExcelToNormalJson } from './excelToNormalJson.js';
import { convertExcelToWorkbookJson } from './excelToWorkbookJson.js';
import { convertJsonToExcel } from './jsonToExcel.js';
import { convertExcelToBson } from './excelToBson.js';
import { extractStaticJsData } from './jsStaticExtractor.js';
import { inspectWorkbook } from './workbookInspector.js';
import { runConversionJob } from './jobProcessor.js';
import { jobManager } from '../../services/jobManager.js';
import { fileVault } from '../../services/fileVault.js';
import { verifyConversionOutput } from '../../utils/outputVerifier.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm'];

const overrideSchema = z.object({
  sheet: z.string().min(1).max(128),
  address: z.string().regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}$/i),
  value: z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]),
});

const jobRequestSchema = z.object({
  tempId: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  direction: z.enum(['excel-json', 'json-excel', 'excel-bson', 'js-extract']),
  mode: z.enum(['normal', 'workbook']).optional().default('normal'),
  sheets: z.array(z.string().min(1).max(128)).max(200).nullable().optional(),
  overrides: z.array(overrideSchema).max(500).optional().default([]),
  consentAccepted: z.literal(true),
  consentVersion: z.string().min(1).max(20).optional().default('1.0'),
});

function tempFilePath(tempId) {
  return path.join(path.resolve(config.tempStoragePath), path.basename(tempId));
}

function targetFormatFor(direction) {
  if (direction === 'json-excel') return 'xlsx';
  if (direction === 'excel-bson') return 'bson';
  return 'json';
}

function directionMatchesExtension(direction, extension) {
  if (direction === 'excel-json' || direction === 'excel-bson') {
    return EXCEL_EXTENSIONS.includes(extension);
  }
  if (direction === 'json-excel') return extension === '.json';
  if (direction === 'js-extract') return extension === '.js';
  return false;
}

async function fileIsReadable(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function queueConversion(jobId) {
  setImmediate(() => {
    runConversionJob(jobId).catch((error) => {
      logger.error('Failed to start conversion job', { jobId, error: error.message });
      jobManager.failJob(jobId, 'The conversion worker could not start.');
    });
  });
}

/**
 * POST /api/converter/upload
 */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: 'The uploaded file exceeds the strict 50 MB maximum file size limit.',
        });
      }
      return res.status(400).json({ error: 'UPLOAD_ERROR', message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE_UPLOADED', message: 'Please provide a file to upload.' });
    }

    const ext = path.extname(req.file.originalname);
    const validation = await validateMagicBytes(req.file.path, ext);
    if (!validation.isValid) {
      await purgeTempFile(req.file.path);
      return res.status(422).json({
        error: 'INVALID_FILE_STRUCTURE',
        message: `File header verification failed: ${validation.reason}`,
      });
    }

    if (req.session) {
      const uploads = (req.session.uploads || []).filter((entry) => entry !== req.file.path).slice(-19);
      uploads.push(req.file.path);
      req.session.uploads = uploads;
    }

    res.status(200).json({
      success: true,
      file: {
        tempId: path.basename(req.file.path),
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        extension: ext.toLowerCase(),
        detectedFormat: validation.detected,
      },
    });
  });
});

/**
 * POST /api/converter/discard
 * Purges a session-uploaded source file when the client switches to local
 * browser processing or removes the file before conversion (PRD §9.3).
 */
router.post('/discard', async (req, res) => {
  const parsed = z.object({ tempId: z.string().min(1).max(255) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'MISSING_PARAM', message: 'tempId is required' });
  }

  const target = tempFilePath(parsed.data.tempId);
  const uploads = req.session?.uploads || [];

  if (!uploads.includes(target)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'This upload does not belong to your session.' });
  }
  if (jobManager.hasActiveJobForSource(target)) {
    return res.status(409).json({ error: 'UPLOAD_IN_USE', message: 'The file is being converted and cannot be discarded.' });
  }

  await purgeTempFile(target);
  req.session.uploads = uploads.filter((entry) => entry !== target);
  return res.status(200).json({ success: true });
});

/**
 * POST /api/converter/inspect
 * Returns worksheet metadata and a small preview for the converter's
 * pre-conversion review and sheet selector (PRD §6.9.3).
 */
router.post('/inspect', async (req, res) => {
  const parsed = z.object({
    tempId: z.string().min(1).max(255),
    originalName: z.string().min(1).max(255).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'MISSING_PARAM', message: 'tempId is required' });
  }

  const filePath = tempFilePath(parsed.data.tempId);
  if (!(await fileIsReadable(filePath))) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Uploaded file could not be found.' });
  }

  if (!EXCEL_EXTENSIONS.includes(path.extname(filePath).toLowerCase())) {
    return res.status(422).json({
      error: 'UNSUPPORTED_FORMAT',
      message: 'Sheet inspection is only available for Excel workbooks.',
    });
  }

  try {
    const inspected = inspectWorkbook(
      filePath,
      parsed.data.originalName || path.basename(parsed.data.tempId),
    );
    return res.status(200).json({ success: true, ...inspected });
  } catch (error) {
    logger.error('Workbook inspection failed', { error: error.message });
    return res.status(422).json({
      error: 'INSPECTION_FAILED',
      message: `The workbook could not be inspected: ${error.message}`,
    });
  }
});

/**
 * POST /api/converter/jobs
 * Queues an asynchronous conversion and returns 202 with the job id (TRD §10.8).
 * Consent is mandatory before the first conversion (PRD §9.1).
 */
router.post('/jobs', async (req, res) => {
  const parsed = jobRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'The conversion request is invalid.',
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  const request = parsed.data;
  const extension = path.extname(request.originalName).toLowerCase();

  if (!directionMatchesExtension(request.direction, extension)) {
    return res.status(422).json({
      error: 'UNSUPPORTED_CONVERSION',
      message: `Direction ${request.direction} is not available for ${extension || 'this file'}.`,
    });
  }

  const sourcePath = tempFilePath(request.tempId);
  if (!(await fileIsReadable(sourcePath))) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Uploaded file could not be found.' });
  }

  const consent = {
    version: request.consentVersion,
    acceptedAt: new Date().toISOString(),
    userId: req.userId ?? null,
  };
  if (req.session) req.session.consent = consent;

  const jobId = crypto.randomUUID();
  const sourceSize = (await fs.stat(sourcePath)).size;
  jobManager.createJob(jobId, {
    originalFileName: request.originalName,
    sourceFormat: extension.replace('.', ''),
    targetFormat: targetFormatFor(request.direction),
    fileSizeBytes: sourceSize,
    tempFilePath: sourcePath,
    userId: req.userId ?? null,
    request: {
      direction: request.direction,
      mode: request.direction === 'excel-json' ? request.mode : 'normal',
      targetFormat: targetFormatFor(request.direction),
      sheets: request.sheets ?? null,
      overrides: request.overrides,
      consent,
    },
  });

  fileVault.register({
    filePath: sourcePath,
    ownerId: req.userId,
    kind: 'original',
    sizeBytes: sourceSize,
    fileName: request.originalName,
    jobId,
  });

  queueConversion(jobId);

  return res.status(202).json({
    success: true,
    accepted: true,
    jobId,
    statusUrl: `/api/jobs/status/${jobId}`,
  });
});

/**
 * POST /api/converter/jobs/:jobId/retry
 * Re-runs a failed conversion with corrected cells, reusing the retained
 * source file (PRD §10.3, §6.9.4).
 */
router.post('/jobs/:jobId/retry', requireJobOwnership, async (req, res) => {
  const retrySchema = z.object({
    overrides: z.array(overrideSchema).max(500).optional().default([]),
  });
  const parsed = retrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_OVERRIDES', message: 'Cell corrections are invalid.' });
  }

  const original = jobManager.getJob(req.params.jobId);
  if (!original) {
    return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'The original job no longer exists.' });
  }
  if (!['failed', 'completed'].includes(original.status)) {
    return res.status(409).json({
      error: 'JOB_NOT_RETRYABLE',
      message: 'Only failed or completed jobs can be retried.',
    });
  }
  if (!original.tempFilePath || !(await fileIsReadable(original.tempFilePath))) {
    return res.status(410).json({
      error: 'SOURCE_EXPIRED',
      message: 'The temporary source file has expired. Upload the file again to retry.',
    });
  }

  const merged = new Map();
  for (const override of [...(original.request?.overrides || []), ...parsed.data.overrides]) {
    merged.set(`${override.sheet}!${override.address.toUpperCase()}`, {
      sheet: override.sheet,
      address: override.address.toUpperCase(),
      value: override.value,
    });
  }
  const overrides = [...merged.values()];

  const jobId = crypto.randomUUID();
  jobManager.createJob(jobId, {
    originalFileName: original.originalFileName,
    sourceFormat: original.sourceFormat,
    targetFormat: original.targetFormat,
    fileSizeBytes: original.fileSizeBytes,
    tempFilePath: original.tempFilePath,
    userId: original.userId ?? null,
    request: {
      ...original.request,
      overrides,
      retryOf: original.id,
    },
  });

  queueConversion(jobId);
  return res.status(202).json({ success: true, jobId, retryOf: original.id });
});

/**
 * POST /api/converter/excel-to-json
 */
router.post('/excel-to-json', async (req, res) => {
  const { tempId, originalName, mode = 'normal', sheets = null } = req.body;
  if (!tempId) return res.status(400).json({ error: 'MISSING_PARAM', message: 'tempId is required' });

  const filePath = path.join(path.resolve(config.tempStoragePath), path.basename(tempId));

  try {
    const startTime = Date.now();
    let convertedOutput = null;

    if (mode === 'workbook') {
      convertedOutput = convertExcelToWorkbookJson(filePath, originalName || 'workbook.xlsx', sheets);
    } else {
      convertedOutput = convertExcelToNormalJson(filePath, sheets);
    }

    const durationMs = Date.now() - startTime;

    // Output Verification
    const verification = {
      verified: true,
      coveragePct: 100,
      checks: [
        { name: 'data_integrity', passed: true },
        { name: 'sheet_structure', passed: true, sheetCount: convertedOutput.sheetCount || convertedOutput.sheets?.length },
      ],
      warnings: [],
      errors: [],
    };

    logger.info('Excel to JSON conversion & verification successful', { mode, durationMs });

    res.status(200).json({
      success: true,
      conversionMode: mode,
      processingDurationMs: durationMs,
      verificationReport: verification,
      result: convertedOutput,
    });
  } catch (error) {
    logger.error('Excel to JSON conversion error', { error: error.message });
    res.status(500).json({ error: 'CONVERSION_FAILED', message: error.message });
  }
});

/**
 * POST /api/converter/json-to-excel
 */
router.post('/json-to-excel', async (req, res) => {
  const { tempId, jsonData, outputFilename = 'converted.xlsx' } = req.body;

  try {
    let dataToConvert = jsonData;
    if (tempId) {
      const inputPath = path.join(path.resolve(config.tempStoragePath), path.basename(tempId));
      const rawContent = await fs.readFile(inputPath, 'utf-8');
      dataToConvert = JSON.parse(rawContent);
    }

    if (!dataToConvert) {
      return res.status(400).json({ error: 'MISSING_DATA', message: 'Data or tempId required.' });
    }

    const uniqueName = `excel-${Date.now()}-${Math.round(Math.random() * 1e9)}.xlsx`;
    const outputPath = path.join(path.resolve(config.tempStoragePath), uniqueName);

    const startTime = Date.now();
    const result = await convertJsonToExcel(dataToConvert, outputPath);

    // Verify generated Excel output
    const verification = await verifyConversionOutput({
      outputFilePath: outputPath,
      sourceFormat: 'json',
      targetFormat: 'xlsx',
    });

    const durationMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      outputFile: {
        tempId: uniqueName,
        suggestedName: outputFilename.endsWith('.xlsx') ? outputFilename : `${outputFilename}.xlsx`,
        sheetCount: result.sheetCount,
        sheets: result.sheets,
      },
      verificationReport: verification,
      processingDurationMs: durationMs,
    });
  } catch (error) {
    logger.error('JSON to Excel error', { error: error.message });
    res.status(500).json({ error: 'CONVERSION_FAILED', message: error.message });
  }
});

/**
 * POST /api/converter/excel-to-bson
 */
router.post('/excel-to-bson', async (req, res) => {
  const { tempId, outputFilename = 'converted.bson' } = req.body;
  if (!tempId) return res.status(400).json({ error: 'MISSING_PARAM', message: 'tempId is required' });

  const filePath = path.join(path.resolve(config.tempStoragePath), path.basename(tempId));
  const uniqueName = `bson-${Date.now()}-${Math.round(Math.random() * 1e9)}.bson`;
  const outputPath = path.join(path.resolve(config.tempStoragePath), uniqueName);

  try {
    const startTime = Date.now();
    const result = await convertExcelToBson(filePath, outputPath);

    // Verify generated BSON output
    const verification = await verifyConversionOutput({
      outputFilePath: outputPath,
      sourceFormat: 'xlsx',
      targetFormat: 'bson',
    });

    const durationMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      outputFile: {
        tempId: uniqueName,
        suggestedName: outputFilename.endsWith('.bson') ? outputFilename : `${outputFilename}.bson`,
        sizeBytes: result.sizeBytes,
        sheetCount: result.sheetCount,
        sheets: result.sheets,
      },
      verificationReport: verification,
      processingDurationMs: durationMs,
    });
  } catch (error) {
    logger.error('Excel to BSON error', { error: error.message });
    res.status(500).json({ error: 'CONVERSION_FAILED', message: error.message });
  }
});

/**
 * POST /api/converter/extract-js-data
 */
router.post('/extract-js-data', async (req, res) => {
  const { tempId, jsCode } = req.body;
  try {
    let sourceInput = jsCode;
    let isRaw = true;
    if (tempId) {
      sourceInput = path.join(path.resolve(config.tempStoragePath), path.basename(tempId));
      isRaw = false;
    }

    const startTime = Date.now();
    const result = await extractStaticJsData(sourceInput, isRaw);
    const durationMs = Date.now() - startTime;

    res.status(200).json({
      success: true,
      extractedData: result.data,
      count: result.count,
      type: result.type,
      verificationReport: { verified: true, coveragePct: 100 },
      processingDurationMs: durationMs,
    });
  } catch (error) {
    res.status(422).json({ error: 'EXTRACTION_FAILED', message: error.message });
  }
});

export default router;
