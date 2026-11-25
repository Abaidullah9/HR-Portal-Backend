import zlib from 'zlib';
import { buildPayslipPdf, type PayslipDocument } from '../utils/payslip-pdf';

/** One `[...] TJ` array is one piece of text drawn on the page. */
const decodeText = (content: string): string[] =>
  [...content.matchAll(/\[([^\]]*)\]\s*TJ/g)].map((match) =>
    [...(match[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>/g)]
      .map((hex) => Buffer.from(hex[1] ?? '', 'hex').toString('latin1'))
      .join(''),
  );

/**
 * pdfkit compresses each content stream and also writes text as hex strings, so
 * the words are not in the file as plain bytes. Inflating the streams and
 * decoding their UTF-16 hex strings gives back what a reader sees on the page.
 */
const textOf = (pdf: Buffer): string => {
  const rows: string[] = [];
  let index = pdf.indexOf('stream');
  while (index !== -1) {
    const start = pdf.indexOf('\n', index) + 1;
    const end = pdf.indexOf('endstream', start);
    if (start === 0 || end === -1) break;

    const stream = pdf.subarray(start, end);
    let content: string;
    try {
      content = zlib.inflateSync(stream).toString('latin1');
    } catch {
      // An uncompressed stream is already readable text.
      content = stream.toString('latin1');
    }
    rows.push(...decodeText(content));
    index = pdf.indexOf('stream', end + 'endstream'.length);
  }
  return rows.join('\n');
};

const payslip: PayslipDocument = {
  id: 'pay1',
  employee: { name: 'Diana Employee', code: 'EMP-0002', position: 'Senior Software Engineer' },
  periodStart: '2026-05-01T00:00:00.000Z',
  periodEnd: '2026-05-31T00:00:00.000Z',
  paymentMethod: 'bank transfer',
  status: 'completed',
  datePaid: '2026-05-31T00:00:00.000Z',
  earnings: [
    { label: 'Base salary', amount: 1000 },
    { label: 'transport', amount: 100 },
  ],
  deductions: [{ label: 'tax', amount: 234.56 }],
  grossPay: 1100,
  totalDeductions: 234.56,
  netPay: 865.44,
};

describe('payslip PDF', () => {
  it('renders the employee, the pay period and the figures as text', async () => {
    const pdf = await buildPayslipPdf(payslip);
    const text = textOf(pdf);

    expect(text).toContain('Diana Employee');
    expect(text).toContain('EMP-0002');
    expect(text).toContain('Senior Software Engineer');

    // Dates are formatted for reading, not left as ISO strings.
    expect(text).toContain('May 1, 2026');
    expect(text).toContain('May 31, 2026');
    expect(text).not.toContain('2026-05-01');

    // Every line item and every total is on the page.
    expect(text).toContain('Base salary');
    expect(text).toContain('transport');
    expect(text).toContain('tax');
    expect(text).toContain('1,000.00');
    expect(text).toContain('1,100.00');
    expect(text).toContain('234.56');
    expect(text).toContain('865.44');
  });

  it('keeps the sections in reading order', async () => {
    const text = textOf(await buildPayslipPdf(payslip));
    const at = (needle: string) => text.indexOf(needle);

    // A layout change that moves net pay above the earnings would still pass a
    // "contains" check, so the order is pinned too.
    expect(at('EARNINGS')).toBeGreaterThan(-1);
    expect(at('Gross pay')).toBeGreaterThan(at('EARNINGS'));
    expect(at('DEDUCTIONS')).toBeGreaterThan(at('Gross pay'));
    expect(at('Total deductions')).toBeGreaterThan(at('DEDUCTIONS'));
    expect(at('NET PAY')).toBeGreaterThan(at('Total deductions'));
    expect(at('865.44')).toBeGreaterThan(at('NET PAY'));
  });

  it('still produces a valid single-page PDF', async () => {
    const pdf = await buildPayslipPdf(payslip);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('/Type /Page');
    // Two pages would mean the layout overflowed A4.
    expect(pdf.toString('latin1')).toContain('/Count 1');
  });
});
