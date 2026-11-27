import { BSON, ObjectId, Decimal128, Long } from 'bson';
import xlsx from 'xlsx';
import fs from 'fs/promises';

/**
 * Validates whether a 24-char hex string is a valid MongoDB ObjectId (TRD §7.10)
 */
export function isValidObjectId(str) {
  return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str);
}

/**
 * Converts Excel worksheet data into serialized BSON document binary buffer.
 * Enforces ObjectId reconstruction, number precision mapping (Int32 vs Int64 vs Double).
 */
export async function convertExcelToBson(filePath, outputPath, options = {}) {
  const workbook = xlsx.readFile(filePath, { cellDates: true, cellStyles: true });
  const sheetNames = workbook.SheetNames;

  const bsonDocuments = {};

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) {
      bsonDocuments[sheetName] = [];
      continue;
    }

    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: null });
    const processedRows = rows.map((row) => {
      const doc = {};

      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) {
          doc[k] = null;
          continue;
        }

        // 1. Detect and reconstruct 24-character ObjectId
        if ((k === '_id' || k.endsWith('Id') || k.endsWith('_id')) && typeof v === 'string' && isValidObjectId(v)) {
          doc[k] = new ObjectId(v);
        }
        // 2. Dates
        else if (v instanceof Date) {
          doc[k] = v;
        }
        // 3. Numbers: Integer range check vs Double
        else if (typeof v === 'number') {
          if (Number.isInteger(v)) {
            if (v >= -2147483648 && v <= 2147483647) {
              doc[k] = v; // Int32
            } else {
              doc[k] = Long.fromNumber(v); // Int64
            }
          } else {
            doc[k] = v; // Double
          }
        }
        // 4. Strings: check if serialized JSON array or object
        else if (typeof v === 'string') {
          const trimmed = v.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              doc[k] = JSON.parse(trimmed);
            } catch (e) {
              doc[k] = v;
            }
          } else {
            doc[k] = v;
          }
        } else {
          doc[k] = v;
        }
      }

      return doc;
    });

    bsonDocuments[sheetName] = processedRows;
  }

  // Serialize root object to BSON binary buffer
  const serializedBinary = BSON.serialize(bsonDocuments);
  await fs.writeFile(outputPath, serializedBinary);

  return {
    outputPath,
    sizeBytes: serializedBinary.length,
    sheetCount: sheetNames.length,
    sheets: sheetNames,
  };
}

/**
 * Deserializes BSON binary buffer into readable JavaScript object.
 */
export async function deserializeBson(filePath) {
  const buffer = await fs.readFile(filePath);
  return BSON.deserialize(buffer);
}
