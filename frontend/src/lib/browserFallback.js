/**
 * Dependency-free XLSX to Normal Data JSON conversion for the consented
 * browser fallback path (PRD §6.8, TRD §7.14).
 *
 * Reads the XLSX ZIP container and worksheet XML directly; no code from the
 * uploaded file is evaluated and nothing leaves the browser.
 */

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function hasDecompressionStream() {
  return typeof DecompressionStream === 'function';
}

export function getBrowserFallbackEligibility(file, { direction = 'excel-json', mode = 'normal' } = {}) {
  if (!file) return { eligible: false, reason: 'Select a source file first.' };

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'xlsx') {
    return { eligible: false, reason: 'Browser fallback supports .xlsx files only.' };
  }
  if (direction !== 'excel-json') {
    return { eligible: false, reason: 'Browser fallback currently supports Excel to JSON only.' };
  }
  if (mode !== 'normal') {
    return { eligible: false, reason: 'Browser fallback supports Normal Data JSON only.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { eligible: false, reason: 'The file exceeds the 50 MB limit.' };
  }
  if (!hasDecompressionStream()) {
    return { eligible: false, reason: 'This browser cannot decompress XLSX data locally.' };
  }

  return { eligible: true, reason: null };
}

function readZip(buffer) {
  const view = new DataView(buffer);
  let eocdOffset = -1;
  const minimum = Math.max(0, view.byteLength - 65557);

  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) throw new Error('The file is not a valid XLSX archive.');

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let cursor = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;

    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buffer, cursor + 46, nameLength));

    entries.set(name, { method, compressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return { entries, buffer };
}

async function readEntry(zip, name) {
  const entry = zip.entries.get(name);
  if (!entry) return null;

  const view = new DataView(zip.buffer);
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) {
    throw new Error('The XLSX archive has a corrupt entry.');
  }

  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const bytes = new Uint8Array(zip.buffer, start, entry.compressedSize);

  if (entry.method === 0) return new TextDecoder().decode(bytes);
  if (entry.method !== 8) throw new Error('The XLSX archive uses unsupported compression.');

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

function parseXml(text, label) {
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`The ${label} XML could not be parsed.`);
  }
  return document;
}

function elementText(element) {
  let text = '';
  for (const node of element.getElementsByTagName('t')) {
    text += node.textContent || '';
  }
  return text;
}

function columnIndexFromAddress(address) {
  const letters = address.replace(/[0-9]/g, '').toUpperCase();
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
}

function rowNumberFromAddress(address) {
  const match = address.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function coerceOverride(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === '') return null;
  if (text.toLowerCase() === 'true') return true;
  if (text.toLowerCase() === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text) && text.length <= 15) return Number(text);
  return String(raw);
}

function buildSharedStrings(document) {
  const shared = [];
  for (const item of document.getElementsByTagName('si')) {
    shared.push(elementText(item));
  }
  return shared;
}

function resolveSheetTarget(target) {
  if (target.startsWith('/')) return target.slice(1);
  if (target.startsWith('xl/')) return target;
  return `xl/${target.replace(/^\.\//, '')}`;
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute('t') || 'n';
  const valueNode = cell.getElementsByTagName('v')[0];
  const raw = valueNode ? valueNode.textContent : null;

  if (type === 'inlineStr') {
    const inline = cell.getElementsByTagName('is')[0];
    return inline ? elementText(inline) : null;
  }
  if (raw === null || raw === '') return null;
  if (type === 's') return sharedStrings[Number(raw)] ?? null;
  if (type === 'b') return raw === '1';
  if (type === 'e') return null;
  if (type === 'str' || type === 'd') return raw;

  const number = Number(raw);
  return Number.isFinite(number) ? number : raw;
}

function applyOverride(overrides, sheetName, address, value) {
  const key = `${sheetName}!${address.toUpperCase()}`;
  return overrides.has(key) ? coerceOverride(overrides.get(key)) : value;
}

