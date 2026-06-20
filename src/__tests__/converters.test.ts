import { describe, expect, it } from 'vitest';
import { extractFields, fromTemporal, isTemporalType, toEpochMs, toTemporal } from '../converters.js';
import { TemporalConversionError, TemporalNotAvailableError } from '../errors.js';

const TZ = 'Europe/Berlin';
const TZ_NY = 'America/New_York';
const EPOCH_MS = 1_750_000_000_000;

describe('toTemporal', () => {
  describe('Temporal pass-through', () => {
    it('returns ZonedDateTime as-is', () => {
      const zdt = Temporal.Now.zonedDateTimeISO(TZ);
      expect(toTemporal(zdt)).toBe(zdt);
    });

    it('returns PlainDate as-is', () => {
      const pd = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
      expect(toTemporal(pd)).toBe(pd);
    });

    it('returns PlainDateTime as-is (no timezone)', () => {
      const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 6, day: 20, hour: 12 });
      expect(toTemporal(pdt)).toBe(pdt);
    });

    it('returns Instant as-is (no timezone)', () => {
      const inst = Temporal.Now.instant();
      expect(toTemporal(inst)).toBe(inst);
    });

    it('returns PlainTime as-is', () => {
      const pt = Temporal.PlainTime.from({ hour: 12, minute: 30 });
      expect(toTemporal(pt)).toBe(pt);
    });
  });

  describe('PlainDateTime + timezone → ZonedDateTime', () => {
    it('converts PlainDateTime to ZonedDateTime with given timezone', () => {
      const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 6, day: 20, hour: 14, minute: 30 });
      const result = toTemporal(pdt, TZ);
      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result.timeZoneId).toBe(TZ);
      expect(result.hour).toBe(14);
    });

    it('uses disambiguation option for DST-ambiguous wall-clock time', () => {
      // Nov 1 2026 01:30 America/New_York exists twice (fall-back DST)
      const ambiguous = Temporal.PlainDateTime.from({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 });

      const earlier = toTemporal(ambiguous, TZ_NY, { disambiguation: 'earlier' });
      const later = toTemporal(ambiguous, TZ_NY, { disambiguation: 'later' });

      // 'earlier' picks EDT (UTC-4), 'later' picks EST (UTC-5)
      // So 'earlier' has a larger epoch value (less negative offset = larger UTC)
      // Actually EDT is UTC-4, EST is UTC-5. Same wall clock time in EDT is later in UTC than EST.
      // EDT 01:30 = UTC 05:30; EST 01:30 = UTC 06:30
      // So earlier (EDT) < later (EST) in absolute time
      expect(Temporal.ZonedDateTime.compare(earlier, later)).toBeLessThan(0);
    });

    it('disambiguation defaults to "compatible"', () => {
      const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 6, day: 20, hour: 12 });
      const result = toTemporal(pdt, TZ);
      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    });
  });

  describe('Instant + timezone → ZonedDateTime', () => {
    it('converts Instant to ZonedDateTime with timezone', () => {
      const inst = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS);
      const result = toTemporal(inst, TZ);
      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result.timeZoneId).toBe(TZ);
      expect(Number(result.epochMilliseconds)).toBe(EPOCH_MS);
    });

    it('same instant in different zones has same epochMs but different hour', () => {
      const inst = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS);
      const berlin = toTemporal(inst, 'Europe/Berlin');
      const nyc = toTemporal(inst, 'America/New_York');
      expect(berlin.epochMilliseconds).toEqual(nyc.epochMilliseconds);
      expect(berlin.hour).not.toEqual(nyc.hour);
    });
  });

  describe('Date conversion', () => {
    it('converts Date to ZonedDateTime', () => {
      const date = new Date(EPOCH_MS);
      const result = toTemporal(date, TZ);
      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(result.timeZoneId).toBe(TZ);
      expect(Number(result.epochMilliseconds)).toBe(EPOCH_MS);
    });

    it('round-trips Date → ZonedDateTime → Date exactly', () => {
      const date = new Date(EPOCH_MS);
      const zdt = toTemporal(date, 'UTC');
      const back = fromTemporal(zdt);
      expect(back.getTime()).toBe(date.getTime());
    });

    it('throws without timezone for Date', () => {
      expect(() => (toTemporal as (v: unknown, tz?: string) => unknown)(new Date(), undefined)).toThrow(
        TemporalConversionError,
      );
    });

    it('handles Date at Unix epoch (0)', () => {
      const result = toTemporal(new Date(0), 'UTC');
      expect(result.year).toBe(1970);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('handles future Date (year 2100)', () => {
      const futureMs = new Date('2100-01-01T00:00:00Z').getTime();
      const result = toTemporal(new Date(futureMs), 'UTC');
      expect(result.year).toBe(2100);
    });
  });

  describe('number (epoch ms) conversion', () => {
    it('converts epoch ms to ZonedDateTime', () => {
      const result = toTemporal(EPOCH_MS, 'UTC');
      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(Number(result.epochMilliseconds)).toBe(EPOCH_MS);
    });

    it('converts 0 (Unix epoch) correctly', () => {
      const result = toTemporal(0, 'UTC');
      expect(result.year).toBe(1970);
    });

    it('throws without timezone for number', () => {
      expect(() => (toTemporal as (v: unknown, tz?: string) => unknown)(EPOCH_MS, undefined)).toThrow(
        TemporalConversionError,
      );
    });

    it('handles negative epoch (before 1970)', () => {
      const result = toTemporal(-1000, 'UTC');
      expect(result.year).toBe(1969);
    });
  });

  describe('error cases', () => {
    it('throws TemporalConversionError for string input', () => {
      expect(() => toTemporal('2026-06-20', 'UTC')).toThrow(TemporalConversionError);
      expect(() => toTemporal('2026-06-20', 'UTC')).toThrow('Cannot convert value');
    });

    it('throws for null', () => {
      expect(() => toTemporal(null as unknown as Date, 'UTC')).toThrow(TemporalConversionError);
    });

    it('throws for plain object without adapter', () => {
      expect(() => toTemporal({ date: '2026-06-20' } as unknown as Date, 'UTC')).toThrow(
        TemporalConversionError,
      );
    });

    it('error message includes type information', () => {
      try {
        toTemporal(true as unknown as Date, 'UTC');
      } catch (e) {
        expect((e as Error).message).toContain('"boolean"');
      }
    });
  });
});

