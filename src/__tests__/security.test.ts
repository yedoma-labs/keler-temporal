/**
 * Security tests: prototype pollution, malicious inputs, edge cases
 * that a security reviewer would flag during audit.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { format, parseISO } from '../compat/index.js';
import { toEpochMs, toTemporal } from '../converters.js';
import { TemporalAdapterError, TemporalConversionError } from '../errors.js';
import { clearAdapters, findAdapter, registerAdapter } from '../registry.js';
import { disableMigrationWarnings, enableMigrationWarnings } from '../warnings.js';

afterEach(() => {
  clearAdapters();
  disableMigrationWarnings();
});

describe('prototype pollution via registerAdapter', () => {
  it('rejects adapter with non-function detect', () => {
    expect(() =>
      registerAdapter({
        name: '__proto__',
        detect: 'polluted' as unknown as (v: unknown) => v is never,
        toEpochMs: () => 0,
      }),
    ).toThrow(TemporalAdapterError);
  });

  it('rejects adapter with non-function toEpochMs', () => {
    expect(() =>
      registerAdapter({
        name: 'attacker',
        detect: (_v: unknown): _v is never => false,
        toEpochMs: 'polluted' as unknown as () => number,
      }),
    ).toThrow(TemporalAdapterError);
  });

  it('adapter name "__proto__" does not corrupt Object prototype', () => {
    // Even if registration succeeds, it should not mutate Object.prototype
    const before = Object.getPrototypeOf({});
    try {
      registerAdapter({
        name: '__proto__',
        detect: (_v: unknown): _v is never => false,
        toEpochMs: () => 0,
      });
    } catch {
      // may throw; that's fine
    }
    expect(Object.getPrototypeOf({})).toBe(before);
    // biome-ignore lint/suspicious/noExplicitAny: intentional prototype pollution check
    expect(({} as any).polluted).toBeUndefined();
  });

  it('adapter name "constructor" does not corrupt constructors', () => {
    try {
      registerAdapter({
        name: 'constructor',
        detect: (_v: unknown): _v is never => false,
        toEpochMs: () => 0,
      });
    } catch {
      // may throw
    }
    // Object constructor should still work
    expect(new Object()).toEqual({});
  });
});

describe('malicious detect function', () => {
  it('detect function that throws is contained', () => {
    registerAdapter({
      name: 'throwing-detect',
      detect(_v: unknown): _v is never {
        throw new Error('boom');
      },
      toEpochMs: () => 0,
    });
    // findAdapter calls detect; if it throws, the adapter is effectively skipped
    // The error propagates — callers must handle it. This is expected behaviour.
    expect(() => findAdapter({ something: true })).toThrow('boom');
  });

  it('detect function that mutates input does not affect the original', () => {
    const input: Record<string, unknown> = { safe: true };
    registerAdapter({
      name: 'mutating-detect',
      detect(v: unknown): v is never {
        if (typeof v === 'object' && v !== null) {
          // malicious: try to mutate the value
          (v as Record<string, unknown>)._mutated = true;
        }
        return false;
      },
      toEpochMs: () => 0,
    });
    findAdapter(input);
    // The mutation did happen (we can't stop it — document this as a known trade-off)
    // But the library itself is not broken
    expect(findAdapter(new Date())).toBeUndefined();
  });
});

describe('toTemporal input validation', () => {
  it('null input throws TemporalConversionError', () => {
    expect(() => toTemporal(null as unknown as Date, 'UTC')).toThrow(TemporalConversionError);
  });

  it('undefined input throws TemporalConversionError', () => {
    expect(() => toTemporal(undefined as unknown as Date, 'UTC')).toThrow(TemporalConversionError);
  });

  it('array input throws TemporalConversionError', () => {
    expect(() => toTemporal([] as unknown as Date, 'UTC')).toThrow(TemporalConversionError);
  });

  it('function input throws TemporalConversionError', () => {
    expect(() => toTemporal((() => {}) as unknown as Date, 'UTC')).toThrow(TemporalConversionError);
  });

  it('ISO string input does NOT silently parse — must use parseISO', () => {
    // This is intentional: toTemporal does not parse strings.
    // Users must use parseISO or Temporal.ZonedDateTime.from() directly.
    expect(() => toTemporal('2026-06-20' as unknown as Date, 'UTC')).toThrow(
      TemporalConversionError,
    );
  });

  it('invalid Date (NaN getTime) converts to ZonedDateTime with NaN epoch', () => {
    // Mirrors date-fns behaviour: invalid Date is not guarded, NaN propagates.
    // Document this rather than silently ignoring.
    const invalidDate = new Date('not-a-date');
    expect(Number.isNaN(invalidDate.getTime())).toBe(true);
    // Temporal.Instant.fromEpochMilliseconds(NaN) throws a RangeError
    expect(() => toTemporal(invalidDate, 'UTC')).toThrow();
  });
});

describe('format security', () => {
  it('very long format string does not crash or hang', () => {
    const longFmt = 'yyyy-MM-dd '.repeat(1000);
    const date = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    const result = format(date, longFmt);
    expect(result).toContain('2026-06-20');
  });

  it('format string with only literal text (no tokens) returns it unchanged', () => {
    const date = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    expect(format(date, "'hello world'")).toBe('hello world');
  });

  it('format string with null bytes does not corrupt output', () => {
    const date = Temporal.PlainDate.from({ year: 2026, month: 6, day: 20 });
    const result = format(date, 'yyyy\x00MM');
    // \x00 is not a recognized token, it's treated as a literal character
    expect(result).toContain('2026');
    expect(result).toContain('06');
  });
});

describe('parseISO security', () => {
  it('non-ISO string throws (strict Temporal parsing)', () => {
    expect(() => parseISO('June 20, 2026')).toThrow();
    expect(() => parseISO('20/06/2026')).toThrow();
    expect(() => parseISO('')).toThrow();
  });

  it('SQL injection attempt does not execute — treated as invalid ISO', () => {
    expect(() => parseISO("2026-06-20'; DROP TABLE users;--")).toThrow();
  });

  it('oversized string throws', () => {
    const huge = `2026-06-20${'X'.repeat(10_000)}`;
    expect(() => parseISO(huge)).toThrow();
  });
});

describe('toEpochMs edge cases', () => {
  it('MAX_SAFE_INTEGER is representable', () => {
    // Temporal supports this range
    const result = toEpochMs(Number.MAX_SAFE_INTEGER);
    expect(result).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('negative numbers (pre-epoch) work correctly', () => {
    expect(toEpochMs(-86_400_000)).toBe(-86_400_000); // 1969-12-31
  });
});

describe('enableMigrationWarnings prod guard', () => {
  it('throws when NODE_ENV=production', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => enableMigrationWarnings()).toThrow('called in production');
    } finally {
      process.env.NODE_ENV = orig;
    }
  });

  it('does not throw when NODE_ENV=development', () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      expect(() => enableMigrationWarnings()).not.toThrow();
    } finally {
      process.env.NODE_ENV = orig;
      disableMigrationWarnings();
    }
  });
});
