import { extractFields, toTemporal } from '../converters.js';
import { emitMigrationWarning } from '../warnings.js';
import type { DateTimeFields, TemporalInput } from '../types.js';

// ─── internal helpers ────────────────────────────────────────────────────────

function isLegacy(value: unknown): value is Date | number {
  return value instanceof Date || typeof value === 'number';
}

function normalize(value: TemporalInput | unknown, timezone?: string): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (
    value instanceof Temporal.ZonedDateTime ||
    value instanceof Temporal.PlainDate ||
    value instanceof Temporal.PlainDateTime
  ) {
    return value;
  }
  const tz = timezone ?? Temporal.Now.timeZoneId();
  return toTemporal(value, tz) as Temporal.ZonedDateTime;
}

function fields(value: TemporalInput | unknown, timezone?: string): DateTimeFields {
  return extractFields(value, timezone);
}

function toZDT(value: TemporalInput | unknown, timezone?: string): Temporal.ZonedDateTime {
  if (value instanceof Temporal.ZonedDateTime) return value;
  const tz = timezone ?? Temporal.Now.timeZoneId();
  if (value instanceof Temporal.PlainDate) {
    return value.toZonedDateTime({ timeZone: tz, plainTime: Temporal.PlainTime.from({ hour: 0 }) });
  }
  if (value instanceof Temporal.PlainDateTime) {
    return value.toZonedDateTime(tz);
  }
  return toTemporal(value, tz) as Temporal.ZonedDateTime;
}

function hour12(hour: number): number {
  return hour % 12 || 12;
}

// ─── format tokens (longest first to prevent partial matches) ────────────────

type TokenFn = (f: DateTimeFields) => string;

function monthName(month: number, style: 'long' | 'short'): string {
  return new Intl.DateTimeFormat('en-US', { month: style }).format(new Date(2000, month - 1, 1));
}

function weekdayName(dayOfWeek: number, style: 'long' | 'short'): string {
  // 2000-01-03 is Monday (dayOfWeek=1)
  return new Intl.DateTimeFormat('en-US', { weekday: style }).format(
    new Date(2000, 0, 2 + dayOfWeek),
  );
}

const FORMAT_TOKENS: [string, TokenFn][] = [
  ['MMMM', (f) => monthName(f.month, 'long')],
  ['MMM', (f) => monthName(f.month, 'short')],
  ['EEEE', (f) => weekdayName(f.dayOfWeek, 'long')],
  ['EEE', (f) => weekdayName(f.dayOfWeek, 'short')],
  ['yyyy', (f) => String(f.year).padStart(4, '0')],
  ['SSS', (f) => String(f.millisecond).padStart(3, '0')],
  ['HH', (f) => String(f.hour).padStart(2, '0')],
  ['hh', (f) => String(hour12(f.hour)).padStart(2, '0')],
  ['MM', (f) => String(f.month).padStart(2, '0')],
  ['dd', (f) => String(f.day).padStart(2, '0')],
  ['mm', (f) => String(f.minute).padStart(2, '0')],
  ['ss', (f) => String(f.second).padStart(2, '0')],
  ['yy', (f) => String(f.year % 100).padStart(2, '0')],
  ['M', (f) => String(f.month)],
  ['d', (f) => String(f.day)],
  ['H', (f) => String(f.hour)],
  ['h', (f) => String(hour12(f.hour))],
  ['a', (f) => (f.hour < 12 ? 'AM' : 'PM')],
];

