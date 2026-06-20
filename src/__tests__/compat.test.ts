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

describe('format', () => {
  describe('date tokens', () => {
    it('yyyy — 4-digit year', () => {
      expect(format(date, 'yyyy')).toBe('2026');
    });

    it('yy — 2-digit year', () => {
      expect(format(date, 'yy')).toBe('26');
    });

    it('MM — zero-padded month', () => {
      expect(format(date, 'MM')).toBe('06');
    });

    it('M — unpadded month', () => {
      const march = Temporal.PlainDate.from({ year: 2026, month: 3, day: 1 });
      expect(format(march, 'M')).toBe('3');
    });

    it('dd — zero-padded day', () => {
      const d = Temporal.PlainDate.from({ year: 2026, month: 1, day: 5 });
      expect(format(d, 'dd')).toBe('05');
    });

    it('d — unpadded day', () => {
      const d = Temporal.PlainDate.from({ year: 2026, month: 1, day: 5 });
      expect(format(d, 'd')).toBe('5');
    });
  });

  describe('month name tokens', () => {
    it('MMMM — full month name', () => {
      expect(format(date, 'MMMM')).toBe('June');
    });

    it('MMM — abbreviated month name', () => {
      expect(format(date, 'MMM')).toBe('Jun');
    });
  });

  describe('weekday tokens', () => {
    it('EEEE — full day name', () => {
      // 2026-06-20 is Saturday
      expect(format(date, 'EEEE')).toBe('Saturday');
    });

    it('EEE — abbreviated day name', () => {
      expect(format(date, 'EEE')).toBe('Sat');
    });
  });

  describe('time tokens', () => {
    it('HH — 24h zero-padded hour', () => {
      expect(format(zdt, 'HH')).toBe('14');
    });

    it('H — 24h unpadded hour', () => {
      const midnight = Temporal.ZonedDateTime.from('2026-06-20T09:00:00+02:00[Europe/Berlin]');
      expect(format(midnight, 'H')).toBe('9');
    });

    it('hh — 12h zero-padded hour', () => {
      expect(format(zdt, 'hh')).toBe('02'); // 14:00 → 2 PM
    });

    it('a — AM/PM', () => {
      expect(format(zdt, 'a')).toBe('PM');
      const morning = Temporal.ZonedDateTime.from('2026-06-20T08:00:00+02:00[Europe/Berlin]');
      expect(format(morning, 'a')).toBe('AM');
    });

    it('mm — zero-padded minute', () => {
      expect(format(zdt, 'mm')).toBe('30');
    });

    it('ss — zero-padded second', () => {
      expect(format(zdt, 'ss')).toBe('45');
    });

    it('SSS — zero-padded millisecond', () => {
      expect(format(zdt, 'SSS')).toBe('123');
    });

    it('midnight hour: hh = 12, a = AM', () => {
      const midnight = Temporal.ZonedDateTime.from('2026-06-20T00:00:00+02:00[Europe/Berlin]');
      expect(format(midnight, 'hh')).toBe('12');
      expect(format(midnight, 'a')).toBe('AM');
    });

    it('noon: hh = 12, a = PM', () => {
      const noon = Temporal.ZonedDateTime.from('2026-06-20T12:00:00+02:00[Europe/Berlin]');
      expect(format(noon, 'hh')).toBe('12');
      expect(format(noon, 'a')).toBe('PM');
    });
  });

  describe('combined format strings', () => {
    it('ISO date format', () => {
      expect(format(date, 'yyyy-MM-dd')).toBe('2026-06-20');
    });

    it('ISO datetime format', () => {
      expect(format(zdt, 'yyyy-MM-dd HH:mm:ss')).toBe('2026-06-20 14:30:45');
    });

    it('European date format', () => {
      expect(format(date, 'dd/MM/yyyy')).toBe('20/06/2026');
    });

    it('full human-readable format', () => {
      expect(format(date, 'MMMM dd, yyyy')).toBe('June 20, 2026');
    });

    it('12h time with AM/PM', () => {
      expect(format(zdt, 'hh:mm a')).toBe('02:30 PM');
    });
  });

  describe('quoted literals', () => {
    it('preserves text in single quotes', () => {
      expect(format(date, "'Today is' yyyy-MM-dd")).toBe('Today is 2026-06-20');
    });

    it('preserves multiple quoted segments', () => {
      expect(format(date, "'Year:' yyyy 'Month:' MM")).toBe('Year: 2026 Month: 06');
    });
  });

  describe('PlainDate with time tokens', () => {
    it('time tokens on PlainDate default to 00', () => {
      expect(format(date, 'HH:mm:ss')).toBe('00:00:00');
    });
  });
});

