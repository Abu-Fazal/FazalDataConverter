/**
 * Applies user-supplied inline cell corrections before conversion (PRD §6.9.4).
 * Overrides are scoped to a worksheet and A1-style cell address.
 */

export function coerceOverrideValue(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === '') return null;
  if (text.toLowerCase() === 'true') return true;
  if (text.toLowerCase() === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text) && text.length <= 15) return Number(text);
  return String(raw);
}

export function applyCellOverrides(worksheet, overrides = [], sheetName) {
  if (!worksheet) return 0;

  let applied = 0;
  for (const override of overrides) {
    if (!override || override.sheet !== sheetName || typeof override.address !== 'string') continue;
    if (!/^[A-Z]{1,3}[1-9][0-9]{0,6}$/i.test(override.address)) continue;

    const address = override.address.toUpperCase();
    const previousStyle = worksheet[address]?.s;
    const value = coerceOverrideValue(override.value);

    if (value === null) {
      worksheet[address] = { t: 'z', v: undefined, s: previousStyle };
    } else if (typeof value === 'number') {
      worksheet[address] = { t: 'n', v: value, w: String(value), s: previousStyle };
    } else if (typeof value === 'boolean') {
      worksheet[address] = { t: 'b', v: value, s: previousStyle };
    } else {
      worksheet[address] = { t: 's', v: String(value), w: String(value), s: previousStyle };
    }

    applied += 1;
  }

  return applied;
}