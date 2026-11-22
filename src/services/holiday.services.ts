import holidayModel from '../models/holiday.model';
import { AppError } from '../utils/helper/AppError';
import { StatusCode } from '../utils/helper/constants/enum';
import { tenantFields, tenantFilter } from '../utils/context';
import { isDayKey } from '../utils/dates';

export interface HolidayInput {
  name: string;
  date: string;
  paid?: boolean;
}

export const listHolidays = async (year?: number) => {
  const filter: Record<string, unknown> = tenantFilter();
  if (year) filter.date = { $regex: `^${year}-` };
  return holidayModel.find(filter).sort({ date: 1 });
};

/** Every holiday key in a calendar year, for working-day calculations. */
export const holidayKeysForYear = async (year: number): Promise<Set<string>> => {
  const holidays = await holidayModel
    .find(tenantFilter({ date: { $regex: `^${year}-` } }))
    .select('date');
  return new Set(holidays.map((holiday) => holiday.date));
};

export const holidayKeysBetween = async (from: string, to: string): Promise<Set<string>> => {
  const holidays = await holidayModel
    .find(tenantFilter({ date: { $gte: from, $lte: to } }))
    .select('date');
  return new Set(holidays.map((holiday) => holiday.date));
};

export const addHoliday = async (input: HolidayInput) => {
  if (!input?.name || !isDayKey(input.date)) {
    throw new AppError('A holiday needs a name and a date', StatusCode.BAD_REQUEST);
  }
  return holidayModel.create({
    ...tenantFields(),
    name: input.name.trim(),
    date: input.date,
    paid: input.paid ?? true,
  });
};

export const updateHoliday = async (_id: string, input: Partial<HolidayInput>) => {
  if (input.date !== undefined && !isDayKey(input.date)) {
    throw new AppError('Dates must use YYYY-MM-DD', StatusCode.BAD_REQUEST);
  }
  const updated = await holidayModel.findOneAndUpdate(
    tenantFilter({ _id }),
    { $set: { ...input } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new AppError('Holiday not found', StatusCode.NOT_FOUND);
  return updated;
};

export const deleteHoliday = async (_id: string) => {
  const deleted = await holidayModel.findOneAndDelete(tenantFilter({ _id }));
  if (!deleted) throw new AppError('Holiday not found', StatusCode.NOT_FOUND);
  return deleted;
};

export default {
  listHolidays,
  holidayKeysForYear,
  holidayKeysBetween,
  addHoliday,
  updateHoliday,
  deleteHoliday,
};
