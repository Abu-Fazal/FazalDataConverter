import fs from 'fs/promises';
import path from 'path';
import xlsx from 'xlsx';
import { applyCellOverrides } from './cellOverrides.js';

const MAX_DIAGNOSTICS = 250;

function diagnostic(severity, code, detail, extra = {}) {
  return {
    severity,
    code,
    sheet: extra.sheet || null,
    address: extra.address || null,
    row: extra.row || null,
    column: extra.column || null,
    header: extra.header || null,
    affectedValue: extra.affectedValue ?? null,
    detail,
    resolution: extra.resolution || null,
  };
}

function buildCounts(diagnostics, totalElements) {
  const counts = { totalElements, fatal: 0, recoverable: 0, warnings: 0 };
  for (const item of diagnostics) {
    if (item.severity === 'fatal') counts.fatal += 1;
    else if (item.severity === 'recoverable') counts.recoverable += 1;
    else counts.warnings += 1;
  }
  return counts;
}

function integrityScore(counts) {
  if (counts.fatal > 0) return 0;
  const total = Math.max(counts.totalElements, 1);
  const recoverablePenalty = (counts.recoverable / total) * 100 * 0.5;
  const warningPenalty = Math.min(counts.warnings * 0.01, 1);
  return Math.max(0, Math.round((100 - recoverablePenalty - warningPenalty) * 100) / 100);
}

function finish(diagnostics, totalElements) {
  const trimmed = diagnostics.slice(0, MAX_DIAGNOSTICS);
  const counts = buildCounts(trimmed, totalElements);
  return {
    diagnostics: trimmed,
    counts,
    integrityScore: integrityScore(counts),
    truncated: diagnostics.length > MAX_DIAGNOSTICS,
  };
}

/**
 * Validation engine for Excel inputs (TRD §7.16, §7.21 steps 2-7).
 * Fatal issues stop the job; recoverable and warning issues are reported and
 * the valid data continues through conversion.
 */
