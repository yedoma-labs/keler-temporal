import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from '../compat/index.js';

const date = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
const zdt = Temporal.ZonedDateTime.from('2026-06-20T14:30:45.123+02:00[Europe/Berlin]');
const legacyDate = new Date('2026-06-20T12:30:45.123Z');

describe('format', () => {
  it('formats PlainDate', () => {
    expect(format(date, 'yyyy-MM-dd')).toBe('2026-06-20');
  });

  it('formats ZonedDateTime', () => {
    expect(format(zdt, 'yyyy-MM-dd')).toBe('2026-06-20');
    expect(format(zdt, 'HH:mm:ss')).toBe('14:30:45');
    expect(format(zdt, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-06-20 14:30:45');
  });

  it('formats with month names', () => {
    expect(format(date, 'MMMM dd, yyyy')).toBe('June 20, 2026');
    expect(format(date, 'MMM dd')).toBe('Jun 20');
  });

  it('formats with single-digit tokens', () => {
    const d = Temporal.PlainDate.from({ year: 2026, month: 3, day: 5 });
    expect(format(d, 'M/d/yyyy')).toBe('3/5/2026');
  });

  it('formats milliseconds', () => {
    expect(format(zdt, 'SSS')).toBe('123');
  });

  it('formats AM/PM', () => {
    expect(format(zdt, 'hh:mm a')).toBe('02:30 PM');
  });

  it('preserves quoted literals', () => {
    expect(format(date, "'Today is' yyyy-MM-dd")).toBe('Today is 2026-06-20');
  });

  it('formats legacy Date', () => {
    const result = format(legacyDate as unknown as Temporal.ZonedDateTime, 'yyyy');
    expect(result).toMatch(/^\d{4}$/);
  });
});

describe('addDays', () => {
  it('adds days to PlainDate', () => {
    const result = addDays(date, 7);
    expect(result).toBeInstanceOf(Temporal.PlainDate);
    expect((result as Temporal.PlainDate).day).toBe(27);
  });

  it('adds days to ZonedDateTime', () => {
    const result = addDays(zdt, 1);
    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    expect((result as Temporal.ZonedDateTime).day).toBe(21);
  });

  it('handles negative amounts (subtract)', () => {
    const result = addDays(date, -1);
    expect((result as Temporal.PlainDate).day).toBe(19);
  });
});

describe('addMonths', () => {
  it('adds months to PlainDate', () => {
    const result = addMonths(date, 2);
    expect((result as Temporal.PlainDate).month).toBe(8);
  });

  it('wraps year correctly', () => {
    const dec = Temporal.PlainDate.from({ year: 2026, month: 12, day: 15 });
    const result = addMonths(dec, 2);
    expect((result as Temporal.PlainDate).year).toBe(2027);
    expect((result as Temporal.PlainDate).month).toBe(2);
  });
});

describe('addYears', () => {
  it('adds years to PlainDate', () => {
    const result = addYears(date, 2);
    expect((result as Temporal.PlainDate).year).toBe(2028);
  });
});

describe('subDays', () => {
  it('subtracts days', () => {
    const result = subDays(date, 5);
    expect((result as Temporal.PlainDate).day).toBe(15);
  });
});

describe('subMonths', () => {
  it('subtracts months', () => {
    const result = subMonths(date, 3);
    expect((result as Temporal.PlainDate).month).toBe(3);
  });
});

describe('isAfter / isBefore', () => {
  const earlier = Temporal.ZonedDateTime.from('2026-06-19T12:00:00+02:00[Europe/Berlin]');
  const later = Temporal.ZonedDateTime.from('2026-06-21T12:00:00+02:00[Europe/Berlin]');

  it('isAfter returns true when a > b', () => {
    expect(isAfter(later, earlier)).toBe(true);
  });

  it('isAfter returns false when a < b', () => {
    expect(isAfter(earlier, later)).toBe(false);
  });

  it('isBefore returns true when a < b', () => {
    expect(isBefore(earlier, later)).toBe(true);
  });

  it('isBefore returns false when a > b', () => {
    expect(isBefore(later, earlier)).toBe(false);
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day', () => {
    const a = Temporal.ZonedDateTime.from('2026-06-20T09:00:00+02:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-20T23:59:00+02:00[Europe/Berlin]');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    const b = Temporal.PlainDate.from({ year: 2026, month: 6, day: 21 });
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('startOfDay / endOfDay', () => {
  it('startOfDay returns midnight for ZonedDateTime', () => {
    const result = startOfDay(zdt);
    expect((result as Temporal.ZonedDateTime).hour).toBe(0);
    expect((result as Temporal.ZonedDateTime).minute).toBe(0);
  });

  it('startOfDay returns same date for PlainDate', () => {
    const result = startOfDay(date);
    expect(result).toEqual(date);
  });

  it('endOfDay returns 23:59:59.999... for ZonedDateTime', () => {
    const result = endOfDay(zdt) as Temporal.ZonedDateTime;
    expect(result.hour).toBe(23);
    expect(result.minute).toBe(59);
  });
});

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth returns day 1', () => {
    const result = startOfMonth(date);
    expect((result as Temporal.PlainDate).day).toBe(1);
  });

  it('endOfMonth returns last day', () => {
    const result = endOfMonth(date);
    expect((result as Temporal.PlainDate).day).toBe(30); // June has 30 days
  });
});

describe('parseISO', () => {
  it('parses ISO date string to PlainDate', () => {
    const result = parseISO('2026-06-20');
    expect(result).toBeInstanceOf(Temporal.PlainDate);
  });

  it('parses ISO datetime string to PlainDateTime', () => {
    const result = parseISO('2026-06-20T14:30:00');
    expect(result).toBeInstanceOf(Temporal.PlainDateTime);
  });

  it('parses ISO zoned string to ZonedDateTime', () => {
    const result = parseISO('2026-06-20T14:30:00+02:00[Europe/Berlin]');
    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
  });
});

describe('isValid', () => {
  it('returns true for valid Date', () => {
    expect(isValid(new Date())).toBe(true);
  });

  it('returns false for invalid Date', () => {
    expect(isValid(new Date('not-a-date'))).toBe(false);
  });

  it('returns true for Temporal types', () => {
    expect(isValid(Temporal.Now.plainDateISO())).toBe(true);
    expect(isValid(Temporal.Now.zonedDateTimeISO())).toBe(true);
  });

  it('returns false for non-date values', () => {
    expect(isValid('2026-06-20')).toBe(false);
    expect(isValid(null)).toBe(false);
  });
});

describe('differenceInDays', () => {
  it('calculates positive difference', () => {
    const a = Temporal.ZonedDateTime.from('2026-06-20T12:00:00+02:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-27T12:00:00+02:00[Europe/Berlin]');
    expect(differenceInDays(a, b)).toBe(7);
  });

  it('calculates negative difference', () => {
    const a = Temporal.ZonedDateTime.from('2026-06-27T12:00:00+02:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-20T12:00:00+02:00[Europe/Berlin]');
    expect(differenceInDays(a, b)).toBe(-7);
  });
});

describe('differenceInMonths', () => {
  it('calculates month difference', () => {
    const a = Temporal.ZonedDateTime.from('2026-01-01T00:00:00+01:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-01T00:00:00+02:00[Europe/Berlin]');
    expect(differenceInMonths(a, b)).toBe(5);
  });
});
