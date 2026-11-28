import ExcelJS from 'exceljs';

export async function xlsxBuffer({
  sheetName = 'Sheet1',
  rows = [
    ['Name', 'Amount', 'Active'],
    ['Alpha', 1250, true],
    ['Beta', 87.5, false],
  ],
} = {}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function jsonBuffer(data = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]) {
  return Buffer.from(JSON.stringify(data), 'utf8');
}

export const STATIC_JS_DATA = 'const data = [{ id: 1, name: "Alpha" }, { id: 2, name: "Beta" }];';

export function textBuffer(sizeBytes = 600 * 1024) {
  return Buffer.alloc(sizeBytes, 0x41);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}