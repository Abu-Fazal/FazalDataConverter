import mongoose from 'mongoose';

const conversionJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null, // null for guest jobs
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    sourceFormat: {
      type: String,
      enum: ['xlsx', 'xls', 'xlsm', 'json', 'js', 'bson'],
      required: true,
    },
    targetFormat: {
      type: String,
      enum: ['json', 'xlsx', 'bson'],
      required: true,
    },
    conversionMode: {
      type: String,
      enum: ['normal', 'workbook'],
      default: 'normal',
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      max: 52428800, // Strictly 50 MB
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    r2OriginalKey: {
      type: String,
      default: null,
    },
    r2ConvertedKey: {
      type: String,
      default: null,
    },
    processingDurationMs: {
      type: Number,
      default: 0,
    },
    verificationReport: {
      verified: { type: Boolean, default: false },
      supportedCoveragePct: { type: Number, default: 0 },
      warnings: [{ type: String }],
      errors: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

export const ConversionJob = mongoose.model('ConversionJob', conversionJobSchema);
