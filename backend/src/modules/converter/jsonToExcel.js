import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

/**
 * Flattens nested object properties into dotted paths: e.g. { address: { city: 'Delhi' } } -> { 'address.city': 'Delhi' }
 * Arrays are serialized as JSON strings per TRD §7.8.
 */
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, val] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      Object.assign(result, flattenObject(val, fullPath));
    } else if (Array.isArray(val)) {
      result[fullPath] = JSON.stringify(val); // Arrays preserved as JSON text
    } else {
      result[fullPath] = val;
    }
  }

  return result;
}

/**
 * Converts JSON data (or Workbook JSON) into a styled Excel (.xlsx) file.
 * Handles Root Array, Root Object, Multi-sheet Object, and Workbook JSON structure.
 */
export async function convertJsonToExcel(jsonData, outputPath, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FazalDataConverter';
  workbook.created = new Date();

  // Case A: Structured Workbook JSON format (TRD §8)
  if (jsonData && jsonData.schemaVersion && Array.isArray(jsonData.sheets)) {
    for (const sheetDef of jsonData.sheets) {
      const sheetName = sheetDef.name || 'Sheet1';
      const worksheet = workbook.addWorksheet(sheetName);

      if (Array.isArray(sheetDef.rows)) {
        for (const rowDef of sheetDef.rows) {
          if (Array.isArray(rowDef.cells)) {
            for (const cellDef of rowDef.cells) {
              if (cellDef.address) {
                const cell = worksheet.getCell(cellDef.address);
                if (cellDef.formula) {
                  cell.value = { formula: cellDef.formula, result: cellDef.value };
                } else {
                  cell.value = cellDef.value;
                }
              }
            }
          }
        }
      }

      // Restore merged ranges
      if (Array.isArray(sheetDef.mergedRanges)) {
        for (const range of sheetDef.mergedRanges) {
          try {
            worksheet.mergeCells(range);
          } catch (e) {
            // Ignore range collision warnings safely
          }
        }
      }
    }
  }
  // Case B: Multi-sheet Normal Data JSON: { "Sheet1": [...], "Sheet2": [...] }
  else if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData) && Object.values(jsonData).every((v) => Array.isArray(v))) {
    for (const [sheetName, rows] of Object.entries(jsonData)) {
      populateSheetWithArray(workbook.addWorksheet(sheetName), rows);
    }
  }
  // Case C: Root Array of objects
  else if (Array.isArray(jsonData)) {
    const worksheet = workbook.addWorksheet('Data');
    populateSheetWithArray(worksheet, jsonData);
  }
  // Case D: Single Root Object
  else if (jsonData && typeof jsonData === 'object') {
    const worksheet = workbook.addWorksheet('Data');
    populateSheetWithArray(worksheet, [jsonData]);
  }
  // Case E: Root Primitive (stored in cell A1 per TRD §7.8)
  else {
    const worksheet = workbook.addWorksheet('Data');
    worksheet.getCell('A1').value = jsonData;
  }

  await workbook.xlsx.writeFile(outputPath);
  return {
    outputPath,
    sheetCount: workbook.worksheets.length,
    sheets: workbook.worksheets.map((s) => s.name),
  };
}

/**
 * Populates a worksheet from an array of objects:
 * Creates unique column header union, flattens nested objects, applies standard header styling.
 */
function populateSheetWithArray(worksheet, arrayData) {
  if (!arrayData || arrayData.length === 0) {
    return;
  }

  const flattenedRows = arrayData.map((item) => (typeof item === 'object' && item !== null ? flattenObject(item) : { Value: item }));

  // Collect union of all unique headers across all rows
  const headerSet = new Set();
  flattenedRows.forEach((row) => {
    Object.keys(row).forEach((k) => headerSet.add(k));
  });
  const headers = Array.from(headerSet);

  // Set columns with standard width
  worksheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.max(h.length + 4, 12),
  }));

  // Style Header Row (TRD §5 Design Token Primary Soft & Dark Text)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FF151525' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEEF2FF' }, // Primary Soft
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 26;

  // Add Data Rows
  flattenedRows.forEach((row) => {
    worksheet.addRow(row);
  });
}
