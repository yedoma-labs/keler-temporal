import { afterEach, describe, expect, it } from 'vitest';
import { getClock, resetClock } from '../clock.js';
import {
  freezeNow,
  makeInstant,
  makePlainDate,
  makePlainDateTime,
  makeZonedDateTime,
  unfreezeNow,
} from '../testing/index.js';

afterEach(() => {
  resetClock();
});

const FROZEN_ISO = '2026-01-01T00:00:00Z';

describe('freezeNow', () => {
  it('freezes the clock to a fixed instant', () => {
    const disposable = freezeNow(FROZEN_ISO);
    const clock = getClock();
    expect(clock.instant().epochMilliseconds).toBe(
      Temporal.Instant.from(FROZEN_ISO).epochMilliseconds,
    );
    disposable[Symbol.dispose]();
  });

  it('auto-unfreezes via Symbol.dispose', () => {
    const before = getClock().instant().epochMilliseconds;
    {
      using _ = freezeNow(FROZEN_ISO);
      expect(getClock().instant().epochMilliseconds).toBe(
        Temporal.Instant.from(FROZEN_ISO).epochMilliseconds,
      );
    }
    // After dispose, clock should return current time (not frozen)
    const after = getClock().instant().epochMilliseconds;
    expect(after).not.toBe(Temporal.Instant.from(FROZEN_ISO).epochMilliseconds);
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('frozen zonedDateTimeISO returns correct zone', () => {
    using _ = freezeNow(FROZEN_ISO);
    const zdt = getClock().zonedDateTimeISO('America/New_York');
    expect(zdt.year).toBe(2025); // UTC midnight Jan 1 = Dec 31 in NY
    expect(zdt.timeZoneId).toBe('America/New_York');
  });
});

describe('unfreezeNow', () => {
  it('resets the clock', () => {
    freezeNow(FROZEN_ISO);
    unfreezeNow();
    const now = getClock().instant().epochMilliseconds;
    expect(now).not.toBe(Temporal.Instant.from(FROZEN_ISO).epochMilliseconds);
  });
});

describe('makePlainDate', () => {
  it('creates a PlainDate from fields', () => {
    const d = makePlainDate({ year: 2026, month: 6, day: 20 });
    expect(d).toBeInstanceOf(Temporal.PlainDate);
    expect(d.year).toBe(2026);
    expect(d.month).toBe(6);
    expect(d.day).toBe(20);
  });
});

describe('makePlainDateTime', () => {
  it('creates PlainDateTime with time defaults to 0', () => {
    const dt = makePlainDateTime({ year: 2026, month: 6, day: 20 });
    expect(dt).toBeInstanceOf(Temporal.PlainDateTime);
    expect(dt.hour).toBe(0);
    expect(dt.minute).toBe(0);
  });

  it('creates PlainDateTime with explicit time', () => {
    const dt = makePlainDateTime({ year: 2026, month: 6, day: 20, hour: 14, minute: 30 });
    expect(dt.hour).toBe(14);
    expect(dt.minute).toBe(30);
  });
});

describe('makeZonedDateTime', () => {
  it('creates ZonedDateTime from ISO string + timezone', () => {
    const zdt = makeZonedDateTime('2026-06-20T14:30:00', 'Europe/Berlin');
    expect(zdt).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(zdt.timeZoneId).toBe('Europe/Berlin');
    expect(zdt.hour).toBe(14);
  });

  it('creates ZonedDateTime from fields', () => {
    const zdt = makeZonedDateTime({ year: 2026, month: 6, day: 20, hour: 9, timezone: 'UTC' });
    expect(zdt.timeZoneId).toBe('UTC');
    expect(zdt.hour).toBe(9);
  });

  it('defaults time fields to 0', () => {
    const zdt = makeZonedDateTime({ year: 2026, month: 1, day: 1, timezone: 'UTC' });
    expect(zdt.hour).toBe(0);
    expect(zdt.minute).toBe(0);
  });
});

describe('makeInstant', () => {
  it('creates Instant from ISO string', () => {
    const inst = makeInstant('2026-06-20T12:00:00Z');
    expect(inst).toBeInstanceOf(Temporal.Instant);
    expect(inst.toString()).toContain('2026-06-20');
  });
});
