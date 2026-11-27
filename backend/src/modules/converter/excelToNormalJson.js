import xlsx from 'xlsx';

/**
 * Converts Excel workbook to Normal Data JSON (TRD §7.6.A & PRD §6.2)
 * - Worksheet name becomes root key
 * - First row treated as headers
 * - Duplicate headers disambiguated (Name, Name_2)
 * - Blank headers generated (Column_X)
 * - Fully empty rows skipped
 * - Formula values taken from cached results
 */
export function convertExcelToNormalJson(filePath, selectedSheets = null) {
  const workbook = xlsx.readFile(filePath, {
    cellFormula: true,
    cellDates: true,
    cellStyles: true,
    dense: false,
  });

  const targetSheetNames = selectedSheets && selectedSheets.length > 0
    ? workbook.SheetNames.filter((name) => selectedSheets.includes(name))
    : workbook.SheetNames;

  const result = {};

  for (const sheetName of targetSheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) {
      result[sheetName] = [];
      continue;
    }

    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const headers = [];
    const headerCounts = {};

    // 1. Process Header Row (First Row)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = xlsx.utils.encode_cell({ r: range.s.r, c: C });
      const cell = worksheet[cellAddress];
      let rawHeader = cell && cell.v !== undefined ? String(cell.v).trim() : '';

      if (!rawHeader) {
        rawHeader = `Column_${C + 1}`;
      }

      if (headerCounts[rawHeader]) {
        headerCounts[rawHeader] += 1;
        headers.push(`${rawHeader}_${headerCounts[rawHeader]}`);
      } else {
        headerCounts[rawHeader] = 1;
        headers.push(rawHeader);
      }
    }

    // 2. Process Data Rows
    const rows = [];
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      let isRowEmpty = true;
      const rowObj = {};

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerKey = headers[C - range.s.c];
        const cellAddress = xlsx.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];

        let value = null;
        if (cell && cell.v !== undefined) {
          isRowEmpty = false;
          // Format handling: Dates as ISO strings, numbers as numbers, nulls as null
          if (cell.t === 'd' && cell.v instanceof Date) {
            value = cell.v.toISOString();
          } else if (cell.t === 'e') {
            // Excel cell error: value is null per TRD §7.3
            value = null;
          } else {
            value = cell.v;
          }
        }

        rowObj[headerKey] = value;
      }

      // Skip fully empty rows (TRD §7.3)
      if (!isRowEmpty) {
        rows.push(rowObj);
      }
    }

    result[sheetName] = rows;
  }

  return {
    mode: 'normal',
    data: result,
    sheetCount: targetSheetNames.length,
    sheets: targetSheetNames,
  };
}
