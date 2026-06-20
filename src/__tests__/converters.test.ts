import { describe, expect, it } from 'vitest';
import { extractFields, fromTemporal, isTemporalType, toEpochMs, toTemporal } from '../converters.js';

const TZ = 'Europe/Berlin';
const EPOCH_MS = 1_750_000_000_000; // 2025-06-15T10:26:40.000Z approx

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

    it('returns PlainDateTime as-is', () => {
      const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 6, day: 20, hour: 12 });
      expect(toTemporal(pdt)).toBe(pdt);
    });

    it('returns Instant as-is', () => {
      const inst = Temporal.Now.instant();
      expect(toTemporal(inst)).toBe(inst);
    });

    it('returns PlainTime as-is', () => {
      const pt = Temporal.PlainTime.from({ hour: 12, minute: 30 });
      expect(toTemporal(pt)).toBe(pt);
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

    it('throws without timezone for Date', () => {
      expect(() => (toTemporal as (v: unknown, tz?: string) => unknown)(new Date(), undefined)).toThrow(
        'timezone is required',
      );
    });
  });

  describe('number (epoch ms) conversion', () => {
    it('converts epoch ms to ZonedDateTime', () => {
      const result = toTemporal(EPOCH_MS, 'UTC');
      expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
      expect(Number(result.epochMilliseconds)).toBe(EPOCH_MS);
    });

    it('throws without timezone for number', () => {
      expect(() => (toTemporal as (v: unknown, tz?: string) => unknown)(EPOCH_MS, undefined)).toThrow(
        'timezone is required',
      );
    });
  });

  describe('unknown value', () => {
    it('throws for unsupported values', () => {
      expect(() => toTemporal('not-a-date', 'UTC')).toThrow('Cannot convert value');
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
    const result = fromTemporal(inst);
    expect(result.getTime()).toBe(EPOCH_MS);
  });

  it('converts PlainDateTime to Date (treats as UTC)', () => {
    const pdt = Temporal.PlainDateTime.from({ year: 2026, month: 1, day: 1, hour: 0 });
    const result = fromTemporal(pdt);
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCFullYear()).toBe(2026);
  });
});

describe('toEpochMs', () => {
  it('returns Date time', () => {
    expect(toEpochMs(new Date(EPOCH_MS))).toBe(EPOCH_MS);
  });

  it('returns number unchanged', () => {
    expect(toEpochMs(EPOCH_MS)).toBe(EPOCH_MS);
  });

  it('returns Instant epoch ms', () => {
    const inst = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS);
    expect(toEpochMs(inst)).toBe(EPOCH_MS);
  });

  it('returns ZonedDateTime epoch ms', () => {
    const zdt = Temporal.Instant.fromEpochMilliseconds(EPOCH_MS).toZonedDateTimeISO('UTC');
    expect(toEpochMs(zdt)).toBe(EPOCH_MS);
  });

  it('throws for unsupported value', () => {
    expect(() => toEpochMs('oops')).toThrow('Cannot extract epoch ms');
  });
});

describe('extractFields', () => {
  it('extracts from ZonedDateTime', () => {
    const zdt = Temporal.ZonedDateTime.from('2026-06-20T14:30:00+02:00[Europe/Berlin]');
    const f = extractFields(zdt);
    expect(f.year).toBe(2026);
    expect(f.month).toBe(6);
    expect(f.day).toBe(20);
    expect(f.hour).toBe(14);
    expect(f.minute).toBe(30);
    expect(f.timezone).toBe('Europe/Berlin');
  });

  it('extracts from PlainDate (time defaults to 0)', () => {
    const pd = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    const f = extractFields(pd);
    expect(f.year).toBe(2026);
    expect(f.hour).toBe(0);
    expect(f.timezone).toBeUndefined();
  });

  it('extracts from Date with timezone', () => {
    const date = new Date(EPOCH_MS);
    const f = extractFields(date, 'UTC');
    expect(typeof f.year).toBe('number');
    expect(f.timezone).toBe('UTC');
  });
});

describe('isTemporalType', () => {
  it('returns true for Temporal types', () => {
    expect(isTemporalType(Temporal.Now.plainDateISO())).toBe(true);
    expect(isTemporalType(Temporal.Now.zonedDateTimeISO())).toBe(true);
    expect(isTemporalType(Temporal.Now.instant())).toBe(true);
  });

  it('returns false for non-Temporal values', () => {
    expect(isTemporalType(new Date())).toBe(false);
    expect(isTemporalType(42)).toBe(false);
    expect(isTemporalType(null)).toBe(false);
  });
});