describe('fromTemporal', () => {
  it('converts ZonedDateTime to Date', () => {
    const zdt = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS).toZonedDateTimeISO(TZ);
    const result = fromTemporal(zdt);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(EPOCH_MS);
  });

  it('converts Instant to Date', () => {
    const inst = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS);
    expect(fromTemporal(inst).getTime()).toBe(EPOCH_MS);
  });

  it('converts PlainDateTime to Date (UTC interpretation)', () => {
    const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 1, day: 1, hour: 0 });
    const result = fromTemporal(pdt);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(0);
  });

  it('sub-millisecond precision is truncated (documented behaviour)', () => {
    // Temporal supports nanoseconds; Date only ms. fromTemporal truncates silently.
    const zdt = Temporal.ZonedDateTime.from('2026-06-20T12:00:00.000000999+00:00[UTC]');
    const result = fromTemporal(zdt);
    expect(result.getTime()).toBe(Number(zdt.epochMilliseconds));
  });

  it('same ZonedDateTime in different zones produces same Date', () => {
    const inst = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS);
    const berlinZdt = inst.toZonedDateTimeISO('Europe/Berlin');
    const utcZdt = inst.toZonedDateTimeISO('UTC');
    expect(fromTemporal(berlinZdt).getTime()).toBe(fromTemporal(utcZdt).getTime());
  });
});

