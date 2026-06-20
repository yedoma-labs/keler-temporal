/**
 * Integration tests: full pipelines from legacy Date → compat → Temporal.
 * These verify that the layers compose correctly end-to-end.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromTemporal, toTemporal } from '../converters.js';
import {
  addDays,
  differenceInDays,
  format,
  isBefore,
  parseISO,
  startOfMonth,
} from '../compat/index.js';
import { clearAdapters, registerAdapter } from '../registry.js';
import { momentAdapter } from '../adapters/moment.js';
import { luxonAdapter } from '../adapters/luxon.js';
import { disableMigrationWarnings, enableMigrationWarnings } from '../warnings.js';

afterEach(() => {
  clearAdapters();
  disableMigrationWarnings();
});

const TZ = 'Europe/Berlin';

describe('legacy Date → compat → back to Date', () => {
  it('round-trips date arithmetic via compat', () => {
    const original = new Date('2026-06-20T12:00:00Z');
    const zdt = toTemporal(original, 'UTC');
    const result = addDays(zdt, 7) as Temporal.ZonedDateTime;
    const back = fromTemporal(result);

    const expected = new Date('2026-06-27T12:00:00Z');
    expect(back.getTime()).toBe(expected.getTime());
  });

  it('format a legacy Date via compat', () => {
    const date = new Date('2026-06-20T00:00:00Z');
    const zdt = toTemporal(date, 'UTC');
    expect(format(zdt, 'yyyy-MM-dd')).toBe('2026-06-20');
  });

  it('legacy Date + compat comparison pipeline', () => {
    const dateA = new Date('2026-06-01T00:00:00Z');
    const dateB = new Date('2026-06-20T00:00:00Z');
    const zdtA = toTemporal(dateA, 'UTC');
    const zdtB = toTemporal(dateB, 'UTC');
    expect(isBefore(zdtA, zdtB)).toBe(true);
  });

  it('startOfMonth → differenceInDays pipeline', () => {
    const someDate = new Date('2026-06-20T00:00:00Z');
    const zdt = toTemporal(someDate, 'UTC');
    const som = startOfMonth(zdt) as Temporal.ZonedDateTime;
    const days = differenceInDays(som, zdt);
    expect(days).toBe(19); // June 1 → June 20 = 19 days
  });
});

describe('adapter + compat pipeline', () => {
  it('moment-like → toTemporal → compat → format', () => {
    registerAdapter(momentAdapter);
    const momentLike = {
      _isAMomentObject: true as const,
      valueOf: () => new Date('2026-06-20T12:00:00Z').getTime(),
      utcOffset: () => 0,
      isUtc: () => true,
      toISOString: () => '2026-06-20T12:00:00.000Z',
    };

    const zdt = toTemporal(momentLike, 'UTC');
    expect(format(zdt, 'yyyy-MM-dd')).toBe('2026-06-20');
  });

  it('luxon-like → toTemporal → compat → addDays', () => {
    registerAdapter(luxonAdapter);
    const luxonLike = {
      isLuxonDateTime: true as const,
      valueOf: () => new Date('2026-06-20T00:00:00Z').getTime(),
      zoneName: 'UTC',
      isValid: true,
    };

    const zdt = toTemporal(luxonLike, 'UTC');
    const result = addDays(zdt, 10) as Temporal.ZonedDateTime;
    expect(result.day).toBe(30);
  });
});

describe('migration warnings fire in compat pipeline', () => {
  it('warning fires when format() receives legacy Date', () => {
    enableMigrationWarnings({ level: 'warn' });
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const legacyDate = new Date('2026-06-20T00:00:00Z');
    format(legacyDate as unknown as Temporal.ZonedDateTime, 'yyyy-MM-dd');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain('[keler]');
    spy.mockRestore();
  });

  it('no warning when compat receives Temporal type', () => {
    enableMigrationWarnings({ level: 'warn' });
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const zdt = Temporal.ZonedDateTime.from('2026-06-20T12:00:00+02:00[Europe/Berlin]');
    format(zdt, 'yyyy-MM-dd');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('parseISO → compat pipeline', () => {
  it('parseISO result feeds directly into addDays', () => {
    disableMigrationWarnings();
    const parsed = parseISO('2026-06-20') as Temporal.PlainDate;
    const result = addDays(parsed, 5) as Temporal.PlainDate;
    expect(result.day).toBe(25);
    expect(format(result, 'yyyy-MM-dd')).toBe('2026-06-25');
  });

  it('parseISO ZonedDateTime feeds into fromTemporal', () => {
    const parsed = parseISO('2026-06-20T14:30:00+02:00[Europe/Berlin]') as Temporal.ZonedDateTime;
    const date = fromTemporal(parsed);
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(Number(parsed.epochMilliseconds));
  });
});

describe('timezone-aware pipeline', () => {
  it('same UTC instant formats differently in different zones', () => {
    const epochMs = new Date('2026-06-20T22:00:00Z').getTime();
    const zdtBerlin = toTemporal(epochMs, 'Europe/Berlin');
    const zdtTokyo = toTemporal(epochMs, 'Asia/Tokyo');

    const berlinFormatted = format(zdtBerlin, 'yyyy-MM-dd HH:mm');
    const tokyoFormatted = format(zdtTokyo, 'yyyy-MM-dd HH:mm');

    // Berlin: Jun 21 00:00 (UTC+2 in summer); Tokyo: Jun 21 07:00 (UTC+9)
    expect(berlinFormatted).not.toBe(tokyoFormatted);
    expect(berlinFormatted).toContain('2026-06-21');
    expect(tokyoFormatted).toContain('2026-06-21');
  });
});
