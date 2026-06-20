import { afterEach, describe, expect, it } from 'vitest';
import { toTemporal } from '../converters.js';
import { clearAdapters, registerAdapter } from '../registry.js';
import { dayjsAdapter } from '../adapters/dayjs.js';
import { luxonAdapter } from '../adapters/luxon.js';
import { momentAdapter } from '../adapters/moment.js';

const EPOCH_MS = 1_750_000_000_000;

afterEach(() => {
  clearAdapters();
});

// ─── mock objects that look like the real libs ───────────────────────────────

const mockMoment = {
  _isAMomentObject: true as const,
  valueOf: () => EPOCH_MS,
  utcOffset: () => 0,
  isUtc: () => false,
  toISOString: () => new Date(EPOCH_MS).toISOString(),
};

const mockLuxon = {
  isLuxonDateTime: true as const,
  valueOf: () => EPOCH_MS,
  zoneName: 'America/New_York',
  isValid: true,
};

const mockDayjs = {
  $isDayjsObject: true as const,
  valueOf: () => EPOCH_MS,
  $x: { $timezone: 'Asia/Tokyo' },
};

describe('momentAdapter', () => {
  it('detects moment-like objects', () => {
    expect(momentAdapter.detect(mockMoment)).toBe(true);
    expect(momentAdapter.detect({ not: 'moment' })).toBe(false);
    expect(momentAdapter.detect(null)).toBe(false);
  });

  it('returns epoch ms', () => {
    expect(momentAdapter.toEpochMs(mockMoment)).toBe(EPOCH_MS);
  });

  it('toTemporal converts moment-like with timezone', () => {
    registerAdapter(momentAdapter);
    const zdt = toTemporal(mockMoment, 'UTC');
    expect(zdt).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(Number(zdt.epochMilliseconds)).toBe(EPOCH_MS);
  });
});

describe('luxonAdapter', () => {
  it('detects luxon-like objects', () => {
    expect(luxonAdapter.detect(mockLuxon)).toBe(true);
    expect(luxonAdapter.detect({ isLuxonDateTime: false })).toBe(false);
  });

  it('returns epoch ms', () => {
    expect(luxonAdapter.toEpochMs(mockLuxon)).toBe(EPOCH_MS);
  });

  it('getTimezone returns zoneName', () => {
    expect(luxonAdapter.getTimezone!(mockLuxon)).toBe('America/New_York');
  });

  it('toTemporal uses luxon zone when no timezone arg', () => {
    registerAdapter(luxonAdapter);
    const zdt = toTemporal(mockLuxon, 'America/New_York');
    expect(zdt.timeZoneId).toBe('America/New_York');
  });
});

describe('dayjsAdapter', () => {
  it('detects dayjs-like objects', () => {
    expect(dayjsAdapter.detect(mockDayjs)).toBe(true);
    expect(dayjsAdapter.detect({ $isDayjsObject: false })).toBe(false);
  });

  it('returns epoch ms', () => {
    expect(dayjsAdapter.toEpochMs(mockDayjs)).toBe(EPOCH_MS);
  });

  it('getTimezone reads $x.$timezone', () => {
    expect(dayjsAdapter.getTimezone!(mockDayjs)).toBe('Asia/Tokyo');
  });

  it('getTimezone returns undefined without timezone plugin', () => {
    const plain = { $isDayjsObject: true as const, valueOf: () => EPOCH_MS };
    expect(dayjsAdapter.getTimezone!(plain)).toBeUndefined();
  });
});
