#!/usr/bin/env node
/**
 * Fills in payslip numbers for rows created before numbering moved to the
 * counter, and renumbers duplicates.
 *
 * The old `PS-<periodEnd month>-<array index>` scheme restarted at 0001 for
 * every run, so a reversed and regenerated period can hold several rows with
 * the same reference. Safe to run more than once; it only writes rows that are
 * missing a number or share one.
 *
 *   npm run db:backfill-payslips -- --yes
 *
 * Without --yes it prints what it would change and exits.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import payrollModel from '../models/employeePayroll.model';
import payrollSequenceModel from '../models/payrollSequence.model';
import { allocatePayslipNumbers } from '../services/payslipSequence.services';

dotenv.config();

interface Row {
  _id: mongoose.Types.ObjectId;
  payslipNumber?: string;
  organizationId?: mongoose.Types.ObjectId;
  payPeriodStart: Date;
}

const periodKeyOf = (row: Row): string => {
  const date = row.payPeriodStart instanceof Date ? row.payPeriodStart : new Date(row.payPeriodStart);
  return date.toISOString().slice(0, 7);
};

const main = async () => {
  const commit = process.argv.includes('--yes');
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/HR-DB';

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}`);

  const rows = (await payrollModel
    .find({})
    .select('payslipNumber organizationId payPeriodStart')
    .sort({ payPeriodStart: 1, _id: 1 })
    .lean()) as unknown as Row[];

  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.organizationId ? String(row.organizationId) : ''}|${periodKeyOf(row)}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let planned = 0;
  let written = 0;

  for (const [key, group] of groups) {
    const [organizationId, periodKey] = key.split('|') as [string, string];
    const seen = new Set<string>();
    const needs = group.filter((row) => {
      const number = row.payslipNumber?.trim();
      if (!number || seen.has(number)) return true;
      seen.add(number);
      return false;
    });
    if (needs.length === 0) continue;

    planned += needs.length;
    console.log(`${periodKey} ${organizationId || '(no organisation)'}: ${needs.length} row(s) need a number`);
    if (!commit) continue;

    const numbers = await allocatePayslipNumbers(
      periodKey,
      needs.length,
      organizationId ? new mongoose.Types.ObjectId(organizationId) : null,
    );
    const updates = needs.flatMap((row, index) => {
      const payslipNumber = numbers[index];
      return payslipNumber
        ? [{ updateOne: { filter: { _id: row._id }, update: { $set: { payslipNumber } } } }]
        : [];
    });
    if (updates.length > 0) {
      const result = await payrollModel.bulkWrite(updates);
      written += result.modifiedCount;
    }
  }

  if (planned === 0) {
    console.log('Every payroll row already has a unique payslip number.');
  } else if (!commit) {
    console.log(`\n${planned} row(s) would be updated. Re-run with --yes to write.`);
  } else {
    console.log(`\nUpdated ${written} row(s).`);
  }

  await payrollSequenceModel.init();
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(`Backfill failed: ${(error as Error).message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
