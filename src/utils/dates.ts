/**
 * Calendar-day helpers.
 *
 * Attendance, leave and holidays are calendar facts, not instants: "1 March" is
 * the same day for everyone in the organisation regardless of where the API
 * process happens to run. Everything therefore works on `YYYY-MM-DD` keys in the
 * organisation's timezone, and only converts to a Date at the boundary where a
 * timestamp is genuinely needed.
 */

/** The office timezone calendar days are measured in; override per deployment. */
export const ORGANIZATION_TIMEZONE = () => process.env.ORGANIZATION_TIMEZONE || 'Asia/Karachi';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const dayFormatter = (timeZone: string) => {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
};

/** The `YYYY-MM-DD` calendar day a timestamp falls on, in `timeZone`. */
export const dayKey = (date: Date, timeZone: string = ORGANIZATION_TIMEZONE()): string => {
  const parts = dayFormatter(timeZone).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export const isDayKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Today's calendar day in the organisation timezone. */
export const todayKey = (timeZone: string = ORGANIZATION_TIMEZONE()): string =>
  dayKey(new Date(), timeZone);

const offsetMinutes = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return (asUtc - date.getTime()) / 60000;
};

/** The instant a calendar day starts in `timeZone`, as a real UTC timestamp. */
export const startOfDay = (day: string, timeZone: string = ORGANIZATION_TIMEZONE()): Date => {
  const [year, month, date] = day.split('-').map(Number);
  const wallClock = Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1);
  // Two passes: the offset at the guessed instant can differ across a DST edge.
  const firstPass = wallClock - offsetMinutes(new Date(wallClock), timeZone) * 60000;
  return new Date(wallClock - offsetMinutes(new Date(firstPass), timeZone) * 60000);
};

/** Exclusive end of a calendar day: midnight starting the next day. */
export const endOfDay = (day: string, timeZone: string = ORGANIZATION_TIMEZONE()): Date => {
  const start = startOfDay(day, timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
};

/** Mongo range filter for a single calendar day. */
export const dayRangeFilter = (day: string, timeZone: string = ORGANIZATION_TIMEZONE()) => ({
  $gte: startOfDay(day, timeZone),
  $lt: endOfDay(day, timeZone),
});

/** Adds (or subtracts) whole days to a `YYYY-MM-DD` key. */
export const addDays = (day: string, amount: number): string => {
  const [year, month, date] = day.split('-').map(Number);
  const value = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (date ?? 1) + amount));
  return value.toISOString().slice(0, 10);
};

export interface WorkingDayOptions {
  /** Weekdays the organisation works, 0 = Sunday. */
  workingDays?: number[];
  /** Holiday keys, e.g. from the Holiday collection. */
  holidays?: Iterable<string>;
}

/**
 * Counts chargeable leave days between two inclusive calendar days, skipping
 * weekends and public holidays. Returns 0 when the range contains no working day,
 * so a weekend-only request does not silently consume a day of balance.
 */
export const workingDaysBetween = (
  from: string,
  to: string,
  { workingDays = [1, 2, 3, 4, 5], holidays = [] }: WorkingDayOptions = {},
): number => {
  const holidaySet = holidays instanceof Set ? holidays : new Set(holidays);
  let cursor = from;
  let days = 0;
  let guard = 0;

  while (cursor <= to && guard < 400) {
    const [year, month, date] = cursor.split('-').map(Number);
    const weekday = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1)).getUTCDay();
    if (workingDays.includes(weekday) && !holidaySet.has(cursor)) days += 1;
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  return days;
};

/** Minutes since midnight for an instant, read in `timeZone`. */
export const minutesOfDay = (date: Date, timeZone: string = ORGANIZATION_TIMEZONE()): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hours = get('hour') % 24;
  return hours * 60 + get('minute');
};

/** Parses "HH:MM" into minutes since midnight. */
export const parseClock = (value: string | undefined, fallback = '09:15'): number => {
  const [hours = 9, minutes = 15] = (value || fallback).split(':').map(Number);
  return (hours ?? 9) * 60 + (minutes ?? 15);
};

/** Every calendar day in an inclusive range. */
export const daysBetween = (from: string, to: string): string[] => {
  const days: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
};