export function validateWorkbook(filePath, originalName = 'workbook.xlsx', overrides = []) {
  let workbook;

  try {
    workbook = xlsx.readFile(filePath, {
      cellFormula: true,
      cellDates: true,
      cellStyles: true,
      dense: false,
    });
  } catch (error) {
    return finish(
      [
        diagnostic('fatal', 'ERR_UNREADABLE_WORKBOOK', `The workbook could not be parsed: ${error.message}`, {
          resolution: 'Verify the file opens in Excel and upload it again.',
        }),
      ],
      0,
    );
  }

  const diagnostics = [];
  let totalElements = 0;

  const extension = path.extname(originalName).replace('.', '').toLowerCase();
  if (extension === 'xlsm') {
    diagnostics.push(
      diagnostic(
        'warning',
        'WARN_VBA_MACRO_EXCLUDED',
        'The workbook contains VBA macros. Macros are excluded and never executed during conversion.',
        { resolution: 'Sanitized output is safe for serverless ingestion.' },
      ),
    );
  }

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) continue;

    if (overrides.length > 0) applyCellOverrides(worksheet, overrides, sheetName);

    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const headerCounts = new Map();

    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const address = xlsx.utils.encode_cell({ r: range.s.r, c: C });
      const cell = worksheet[address];
      const rawHeader = cell && cell.v !== undefined ? String(cell.v).trim() : '';
      const header = rawHeader || `Column_${C + 1}`;

      if (!rawHeader) {
        diagnostics.push(
          diagnostic('warning', 'WARN_EMPTY_HEADER', `Blank header replaced with ${header}.`, {
            sheet: sheetName,
            address,
            row: range.s.r + 1,
            column: xlsx.utils.encode_col(C),
            affectedValue: null,
            resolution: `Generated deterministic key ${header}.`,
          }),
        );
      }

      const seen = headerCounts.get(header) || 0;
      if (seen > 0) {
        const uniqueHeader = `${header}_${seen + 1}`;
        diagnostics.push(
          diagnostic(
            'recoverable',
            'ERR_DUPLICATE_KEY',
            `Duplicate header "${header}" was mapped to "${uniqueHeader}".`,
            {
              sheet: sheetName,
              address,
              row: range.s.r + 1,
              column: xlsx.utils.encode_col(C),
              header: uniqueHeader,
              affectedValue: rawHeader,
              resolution: 'Deterministic collision rule applied automatically.',
            },
          ),
        );
      }
      headerCounts.set(header, seen + 1);
    }

    for (let R = range.s.r + 1; R <= range.e.r; R += 1) {
      for (let C = range.s.c; C <= range.e.c; C += 1) {
        const address = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[address];
        if (!cell) continue;

        if (cell.v !== undefined || cell.f) totalElements += 1;

        if (cell.f && cell.v === undefined) {
          diagnostics.push(
            diagnostic('warning', 'WARN_MISSING_CACHED_FORMULA', 'Cached formula result is missing.', {
              sheet: sheetName,
              address,
              row: R + 1,
              column: xlsx.utils.encode_col(C),
              affectedValue: cell.f,
              resolution: 'Value written as null with the formula string preserved.',
            }),
          );
          continue;
        }

        if (cell.t === 'e') {
          diagnostics.push(
            diagnostic('recoverable', 'ERR_CELL_ERROR', 'Excel error value found in a data cell.', {
              sheet: sheetName,
              address,
              row: R + 1,
              column: xlsx.utils.encode_col(C),
              affectedValue: cell.w || '#ERROR',
              resolution: 'Cell is converted to null and highlighted for inline edit.',
            }),
          );
          continue;
        }

        const headerCell = worksheet[xlsx.utils.encode_cell({ r: range.s.r, c: C })];
        const headerText = headerCell && headerCell.v !== undefined ? String(headerCell.v) : '';
        const strictObjectIdField = /^_?id$/i.test(headerText);
        const looksLikeObjectIdField = strictObjectIdField || /(^|_)id$/i.test(headerText) || /Id$/.test(headerText);

        if (looksLikeObjectIdField && typeof cell.v === 'string') {
          const candidate = cell.v.trim();
          const plausibleIdentifier = candidate.length >= 6
            && candidate.length <= 40
            && /^[A-Za-z0-9_-]+$/.test(candidate);
          const needsHexCheck = strictObjectIdField || candidate.includes('-');

          if (needsHexCheck && plausibleIdentifier && !/^[0-9a-fA-F]{24}$/.test(candidate)) {
            diagnostics.push(
              diagnostic(
                'recoverable',
                'ERR_INVALID_OBJECTID',
                'ObjectId field is not a 24-character hexadecimal string.',
                {
                  sheet: sheetName,
                  address,
                  row: R + 1,
                  column: xlsx.utils.encode_col(C),
                  header: headerText,
                  affectedValue: candidate,
                  resolution: 'Edit the cell to a valid 24-character ObjectId and revalidate.',
                },
              ),
            );
          }
        }
      }
    }
  }

  if (totalElements === 0) {
    diagnostics.push(
      diagnostic('warning', 'WARN_NO_DATA_ROWS', 'The workbook does not contain data rows below its headers.', {
        resolution: 'The sheet is converted as an empty dataset.',
      }),
    );
  }

  return finish(diagnostics, totalElements);
}

/**
 * Validation for uploaded JSON inputs.
 */
export async function validateJsonInput(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    return finish(
      [diagnostic('fatal', 'ERR_UNREADABLE_JSON', `The JSON file could not be read: ${error.message}`)],
      0,
    );
  }

  try {
    const parsed = JSON.parse(raw);
    const totalElements = Array.isArray(parsed)
      ? parsed.length
      : parsed && typeof parsed === 'object'
        ? Object.keys(parsed).length
        : 1;

    const diagnostics = [];
    if (typeof parsed !== 'object' || parsed === null) {
      diagnostics.push(
        diagnostic(
          'warning',
          'WARN_PRIMITIVE_ROOT',
          'Root JSON value is a primitive and will be written to cell A1.',
          { resolution: 'Primitive value preserved exactly as provided.' },
        ),
      );
    }

    return finish(diagnostics, totalElements);
  } catch (error) {
    return finish(
      [
        diagnostic('fatal', 'ERR_INVALID_JSON', `The JSON file is not valid: ${error.message}`, {
          resolution: 'Fix the JSON syntax and upload the file again.',
        }),
      ],
      0,
    );
  }
}