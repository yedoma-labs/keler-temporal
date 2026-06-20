import type { Clock } from '../clock.js';
import { getClock, resetClock, setClock } from '../clock.js';

// ─── Clock freeze ────────────────────────────────────────────────────────────

interface FrozenDisposable {
  [Symbol.dispose](): void;
}

class FrozenClock implements Clock {
  readonly #frozen: Temporal.Instant;

  constructor(iso: string) {
    this.#frozen = Temporal.Instant.from(iso);
  }

  instant(): Temporal.Instant {
    return this.#frozen;
  }

  zonedDateTimeISO(timezone?: string): Temporal.ZonedDateTime {
    return this.#frozen.toZonedDateTimeISO(timezone ?? Temporal.Now.timeZoneId());
  }

  plainDateISO(timezone?: string): Temporal.PlainDate {
    return this.zonedDateTimeISO(timezone).toPlainDate();
  }

  plainDateTimeISO(timezone?: string): Temporal.PlainDateTime {
    return this.zonedDateTimeISO(timezone).toPlainDateTime();
  }

  plainTimeISO(timezone?: string): Temporal.PlainTime {
    return this.zonedDateTimeISO(timezone).toPlainTime();
  }

  timeZoneId(): string {
    return Temporal.Now.timeZoneId();
  }
}

/**
 * Pin all keler-temporal clock functions to a fixed instant.
 * Returns a Disposable — use with `using` (TypeScript 5.2+) for auto-cleanup.
 *
 * Note: only affects functions imported from keler-temporal (toTemporal, compat, etc.).
 * Direct calls to `Temporal.Now.*` are not affected.
 */
export function freezeNow(iso: string): FrozenDisposable {
  setClock(new FrozenClock(iso));
  return {
    [Symbol.dispose](): void {
      resetClock();
    },
  };
}

export function unfreezeNow(): void {
  resetClock();
}

export function getFrozenClock(): Clock {
  return getClock();
}

// ─── Factories ───────────────────────────────────────────────────────────────

interface PlainDateFields {
  year: number;
  month: number;
  day: number;
}

interface PlainDateTimeFields extends PlainDateFields {
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}

interface ZonedDateTimeFields extends PlainDateTimeFields {
  timezone: string;
}

export function makePlainDate(fields: PlainDateFields): Temporal.PlainDate {
  return Temporal.PlainDate.from(fields);
}

export function makePlainDateTime(fields: PlainDateTimeFields): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from({
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour ?? 0,
    minute: fields.minute ?? 0,
    second: fields.second ?? 0,
    millisecond: fields.millisecond ?? 0,
  });
}

export function makeZonedDateTime(iso: string, timezone: string): Temporal.ZonedDateTime;
export function makeZonedDateTime(fields: ZonedDateTimeFields): Temporal.ZonedDateTime;
export function makeZonedDateTime(
  isoOrFields: string | ZonedDateTimeFields,
  timezone?: string,
): Temporal.ZonedDateTime {
  if (typeof isoOrFields === 'string') {
    const tz = timezone!;
    return Temporal.PlainDateTime.from(isoOrFields).toZonedDateTime(tz);
  }
  const f = isoOrFields;
  return Temporal.PlainDateTime.from({
    year: f.year,
    month: f.month,
    day: f.day,
    hour: f.hour ?? 0,
    minute: f.minute ?? 0,
    second: f.second ?? 0,
    millisecond: f.millisecond ?? 0,
  }).toZonedDateTime(f.timezone);
}

export function makeInstant(iso: string): Temporal.Instant {
  return Temporal.Instant.from(iso);
}

// ─── vitest plugin ───────────────────────────────────────────────────────────

/**
 * Vitest plugin that auto-resets the frozen clock after each test.
 * Add to vitest.config.ts plugins array.
 *
 * @example
 * import { kelorTemporalPlugin } from '@yedoma-labs/keler-temporal/testing'
 * export default defineConfig({ plugins: [kelorTemporalPlugin()] })
 */
export function kelorTemporalPlugin(): { name: string; afterEach(): void } {
  return {
    name: 'keler-temporal',
    afterEach(): void {
      resetClock();
    },
  };
}
