import xlsx from 'xlsx';
import path from 'path';
import { applyCellOverrides } from './cellOverrides.js';

/**
 * Converts Excel workbook to structured Workbook JSON (TRD §7.6.B & §8.1-§8.8)
 * Preserves schemaVersion, workbook-level metadata, sheet order, dimensions,
 * cell types, formulas, and styles.
 */
export function convertExcelToWorkbookJson(
  filePath,
  originalFilename = 'workbook.xlsx',
  selectedSheets = null,
  overrides = [],
) {
  const workbook = xlsx.readFile(filePath, {
    cellFormula: true,
    cellDates: true,
    cellStyles: true,
    dense: false,
  });

  const targetSheetNames = selectedSheets && selectedSheets.length > 0
    ? workbook.SheetNames.filter((name) => selectedSheets.includes(name))
    : workbook.SheetNames;

  const sheetsData = [];

  for (let sIdx = 0; sIdx < targetSheetNames.length; sIdx++) {
    const sheetName = targetSheetNames[sIdx];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet || !worksheet['!ref']) {
      sheetsData.push({
        name: sheetName,
        index: sIdx,
        visibility: 'visible',
        dimension: 'A1:A1',
        rows: [],
        mergedRanges: [],
      });
      continue;
    }

    applyCellOverrides(worksheet, overrides, sheetName);

    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const rows = [];

    // Merged ranges extraction
    const mergedRanges = (worksheet['!merges'] || []).map((m) => xlsx.utils.encode_range(m));

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cells = [];
      let isRowEmpty = true;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[address];

        if (cell && cell.v !== undefined) {
          isRowEmpty = false;
          let cellType = 'string';
          let val = cell.v;

          if (cell.t === 'n') cellType = 'number';
          else if (cell.t === 'b') cellType = 'boolean';
          else if (cell.t === 'd') {
            cellType = 'date';
            val = cell.v instanceof Date ? cell.v.toISOString() : cell.v;
          } else if (cell.t === 'e') {
            cellType = 'error';
            val = null;
          }

          cells.push({
            address,
            value: val,
            type: cellType,
            formula: cell.f || null,
            style: cell.s || null,
          });
        }
      }

      if (!isRowEmpty) {
        rows.push({
          index: R + 1, // 1-based Excel row index
          cells,
        });
      }
    }

    sheetsData.push({
      name: sheetName,
      index: sIdx,
      visibility: 'visible',
      dimension: worksheet['!ref'],
      rows,
      mergedRanges,
    });
  }

  return {
    schemaVersion: '1.0.0', // Mandatory semver (TRD §8.2)
    workbook: {
      name: originalFilename,
      dateSystem: workbook.Workbook?.WBProps?.date1904 ? '1904' : '1900',
      sheetCount: targetSheetNames.length,
      sourceFormat: path.extname(originalFilename).replace('.', '').toLowerCase(),
    },
    sheets: sheetsData,
    metadata: {
      generatedAt: new Date().toISOString(),
      converter: 'FazalDataConverter Core Engine v1.0.0',
    },
  };
}