function applyFormatString(fmt: string, f: DateTimeFields): string {
  let result = '';
  let i = 0;

  while (i < fmt.length) {
    const c = fmt[i]!;

    if (c === "'") {
      i++;
      while (i < fmt.length && fmt[i] !== "'") {
        result += fmt[i];
        i++;
      }
      i++;
      continue;
    }

    let matched = false;
    for (const [token, getter] of FORMAT_TOKENS) {
      if (fmt.startsWith(token, i)) {
        result += getter(f);
        i += token.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += c;
      i++;
    }
  }

  return result;
}

// ─── compat API ─────────────────────────────────────────────────────────────

/**
 * Format a date using date-fns-style format tokens.
 * Supports: yyyy, yy, MMMM, MMM, MM, M, dd, d, HH, H, hh, h, mm, ss, SSS, a, EEEE, EEE.
 * Unsupported tokens are flagged; use native Temporal .toLocaleString() for full locale support.
 *
 * @deprecated Bridge function. Prefer native Temporal: `zdt.toLocaleString(locale, options)`
 */
export function format(date: Date, formatStr: string): string;
export function format(date: Temporal.ZonedDateTime, formatStr: string): string;
export function format(date: Temporal.PlainDate, formatStr: string): string;
export function format(date: Temporal.PlainDateTime, formatStr: string): string;
export function format(date: unknown, formatStr: string): string {
  if (isLegacy(date)) emitMigrationWarning('format', 'date-fns', 'zdt.toLocaleString()');
  const f = fields(date);
  return applyFormatString(formatStr, f);
}

/**
 * @deprecated Bridge function. Prefer: `date.add({ days: amount })`
 */
export function addDays(date: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime;
export function addDays(date: Temporal.PlainDate, amount: number): Temporal.PlainDate;
export function addDays(date: Temporal.PlainDateTime, amount: number): Temporal.PlainDateTime;
export function addDays(date: Date, amount: number): Temporal.ZonedDateTime;
export function addDays(date: unknown, amount: number): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('addDays', 'date-fns', 'date.add({ days: n })');
  const d = normalize(date);
  return d.add({ days: amount }) as Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `date.add({ months: amount })`
 */
export function addMonths(date: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime;
export function addMonths(date: Temporal.PlainDate, amount: number): Temporal.PlainDate;
export function addMonths(date: Temporal.PlainDateTime, amount: number): Temporal.PlainDateTime;
export function addMonths(date: Date, amount: number): Temporal.ZonedDateTime;
export function addMonths(date: unknown, amount: number): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('addMonths', 'date-fns', 'date.add({ months: n })');
  const d = normalize(date);
  return d.add({ months: amount }) as Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `date.add({ years: amount })`
 */
export function addYears(date: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime;
export function addYears(date: Temporal.PlainDate, amount: number): Temporal.PlainDate;
export function addYears(date: Temporal.PlainDateTime, amount: number): Temporal.PlainDateTime;
export function addYears(date: Date, amount: number): Temporal.ZonedDateTime;
export function addYears(date: unknown, amount: number): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('addYears', 'date-fns', 'date.add({ years: n })');
  const d = normalize(date);
  return d.add({ years: amount }) as Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `date.subtract({ days: amount })`
 */
export function subDays(date: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime;
export function subDays(date: Temporal.PlainDate, amount: number): Temporal.PlainDate;
export function subDays(date: Temporal.PlainDateTime, amount: number): Temporal.PlainDateTime;
export function subDays(date: Date, amount: number): Temporal.ZonedDateTime;
export function subDays(date: unknown, amount: number): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('subDays', 'date-fns', 'date.subtract({ days: n })');
  const d = normalize(date);
  return d.subtract({ days: amount }) as Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `date.subtract({ months: amount })`
 */
export function subMonths(date: Temporal.ZonedDateTime, amount: number): Temporal.ZonedDateTime;
export function subMonths(date: Temporal.PlainDate, amount: number): Temporal.PlainDate;
export function subMonths(date: Temporal.PlainDateTime, amount: number): Temporal.PlainDateTime;
export function subMonths(date: Date, amount: number): Temporal.ZonedDateTime;
export function subMonths(date: unknown, amount: number): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('subMonths', 'date-fns', 'date.subtract({ months: n })');
  const d = normalize(date);
  return d.subtract({ months: amount }) as Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `Temporal.ZonedDateTime.compare(a, b) > 0`
 */
export function isAfter(date: unknown, dateToCompare: unknown): boolean {
  if (isLegacy(date) || isLegacy(dateToCompare)) {
    emitMigrationWarning('isAfter', 'date-fns', 'Temporal.ZonedDateTime.compare(a, b) > 0');
  }
  const a = toZDT(date);
  const b = toZDT(dateToCompare);
  return Temporal.ZonedDateTime.compare(a, b) > 0;
}

/**
 * @deprecated Bridge function. Prefer: `Temporal.ZonedDateTime.compare(a, b) < 0`
 */
export function isBefore(date: unknown, dateToCompare: unknown): boolean {
  if (isLegacy(date) || isLegacy(dateToCompare)) {
    emitMigrationWarning('isBefore', 'date-fns', 'Temporal.ZonedDateTime.compare(a, b) < 0');
  }
  const a = toZDT(date);
  const b = toZDT(dateToCompare);
  return Temporal.ZonedDateTime.compare(a, b) < 0;
}

/**
 * @deprecated Bridge function. Prefer: `a.toPlainDate().equals(b.toPlainDate())`
 */
export function isSameDay(date: unknown, dateToCompare: unknown): boolean {
  if (isLegacy(date) || isLegacy(dateToCompare)) {
    emitMigrationWarning('isSameDay', 'date-fns', 'a.toPlainDate().equals(b.toPlainDate())');
  }
  const a = fields(date);
  const b = fields(dateToCompare);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * @deprecated Bridge function. Prefer: `zdt.startOfDay()` or `.with({ hour: 0, minute: 0, second: 0, millisecond: 0 })`
 */
export function startOfDay(date: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
export function startOfDay(date: Temporal.PlainDate): Temporal.PlainDate;
export function startOfDay(date: Temporal.PlainDateTime): Temporal.PlainDateTime;
export function startOfDay(date: Date): Temporal.ZonedDateTime;
export function startOfDay(date: unknown): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('startOfDay', 'date-fns', 'zdt.startOfDay()');

  if (date instanceof Temporal.PlainDate) return date;
  if (date instanceof Temporal.ZonedDateTime) return date.startOfDay();
  if (date instanceof Temporal.PlainDateTime) {
    return date.with({ hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
  }
  return toZDT(date).startOfDay();
}

/**
 * @deprecated Bridge function. Prefer: `zdt.startOfDay().add({ days: 1 }).subtract({ nanoseconds: 1 })`
 */
export function endOfDay(date: unknown): Temporal.ZonedDateTime | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('endOfDay', 'date-fns');

  if (date instanceof Temporal.ZonedDateTime) {
    return date.startOfDay().add({ days: 1 }).subtract({ nanoseconds: 1 });
  }
  if (date instanceof Temporal.PlainDateTime) {
    return date.with({ hour: 23, minute: 59, second: 59, millisecond: 999, microsecond: 999, nanosecond: 999 });
  }
  return toZDT(date).startOfDay().add({ days: 1 }).subtract({ nanoseconds: 1 });
}

/**
 * @deprecated Bridge function. Prefer: `date.with({ day: 1 })`
 */
export function startOfMonth(date: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
export function startOfMonth(date: Temporal.PlainDate): Temporal.PlainDate;
export function startOfMonth(date: Temporal.PlainDateTime): Temporal.PlainDateTime;
export function startOfMonth(date: Date): Temporal.ZonedDateTime;
export function startOfMonth(date: unknown): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('startOfMonth', 'date-fns', 'date.with({ day: 1 })');
  const d = normalize(date);
  if (d instanceof Temporal.ZonedDateTime) return d.with({ day: 1 }).startOfDay();
  return d.with({ day: 1 }) as Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `date.with({ day: date.daysInMonth })`
 */
export function endOfMonth(date: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
export function endOfMonth(date: Temporal.PlainDate): Temporal.PlainDate;
export function endOfMonth(date: Temporal.PlainDateTime): Temporal.PlainDateTime;
export function endOfMonth(date: Date): Temporal.ZonedDateTime;
export function endOfMonth(date: unknown): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  if (isLegacy(date)) emitMigrationWarning('endOfMonth', 'date-fns', 'date.with({ day: date.daysInMonth })');
  const d = normalize(date);
  return d.with({ day: d.daysInMonth }) as Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime;
}

/**
 * @deprecated Bridge function. Prefer: `Temporal.PlainDate.from(isoString)` or `Temporal.ZonedDateTime.from(isoString)`
 */
export function parseISO(isoString: string): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime {
  emitMigrationWarning('parseISO', 'date-fns', 'Temporal.ZonedDateTime.from(str) or Temporal.PlainDate.from(str)');

  // ZonedDateTime: bracket [Timezone] is the unambiguous marker
  if (isoString.includes('[')) {
    return Temporal.ZonedDateTime.from(isoString);
  }

  // PlainDateTime: 'T' separator means time component is present
  if (isoString.includes('T') || isoString.includes('t')) {
    return Temporal.PlainDateTime.from(isoString);
  }

  // PlainDate: date-only (YYYY-MM-DD or similar)
  return Temporal.PlainDate.from(isoString);
}

/**
 * @deprecated Bridge function. Prefer: native Temporal types are always valid if constructed.
 */
export function isValid(date: unknown): boolean {
  if (date instanceof Date) {
    emitMigrationWarning('isValid', 'date-fns');
    return !Number.isNaN(date.getTime());
  }
  if (
    date instanceof Temporal.ZonedDateTime ||
    date instanceof Temporal.PlainDate ||
    date instanceof Temporal.PlainDateTime ||
    date instanceof Temporal.Instant
  ) {
    return true;
  }
  return false;
}

/**
 * @deprecated Bridge function. Prefer: `Temporal.ZonedDateTime.compare(a, b)`
 */
export function differenceInDays(dateLeft: unknown, dateRight: unknown): number {
  if (isLegacy(dateLeft) || isLegacy(dateRight)) {
    emitMigrationWarning('differenceInDays', 'date-fns', 'Temporal.ZonedDateTime.compare or .until()');
  }
  const a = toZDT(dateLeft);
  const b = toZDT(dateRight);
  return a.until(b, { largestUnit: 'days' }).days;
}

/**
 * @deprecated Bridge function. Prefer: `a.until(b, { largestUnit: 'months' }).months`
 */
export function differenceInMonths(dateLeft: unknown, dateRight: unknown): number {
  if (isLegacy(dateLeft) || isLegacy(dateRight)) {
    emitMigrationWarning('differenceInMonths', 'date-fns', "a.until(b, { largestUnit: 'months' }).months");
  }
  const a = toZDT(dateLeft);
  const b = toZDT(dateRight);
  return a.until(b, { largestUnit: 'months' }).months;
}
