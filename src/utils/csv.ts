/**
 * CSV cells that are safe to open in Excel or Sheets.
 *
 * Quoting alone is not enough: a cell beginning with =, +, -, @ or a control
 * character is evaluated as a formula by spreadsheet apps, so a candidate named
 * `=HYPERLINK(...)` becomes a live link on the recruiter's machine. Such cells
 * are prefixed with a single quote, which spreadsheets treat as text.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const csvCell = (value: unknown): string => {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows: unknown[][]): string =>
  rows.map((row) => row.map(csvCell).join(',')).join('\n');
