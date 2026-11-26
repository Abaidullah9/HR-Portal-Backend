import mongoose from 'mongoose';
import payrollSequenceModel from '../models/payrollSequence.model';
import payrollModel from '../models/employeePayroll.model';
import { tenantFields, tenantFilter } from '../utils/context';
import { isDayKey } from '../utils/dates';

const prefixFor = (periodKey: string) => `PS-${periodKey.replace('-', '')}`;

/**
 * Allocates the next `count` payslip numbers for a pay period.
 *
 * Numbers are allocated at issue time (approval, or marking a manual record
 * completed), never at draft creation: a draft that is deleted must not consume
 * a permanent reference, and a re-run after a reversal must get fresh numbers
 * rather than collide with the reversed slips.
 *
 * The highest number already stored for the period seeds the counter, so a
 * database that predates the counter cannot hand out a duplicate on first use.
 */
export const allocatePayslipNumbers = async (
  periodKey: string,
  count: number,
  organizationId: mongoose.Types.ObjectId | null = tenantFields().organizationId ?? null,
): Promise<string[]> => {
  if (!isDayKey(`${periodKey}-01`) || !Number.isInteger(count) || count <= 0) return [];

  const filter = { organizationId, periodKey };
  const prefix = prefixFor(periodKey);

  const latest = await payrollModel
    .findOne(tenantFilter({ payslipNumber: new RegExp(`^${prefix}-`) }), { payslipNumber: 1 })
    .sort({ payslipNumber: -1 })
    .lean();
  const storedSuffix = latest?.payslipNumber ? Number(latest.payslipNumber.slice(prefix.length + 1)) : 0;
  const floor = Number.isFinite(storedSuffix) ? storedSuffix : 0;

  // `$max` never lowers an already-seeded counter, so repeated calls are safe.
  await payrollSequenceModel.updateOne(filter, { $max: { seq: floor } }, { upsert: true });
  const counter = await payrollSequenceModel.findOneAndUpdate(
    filter,
    { $inc: { seq: count } },
    { returnDocument: 'after' },
  );
  if (!counter) throw new Error('Could not allocate a payslip number');

  const first = counter.seq - count + 1;
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(first + index).padStart(4, '0')}`);
};

export default { allocatePayslipNumbers };