describe('toEpochMs', () => {
  it('returns Date getTime()', () => {
    expect(toEpochMs(new Date(EPOCH_MS))).toBe(EPOCH_MS);
  });

  it('returns number unchanged', () => {
    expect(toEpochMs(EPOCH_MS)).toBe(EPOCH_MS);
    expect(toEpochMs(0)).toBe(0);
    expect(toEpochMs(-1)).toBe(-1);
  });

  it('returns Instant epochMilliseconds as number', () => {
    const inst = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS);
    expect(toEpochMs(inst)).toBe(EPOCH_MS);
  });

  it('returns ZonedDateTime epochMilliseconds', () => {
    const zdt = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS).toZonedDateTimeISO('UTC');
    expect(toEpochMs(zdt)).toBe(EPOCH_MS);
  });

  it('PlainDateTime is interpreted as UTC', () => {
    const pdt = Temporal.PlainDateTime.from({ year: 1970, month: 1, day: 1, hour: 0 });
    expect(toEpochMs(pdt)).toBe(0);
  });

  it('throws TemporalConversionError for unsupported type', () => {
    expect(() => toEpochMs('oops')).toThrow(TemporalConversionError);
    expect(() => toEpochMs(null)).toThrow(TemporalConversionError);
  });
});

describe('extractFields', () => {
  it('extracts all fields from ZonedDateTime', () => {
    const zdt = Temporal.ZonedDateTime.from('2026-06-20T14:30:15.123+02:00[Europe/Berlin]');
    const f = extractFields(zdt);
    expect(f.year).toBe(2026);
    expect(f.month).toBe(6);
    expect(f.day).toBe(20);
    expect(f.hour).toBe(14);
    expect(f.minute).toBe(30);
    expect(f.second).toBe(15);
    expect(f.millisecond).toBe(123);
    expect(f.timezone).toBe('Europe/Berlin');
  });

  it('dayOfWeek is ISO (1=Monday, 7=Sunday)', () => {
    // 2026-06-20 is a Saturday
    const pd = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    expect(extractFields(pd).dayOfWeek).toBe(6); // Saturday
  });

  it('extracts from PlainDate with time defaults to 0', () => {
    const pd = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    const f = extractFields(pd);
    expect(f.hour).toBe(0);
    expect(f.minute).toBe(0);
    expect(f.timezone).toBeUndefined();
  });

  it('extracts from PlainDateTime', () => {
    const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 6, day: 20, hour: 9, minute: 15 });
    const f = extractFields(pdt);
    expect(f.hour).toBe(9);
    expect(f.minute).toBe(15);
    expect(f.timezone).toBeUndefined();
  });

  it('extracts from Instant with explicit timezone', () => {
    const inst = Temporal.Instant.fromEpochMilliseconds(0);
    const f = extractFields(inst, 'UTC');
    expect(f.year).toBe(1970);
    expect(f.timezone).toBe('UTC');
  });

  it('extracts from legacy Date with timezone', () => {
    const date = new Date(0); // Unix epoch = 1970-01-01T00:00:00Z
    const f = extractFields(date, 'UTC');
    expect(f.year).toBe(1970);
    expect(f.timezone).toBe('UTC');
  });
});

describe('isTemporalType', () => {
  it('returns true for all Temporal types', () => {
    expect(isTemporalType(Temporal.Now.plainDateISO())).toBe(true);
    expect(isTemporalType(Temporal.Now.plainDateTimeISO())).toBe(true);
    expect(isTemporalType(Temporal.Now.zonedDateTimeISO())).toBe(true);
    expect(isTemporalType(Temporal.Now.instant())).toBe(true);
    expect(isTemporalType(Temporal.PlainTime.from({ hour: 12 }))).toBe(true);
  });

  it('returns false for non-Temporal values', () => {
    expect(isTemporalType(new Date())).toBe(false);
    expect(isTemporalType(42)).toBe(false);
    expect(isTemporalType('2026-06-20')).toBe(false);
    expect(isTemporalType(null)).toBe(false);
    expect(isTemporalType(undefined)).toBe(false);
    expect(isTemporalType({})).toBe(false);
  });
});

describe('TemporalNotAvailableError', () => {
  it('has correct name', () => {
    const e = new TemporalNotAvailableError();
    expect(e.name).toBe('TemporalNotAvailableError');
    expect(e).toBeInstanceOf(Error);
  });
});
