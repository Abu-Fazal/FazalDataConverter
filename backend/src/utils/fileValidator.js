import fs from 'fs/promises';
import path from 'path';

/**
 * Validates file headers (magic bytes) to ensure the uploaded file
 * matches its stated MIME type and extension (TRD §7.1 & PRD §6.1).
 */
export async function validateMagicBytes(filePath, expectedExtension) {
  let fileHandle = null;
  try {
    fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(8);
    await fileHandle.read(buffer, 0, 8, 0);

    const ext = expectedExtension.toLowerCase().replace('.', '');

    // 1. Excel ZIP-based format (.xlsx, .xlsm) -> Starts with PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    if (ext === 'xlsx' || ext === 'xlsm') {
      const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
      return { isValid: isZip, detected: isZip ? ext : 'unknown', reason: isZip ? null : 'Invalid Excel ZIP structure' };
    }

    // 2. Legacy Excel Binary (.xls) -> Starts with 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 (OLE2 compound)
    if (ext === 'xls') {
      const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
      return { isValid: isOle, detected: isOle ? 'xls' : 'unknown', reason: isOle ? null : 'Invalid legacy Excel binary structure' };
    }

    // 3. JSON text (.json) -> Starts with '{' (0x7B) or '[' (0x5B) (ignoring potential UTF-8 BOM)
    if (ext === 'json') {
      // Check for UTF-8 BOM (0xEF, 0xBB, 0xBF)
      let offset = (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) ? 3 : 0;
      const char = String.fromCharCode(buffer[offset]).trim();
      const isJson = char === '{' || char === '[';
      return { isValid: isJson, detected: isJson ? 'json' : 'unknown', reason: isJson ? null : 'JSON must begin with { or [' };
    }

    // 4. Static JS extraction (.js) -> Text file containing static data structures (arrays/objects)
    if (ext === 'js') {
      return { isValid: true, detected: 'js', reason: null };
    }

    // 5. BSON binary (.bson) -> 4-byte int32 total document size
    if (ext === 'bson') {
      const docSize = buffer.readInt32LE(0);
      const stats = await fs.stat(filePath);
      const isBson = docSize > 4 && docSize <= stats.size;
      return { isValid: isBson, detected: isBson ? 'bson' : 'unknown', reason: isBson ? null : 'Invalid BSON binary structure' };
    }

    return { isValid: false, detected: 'unknown', reason: `Unsupported extension: .${ext}` };
  } catch (error) {
    return { isValid: false, detected: 'error', reason: error.message };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}
