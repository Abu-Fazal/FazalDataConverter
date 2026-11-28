import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const PREVIEW_ROW_LIMIT = 8;

function normalizeCellValue(cell) {
  if (!cell || cell.v === undefined) return null;

  if (cell.t === 'd' && cell.v instanceof Date) return cell.v.toISOString();
  if (cell.t === 'e') return null;

  return cell.v;
}

function cellType(cell) {
  if (!cell || cell.v === undefined) return 'empty';
  if (cell.t === 'n') return 'number';
  if (cell.t === 'b') return 'boolean';
  if (cell.t === 'd') return 'date';
  if (cell.t === 'e') return 'error';
  return 'string';
}

function sheetVisibility(workbook, sheetName, index) {
  const meta = workbook.Workbook?.Sheets?.find((entry) => entry.name === sheetName)
    || workbook.Workbook?.Sheets?.[index];
  if (!meta) return 'visible';
  if (meta.Hidden === 2) return 'veryHidden';
  if (meta.Hidden === 1) return 'hidden';
  return 'visible';
}

/**
 * Reads workbook structure for the converter's pre-conversion review and
 * sheet selector (PRD §6.9.3, TRD §7.3).
 */
export function inspectWorkbook(filePath, originalName = 'workbook.xlsx') {
  const workbook = xlsx.readFile(filePath, {
    cellFormula: true,
    cellDates: true,
    cellStyles: true,
    dense: false,
  });

  const stats = fs.statSync(filePath);
  const sheets = [];
  const previews = {};

  let totalRows = 0;
  let totalCells = 0;
  let totalFormulaCells = 0;
  let totalMissingCachedFormulas = 0;

  workbook.SheetNames.forEach((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const visibility = sheetVisibility(workbook, sheetName, index);

    if (!worksheet || !worksheet['!ref']) {
      sheets.push({
        name: sheetName,
        index,
        visibility,
        dataRows: 0,
        columns: 0,
        dimension: 'A1:A1',
        formulaCells: 0,
        missingCachedFormulas: 0,
      });
      previews[sheetName] = { headers: [], rows: [] };
      return;
    }

    const range = xlsx.utils.decode_range(worksheet['!ref']);
    let formulaCells = 0;
    let missingCachedFormulas = 0;

    for (let R = range.s.r; R <= range.e.r; R += 1) {
      for (let C = range.s.c; C <= range.e.c; C += 1) {
        const address = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[address];

        if (cell?.f) {
          formulaCells += 1;
          totalFormulaCells += 1;
          if (cell.v === undefined) {
            missingCachedFormulas += 1;
            totalMissingCachedFormulas += 1;
          }
        }

        if (!cell || cell.v === undefined) continue;
        totalCells += 1;
      }
    }

    const dataRows = Math.max(0, range.e.r - range.s.r);
    totalRows += dataRows;

    sheets.push({
      name: sheetName,
      index,
      visibility,
      dataRows,
      columns: range.e.c - range.s.c + 1,
      dimension: worksheet['!ref'],
      formulaCells,
      missingCachedFormulas,
    });

    const headers = [];
    for (let C = range.s.c; C <= range.e.c; C += 1) {
      const address = xlsx.utils.encode_cell({ r: range.s.r, c: C });
      const cell = worksheet[address];
      const fallback = `Column_${C + 1}`;
      headers.push({
        address,
        column: xlsx.utils.encode_col(C),
        value: cell && cell.v !== undefined ? String(cell.v) : fallback,
        type: cellType(cell),
      });
    }

    const previewRows = [];
    const lastRow = Math.min(range.e.r, range.s.r + PREVIEW_ROW_LIMIT);
    for (let R = range.s.r + 1; R <= lastRow; R += 1) {
      const cells = [];
      for (let C = range.s.c; C <= range.e.c; C += 1) {
        const address = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[address];
        cells.push({
          address,
          column: xlsx.utils.encode_col(C),
          value: normalizeCellValue(cell),
          type: cellType(cell),
        });
      }
      previewRows.push({ index: R + 1, cells });
    }

    previews[sheetName] = { headers, rows: previewRows };
  });

  return {
    file: {
      name: originalName,
      sizeBytes: stats.size,
      extension: path.extname(originalName).replace('.', '').toLowerCase(),
      sheetCount: workbook.SheetNames.length,
    },
    stats: {
      dataRows: totalRows,
      cells: totalCells,
      formulaCells: totalFormulaCells,
      missingCachedFormulas: totalMissingCachedFormulas,
    },
    sheets,
    previews,
  };
}