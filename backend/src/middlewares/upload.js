import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

// Ensure temp storage directory exists
const tempDir = path.resolve(config.tempStoragePath);
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Disk storage with safe random unique file names
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

// File filter based on supported formats (PRD §6.1)
const allowedExtensions = ['.xlsx', '.xls', '.xlsm', '.json', '.js', '.bson'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`UNSUPPORTED_FORMAT: File type ${ext} is not supported. Supported: ${allowedExtensions.join(', ')}`));
  }
};

// Strictly enforce 50 MB file size limit (PRD §2.3, TRD §3.3)
export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeBytes, // 52,428,800 bytes
    files: 1, // Single file upload per job
  },
  fileFilter,
});
