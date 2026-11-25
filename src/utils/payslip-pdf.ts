import PDFDocument from 'pdfkit';

/**
 * A payslip PDF is a print artefact, so it is drawn here rather than rendered by
 * the browser: the same bytes come out whether the employee downloads it from
 * the portal, HR downloads it for a meeting, or an archive job stores it.
 */
export interface PayslipLine {
  label: string;
  amount: number;
  note?: string;
}

export interface PayslipDocument {
  id: string;
  employee: { name: string; code?: string; position?: string };
  periodStart: string | Date;
  periodEnd: string | Date;
  paymentMethod: string;
  status: string;
  datePaid?: string | Date | null;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;

const money = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const day = (value: string | Date | null | undefined): string => {
  if (!value) return '--';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '--'
    : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/** Builds the PDF in memory; the caller sets headers and sends the buffer. */
export const buildPayslipPdf = (payslip: PayslipDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const rule = () => {
      doc.moveDown(0.4);
      doc
        .strokeColor('#d1d5db')
        .lineWidth(0.75)
        .moveTo(PAGE_MARGIN, doc.y)
        .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
        .stroke();
      doc.moveDown(0.6);
    };

    const heading = (text: string) => {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(text.toUpperCase());
      doc.moveDown(0.3);
    };

    const line = (label: string, amount: number, bold = false) => {
      const y = doc.y;
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(10)
        .fillColor('#111827')
        .text(label, PAGE_MARGIN, y, { width: CONTENT_WIDTH - 120, continued: false });
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(money(amount), PAGE_MARGIN + CONTENT_WIDTH - 120, y, {
          width: 120,
          align: 'right',
        });
      doc.moveDown(0.35);
    };

    // Header
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text('Payslip');
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#6b7280')
      .text(`Pay period ${day(payslip.periodStart)} – ${day(payslip.periodEnd)}`);
    rule();

    // Employee block
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(payslip.employee.name);
    const details = [payslip.employee.code, payslip.employee.position].filter(Boolean).join(' · ');
    if (details) doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(details);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#6b7280')
      .text(
        [`Payment method ${payslip.paymentMethod}`, `Status ${payslip.status}`]
          .concat(payslip.datePaid ? [`Paid ${day(payslip.datePaid)}`] : [])
          .join(' · '),
      );
    rule();

    heading('Earnings');
    for (const item of payslip.earnings) line(item.label, item.amount);
    rule();
    line('Gross pay', payslip.grossPay, true);

    heading('Deductions');
    if (payslip.deductions.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('None');
    } else {
      for (const item of payslip.deductions) line(item.label, item.amount);
    }
    rule();
    line('Total deductions', payslip.totalDeductions, true);

    heading('Net pay');
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#111827')
      .text(money(payslip.netPay), { align: 'right' });
    doc.moveDown(1.2);

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#9ca3af')
      .text(
        `Generated ${new Date().toISOString().slice(0, 10)} · Record ${payslip.id}`,
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH },
      );

    doc.end();
  });