function rowsToNormalData(sheetName, rows, maxColumns, overrides) {
  if (rows.length === 0) return { rows: [], totalCells: 0 };

  const headerRowIndex = Math.min(...rows.map((row) => row.index));
  const headerRow = rows.find((row) => row.index === headerRowIndex);
  const headers = [];
  const headerCounts = new Map();

  for (let column = 0; column < maxColumns; column += 1) {
    const address = `${columnToLetters(column)}${headerRowIndex}`;
    const rawValue = applyOverride(overrides, sheetName, address, headerRow?.cells.get(column) ?? null);
    let header = rawValue === null || rawValue === undefined ? '' : String(rawValue).trim();
    if (!header) header = `Column_${column + 1}`;

    const seen = headerCounts.get(header) || 0;
    headerCounts.set(header, seen + 1);
    headers.push(seen === 0 ? header : `${header}_${seen + 1}`);
  }

  const data = [];
  let totalCells = 0;

  for (const row of rows) {
    if (row.index <= headerRowIndex) continue;

    const record = {};
    let hasValue = false;

    for (let column = 0; column < maxColumns; column += 1) {
      const address = `${columnToLetters(column)}${row.index}`;
      const value = applyOverride(overrides, sheetName, address, row.cells.get(column) ?? null);
      if (value !== null && value !== undefined) {
        hasValue = true;
        totalCells += 1;
      }
      record[headers[column]] = value ?? null;
    }

    if (hasValue) data.push(record);
  }

  return { rows: data, totalCells };
}

function columnToLetters(index) {
  let letters = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    current = Math.floor((current - 1) / 26);
  }
  return letters;
}

/**
 * Reads workbook structure locally for the sheet selector and preview when
 * browser processing is selected, so the file is never uploaded.
 */
