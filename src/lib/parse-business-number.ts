/**
 * Parse numbers coming from Excel/CSV exports.
 *
 * Data Hub can send either Vietnamese-formatted values (26.305.035,8) or
 * invariant XLSX values (26305035.8). Decide the decimal separator from the
 * shape of the value instead of always treating dots as thousands separators.
 */
export function parseBusinessNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const source = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!source || source === '-' || source === '.' || source === ',') return 0;

  const sign = source.startsWith('-') ? -1 : 1;
  const unsigned = source.replace(/-/g, '');
  const lastDot = unsigned.lastIndexOf('.');
  const lastComma = unsigned.lastIndexOf(',');

  let normalized = unsigned;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
    normalized = unsigned.split(thousandsSeparator).join('');
    normalized = normalized.replace(decimalSeparator, '.');
  } else {
    const separator = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : '';
    if (separator) {
      const parts = unsigned.split(separator);
      const fractionDigits = parts.at(-1)?.length ?? 0;
      const isThousandsGrouping = parts.length > 2
        || (parts.length === 2 && fractionDigits === 3);
      normalized = isThousandsGrouping
        ? parts.join('')
        : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`;
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? sign * parsed : 0;
}