describe('arithmetic', () => {
  describe('addDays', () => {
    it('adds days to PlainDate', () => {
      const result = addDays(date, 7) as Temporal.PlainDate;
      expect(result.day).toBe(27);
    });

    it('adds days to ZonedDateTime', () => {
      const result = addDays(zdt, 1) as Temporal.ZonedDateTime;
      expect(result.day).toBe(21);
      expect(result.timeZoneId).toBe('Europe/Berlin');
    });

    it('negative amount subtracts', () => {
      expect((addDays(date, -1) as Temporal.PlainDate).day).toBe(19);
    });

    it('crosses month boundary', () => {
      const endOfJune = Temporal.PlainDate.from({ year: 2026, month: 6, day: 30 });
      const result = addDays(endOfJune, 1) as Temporal.PlainDate;
      expect(result.month).toBe(7);
      expect(result.day).toBe(1);
    });
  });

  describe('addMonths', () => {
    it('adds months to PlainDate', () => {
      expect((addMonths(date, 2) as Temporal.PlainDate).month).toBe(8);
    });

    it('wraps year boundary', () => {
      const dec = Temporal.PlainDate.from({ year: 2026, month: 12, day: 15 });
      const result = addMonths(dec, 2) as Temporal.PlainDate;
      expect(result.year).toBe(2027);
      expect(result.month).toBe(2);
    });

    it('Jan 31 + 1 month clamps to Feb 28 (non-leap year)', () => {
      const jan31 = Temporal.PlainDate.from({ year: 2026, month: 1, day: 31 });
      const result = addMonths(jan31, 1) as Temporal.PlainDate;
      expect(result.month).toBe(2);
      expect(result.day).toBe(28); // Temporal constrain behaviour
    });

    it('Jan 31 + 1 month clamps to Feb 29 (leap year)', () => {
      const jan31 = Temporal.PlainDate.from({ year: 2028, month: 1, day: 31 });
      const result = addMonths(jan31, 1) as Temporal.PlainDate;
      expect(result.month).toBe(2);
      expect(result.day).toBe(29);
    });
  });

  describe('addYears', () => {
    it('adds years', () => {
      expect((addYears(date, 2) as Temporal.PlainDate).year).toBe(2028);
    });
  });

  describe('subDays / subMonths', () => {
    it('subDays subtracts', () => {
      expect((subDays(date, 5) as Temporal.PlainDate).day).toBe(15);
    });

    it('subMonths subtracts', () => {
      expect((subMonths(date, 3) as Temporal.PlainDate).month).toBe(3);
    });
  });
});

describe('comparison', () => {
  const earlier = Temporal.ZonedDateTime.from('2026-06-19T12:00:00+02:00[Europe/Berlin]');
  const later = Temporal.ZonedDateTime.from('2026-06-21T12:00:00+02:00[Europe/Berlin]');

  describe('isAfter', () => {
    it('returns true when a > b', () => expect(isAfter(later, earlier)).toBe(true));
    it('returns false when a < b', () => expect(isAfter(earlier, later)).toBe(false));
    it('returns false for equal values', () => expect(isAfter(earlier, earlier)).toBe(false));
  });

  describe('isBefore', () => {
    it('returns true when a < b', () => expect(isBefore(earlier, later)).toBe(true));
    it('returns false when a > b', () => expect(isBefore(later, earlier)).toBe(false));
    it('returns false for equal values', () => expect(isBefore(earlier, earlier)).toBe(false));
  });

  describe('isSameDay', () => {
    it('true for same calendar day, different times', () => {
      const a = Temporal.ZonedDateTime.from('2026-06-20T09:00:00+02:00[Europe/Berlin]');
      const b = Temporal.ZonedDateTime.from('2026-06-20T23:59:00+02:00[Europe/Berlin]');
      expect(isSameDay(a, b)).toBe(true);
    });

    it('false for different days', () => {
      expect(isSameDay(earlier, later)).toBe(false);
    });

    it('mixed types: PlainDate vs ZonedDateTime same calendar day', () => {
      const pd = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
      expect(isSameDay(pd, zdt)).toBe(true);
    });
  });
});