export async function inspectXlsxInBrowser(file, { onProgress } = {}) {
  if (!file || file.name.split('.').pop()?.toLowerCase() !== 'xlsx') {
    throw new Error('Local inspection supports .xlsx files only.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('The file exceeds the 50 MB limit.');
  if (!hasDecompressionStream()) throw new Error('This browser cannot inspect XLSX data locally.');

  onProgress?.(10);
  const zip = readZip(await file.arrayBuffer());
  const workbookXml = await readEntry(zip, 'xl/workbook.xml');
  const relsXml = await readEntry(zip, 'xl/_rels/workbook.xml.rels');
  const sharedXml = await readEntry(zip, 'xl/sharedStrings.xml');

  if (!workbookXml || !relsXml) throw new Error('The workbook metadata is missing from the XLSX file.');

  const workbookDoc = parseXml(workbookXml, 'workbook');
  const relsDoc = parseXml(relsXml, 'workbook relationships');
  const sharedStrings = sharedXml ? buildSharedStrings(parseXml(sharedXml, 'shared strings')) : [];

  const relTargets = new Map();
  for (const relationship of relsDoc.getElementsByTagName('Relationship')) {
    relTargets.set(relationship.getAttribute('Id'), relationship.getAttribute('Target'));
  }

  const sheets = [];
  const previews = {};
  let totalRows = 0;
  let totalCells = 0;
  let totalFormulaCells = 0;
  let totalMissingCachedFormulas = 0;
  let index = 0;

  for (const sheetNode of workbookDoc.getElementsByTagName('sheet')) {
    const name = sheetNode.getAttribute('name') || `Sheet${index + 1}`;
    const visibility = sheetNode.getAttribute('state') || 'visible';
    const relationshipId = sheetNode.getAttribute('r:id') || sheetNode.getAttribute('id');
    const target = relTargets.get(relationshipId);
    index += 1;

    if (!target) {
      sheets.push({ name, index, visibility, dataRows: 0, columns: 0, formulaCells: 0, missingCachedFormulas: 0 });
      previews[name] = { headers: [], rows: [] };
      continue;
    }

    onProgress?.(15 + Math.min(index * 4, 60));
    const sheetXml = await readEntry(zip, resolveSheetTarget(target));
    if (!sheetXml) {
      sheets.push({ name, index, visibility, dataRows: 0, columns: 0, formulaCells: 0, missingCachedFormulas: 0 });
      previews[name] = { headers: [], rows: [] };
      continue;
    }

    const sheetDoc = parseXml(sheetXml, `worksheet ${name}`);
    const rows = [];
    let maxColumns = 0;
    let minRow = Infinity;
    let maxRow = 0;
    let formulaCells = 0;
    let missingCachedFormulas = 0;

    for (const rowNode of sheetDoc.getElementsByTagName('row')) {
      const rowIndex = Number(rowNode.getAttribute('r')) || 1;
      const cells = new Map();
      for (const cellNode of rowNode.getElementsByTagName('c')) {
        const address = cellNode.getAttribute('r');
        if (!address) continue;
        const column = columnIndexFromAddress(address);
        const value = readCellValue(cellNode, sharedStrings);
        const hasFormula = cellNode.getElementsByTagName('f').length > 0;
        if (hasFormula) {
          formulaCells += 1;
          if (value === null) missingCachedFormulas += 1;
        }
        cells.set(column, value);
        maxColumns = Math.max(maxColumns, column + 1);
      }
      minRow = Math.min(minRow, rowIndex);
      maxRow = Math.max(maxRow, rowIndex);
      rows.push({ index: rowIndex, cells });
    }

    if (rows.length === 0) {
      sheets.push({ name, index, visibility, dataRows: 0, columns: 0, formulaCells: 0, missingCachedFormulas: 0 });
      previews[name] = { headers: [], rows: [] };
      continue;
    }

    const headerRow = rows.find((row) => row.index === minRow);
    const headers = [];
    for (let column = 0; column < maxColumns; column += 1) {
      const raw = headerRow?.cells.get(column) ?? null;
      const display = raw === null || raw === undefined ? '' : String(raw).trim();
      headers.push({
        address: `${columnToLetters(column)}${minRow}`,
        column: columnToLetters(column),
        value: display || `Column_${column + 1}`,
        type: typeof raw === 'number' ? 'number' : raw === null ? 'empty' : 'string',
      });
    }

    const dataRowList = rows.filter((row) => row.index > minRow);
    for (const row of dataRowList) {
      for (const value of row.cells.values()) {
        if (value !== null && value !== undefined) totalCells += 1;
      }
    }

    const previewRows = dataRowList.slice(0, 8).map((row) => ({
      index: row.index,
      cells: Array.from({ length: maxColumns }, (_, column) => {
        const value = row.cells.get(column) ?? null;
        return {
          address: `${columnToLetters(column)}${row.index}`,
          column: columnToLetters(column),
          value,
          type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : value === null ? 'empty' : 'string',
        };
      }),
    }));

    const dataRows = Math.max(0, maxRow - minRow);
    totalRows += dataRows;
    totalFormulaCells += formulaCells;
    totalMissingCachedFormulas += missingCachedFormulas;

    sheets.push({ name, index, visibility, dataRows, columns: maxColumns, formulaCells, missingCachedFormulas });
    previews[name] = { headers, rows: previewRows };

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.(100);

  return {
    file: {
      name: file.name,
      sizeBytes: file.size,
      extension: 'xlsx',
      sheetCount: sheets.length,
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

/**
 * Converts an eligible XLSX File locally. Resolves with the same Normal Data
 * JSON shape produced by the backend converter.
 */
export async function convertXlsxInBrowser(file, { selectedSheets = null, overrides = [], onProgress } = {}) {
  const eligibility = getBrowserFallbackEligibility(file, { direction: 'excel-json', mode: 'normal' });
  if (!eligibility.eligible) throw new Error(eligibility.reason);

  const startedAt = Date.now();
  onProgress?.(8);
  const buffer = await file.arrayBuffer();
  const zip = readZip(buffer);

  onProgress?.(24);
  const workbookXml = await readEntry(zip, 'xl/workbook.xml');
  const relsXml = await readEntry(zip, 'xl/_rels/workbook.xml.rels');
  const sharedXml = await readEntry(zip, 'xl/sharedStrings.xml');

  if (!workbookXml || !relsXml) throw new Error('The workbook metadata is missing from the XLSX file.');

  const workbookDoc = parseXml(workbookXml, 'workbook');
  const relsDoc = parseXml(relsXml, 'workbook relationships');
  const sharedStrings = sharedXml ? buildSharedStrings(parseXml(sharedXml, 'shared strings')) : [];

  const relTargets = new Map();
  for (const relationship of relsDoc.getElementsByTagName('Relationship')) {
    relTargets.set(relationship.getAttribute('Id'), relationship.getAttribute('Target'));
  }

  const sheetDefinitions = [];
  let sheetIndex = 0;
  for (const sheet of workbookDoc.getElementsByTagName('sheet')) {
    const relationshipId = sheet.getAttribute('r:id') || sheet.getAttribute('id');
    const target = relTargets.get(relationshipId);
    if (!target) continue;
    sheetDefinitions.push({
      name: sheet.getAttribute('name') || `Sheet${sheetIndex + 1}`,
      state: sheet.getAttribute('state') || 'visible',
      path: resolveSheetTarget(target),
      index: sheetIndex,
    });
    sheetIndex += 1;
  }

  const targetSheets = selectedSheets && selectedSheets.length > 0
    ? sheetDefinitions.filter((sheet) => selectedSheets.includes(sheet.name))
    : sheetDefinitions;

  const overrideMap = new Map();
  for (const override of overrides) {
    if (!override?.sheet || !override?.address) continue;
    overrideMap.set(`${override.sheet}!${override.address.toUpperCase()}`, override.value);
  }

  const data = {};
  const sheetNames = [];
  const sheetSummaries = [];
  let totalRows = 0;
  let totalCells = 0;

  for (let index = 0; index < targetSheets.length; index += 1) {
    const sheet = targetSheets[index];
    onProgress?.(30 + Math.round((index / Math.max(targetSheets.length, 1)) * 45));

    const sheetXml = await readEntry(zip, sheet.path);
    if (!sheetXml) {
      data[sheet.name] = [];
      sheetNames.push(sheet.name);
      sheetSummaries.push({ name: sheet.name, visibility: sheet.state, rows: 0, columns: 0 });
      continue;
    }

    const sheetDoc = parseXml(sheetXml, `worksheet ${sheet.name}`);
    const rows = [];
    let maxColumns = 0;

    for (const rowNode of sheetDoc.getElementsByTagName('row')) {
      const cells = new Map();
      for (const cellNode of rowNode.getElementsByTagName('c')) {
        const address = cellNode.getAttribute('r');
        if (!address) continue;
        const column = columnIndexFromAddress(address);
        cells.set(column, readCellValue(cellNode, sharedStrings));
        maxColumns = Math.max(maxColumns, column + 1);
      }
      const rowIndex = Number(rowNode.getAttribute('r')) || rowNumberFromAddress(cells.keys().next().value || 'A1');
      rows.push({ index: rowIndex, cells });
    }

    const normal = rowsToNormalData(sheet.name, rows, Math.max(maxColumns, 1), overrideMap);
    data[sheet.name] = normal.rows;
    sheetNames.push(sheet.name);
    totalRows += normal.rows.length;
    totalCells += normal.totalCells;
    sheetSummaries.push({
      name: sheet.name,
      visibility: sheet.state,
      rows: normal.rows.length,
      columns: maxColumns,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.(90);

  const payload = {
    mode: 'normal',
    data,
    sheetCount: sheetNames.length,
    sheets: sheetNames,
  };

  onProgress?.(100);

  return {
    ...payload,
    stats: {
      sheetCount: sheetNames.length,
      rowCount: totalRows,
      cellCount: totalCells,
      durationMs: Date.now() - startedAt,
    },
    sheetSummaries,
    preview: JSON.stringify(
      { sheet: sheetNames[0], rows: (data[sheetNames[0]] || []).slice(0, 12) },
      null,
      2,
    ),
  };
}