describe('boundary helpers', () => {
  describe('startOfDay', () => {
    it('returns midnight for ZonedDateTime', () => {
      const result = startOfDay(zdt) as Temporal.ZonedDateTime;
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.second).toBe(0);
      expect(result.millisecond).toBe(0);
    });

    it('returns same PlainDate for PlainDate', () => {
      expect(startOfDay(date)).toEqual(date);
    });

    it('zeroes time on PlainDateTime', () => {
      const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 6, day: 20, hour: 14 });
      const result = startOfDay(pdt) as Temporal.PlainDateTime;
      expect(result.hour).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('returns 23:59:59.999999999 for ZonedDateTime', () => {
      const result = endOfDay(zdt) as Temporal.ZonedDateTime;
      expect(result.hour).toBe(23);
      expect(result.minute).toBe(59);
      expect(result.second).toBe(59);
    });

    it('start of next day minus 1ns equals end of day', () => {
      const eod = endOfDay(zdt) as Temporal.ZonedDateTime;
      const sod = startOfDay(zdt) as Temporal.ZonedDateTime;
      const nextDay = sod.add({ days: 1 });
      // eod + 1ns should equal start of next day
      const afterEod = eod.add({ nanoseconds: 1 });
      expect(Temporal.ZonedDateTime.compare(afterEod, nextDay)).toBe(0);
    });
  });

  describe('startOfMonth / endOfMonth', () => {
    it('startOfMonth returns day 1', () => {
      expect((startOfMonth(date) as Temporal.PlainDate).day).toBe(1);
    });

    it('startOfMonth preserves month and year', () => {
      const result = startOfMonth(date) as Temporal.PlainDate;
      expect(result.month).toBe(6);
      expect(result.year).toBe(2026);
    });

    it('endOfMonth returns last day (June = 30)', () => {
      expect((endOfMonth(date) as Temporal.PlainDate).day).toBe(30);
    });

    it('endOfMonth for February non-leap = 28', () => {
      const feb = Temporal.PlainDate.from({ year: 2026, month: 2, day: 10 });
      expect((endOfMonth(feb) as Temporal.PlainDate).day).toBe(28);
    });

    it('endOfMonth for February leap = 29', () => {
      const feb = Temporal.PlainDate.from({ year: 2028, month: 2, day: 10 });
      expect((endOfMonth(feb) as Temporal.PlainDate).day).toBe(29);
    });

    it('startOfMonth for ZonedDateTime preserves timezone', () => {
      const result = startOfMonth(zdt) as Temporal.ZonedDateTime;
      expect(result.timeZoneId).toBe('Europe/Berlin');
      expect(result.day).toBe(1);
    });
  });
});

describe('parseISO', () => {
  it('parses date-only string → PlainDate', () => {
    expect(parseISO('2026-06-20')).toBeInstanceOf(Temporal.PlainDate);
  });

  it('parses date+time string → PlainDateTime', () => {
    const result = parseISO('2026-06-20T14:30:00');
    expect(result).toBeInstanceOf(Temporal.PlainDateTime);
    expect((result as Temporal.PlainDateTime).hour).toBe(14);
  });

  it('parses zoned string → ZonedDateTime', () => {
    const result = parseISO('2026-06-20T14:30:00+02:00[Europe/Berlin]');
    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    expect((result as Temporal.ZonedDateTime).timeZoneId).toBe('Europe/Berlin');
  });

  it('throws for invalid input', () => {
    expect(() => parseISO('not-a-date')).toThrow();
  });
});

describe('isValid', () => {
  it('true for valid Date', () => expect(isValid(new Date())).toBe(true));
  it('false for invalid Date', () => expect(isValid(new Date('not-a-date'))).toBe(false));
  it('true for PlainDate', () => expect(isValid(Temporal.Now.plainDateISO())).toBe(true));
  it('true for ZonedDateTime', () => expect(isValid(Temporal.Now.zonedDateTimeISO())).toBe(true));
  it('true for Instant', () => expect(isValid(Temporal.Now.instant())).toBe(true));
  it('false for string', () => expect(isValid('2026-06-20')).toBe(false));
  it('false for null', () => expect(isValid(null)).toBe(false));
  it('false for undefined', () => expect(isValid(undefined)).toBe(false));
});

describe('differenceInDays', () => {
  it('positive difference', () => {
    const a = Temporal.ZonedDateTime.from('2026-06-20T12:00:00+02:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-27T12:00:00+02:00[Europe/Berlin]');
    expect(differenceInDays(a, b)).toBe(7);
  });

  it('negative difference', () => {
    const a = Temporal.ZonedDateTime.from('2026-06-27T12:00:00+02:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-20T12:00:00+02:00[Europe/Berlin]');
    expect(differenceInDays(a, b)).toBe(-7);
  });

  it('zero for same value', () => {
    expect(differenceInDays(zdt, zdt)).toBe(0);
  });
});

describe('differenceInMonths', () => {
  it('positive month difference', () => {
    const a = Temporal.ZonedDateTime.from('2026-01-01T00:00:00+01:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-01T00:00:00+02:00[Europe/Berlin]');
    expect(differenceInMonths(a, b)).toBe(5);
  });

  it('cross-year difference', () => {
    const a = Temporal.ZonedDateTime.from('2025-06-01T00:00:00+02:00[Europe/Berlin]');
    const b = Temporal.ZonedDateTime.from('2026-06-01T00:00:00+02:00[Europe/Berlin]');
    expect(differenceInMonths(a, b)).toBe(12);
  });
});
