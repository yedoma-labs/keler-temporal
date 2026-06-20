import { TemporalConversionError, TemporalNotAvailableError } from './errors.js';
import { findAdapter } from './registry.js';
import type { DateTimeFields, ToTemporalOptions } from './types.js';

function assertTemporalAvailable(): void {
  if (typeof globalThis.Temporal === 'undefined') {
    throw new TemporalNotAvailableError();
  }
}

function isTemporalZonedDateTime(v: unknown): v is Temporal.ZonedDateTime {
  return v instanceof Temporal.ZonedDateTime;
}

function isTemporalPlainDate(v: unknown): v is Temporal.PlainDate {
  return v instanceof Temporal.PlainDate;
}

function isTemporalPlainDateTime(v: unknown): v is Temporal.PlainDateTime {
  return v instanceof Temporal.PlainDateTime;
}

function isTemporalInstant(v: unknown): v is Temporal.Instant {
  return v instanceof Temporal.Instant;
}

function isTemporalPlainTime(v: unknown): v is Temporal.PlainTime {
  return v instanceof Temporal.PlainTime;
}

function disambiguationFor(
  options?: ToTemporalOptions,
): 'compatible' | 'earlier' | 'later' | 'reject' {
  return options?.disambiguation ?? 'compatible';
}

// ─── toTemporal overloads ────────────────────────────────────────────────────

// Temporal pass-through
export function toTemporal(value: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
export function toTemporal(value: Temporal.PlainDate): Temporal.PlainDate;
export function toTemporal(value: Temporal.PlainTime): Temporal.PlainTime;

// PlainDateTime + timezone → ZonedDateTime (disambiguation applies here)
export function toTemporal(
  value: Temporal.PlainDateTime,
  timezone: string,
  options?: ToTemporalOptions,
): Temporal.ZonedDateTime;
// PlainDateTime without timezone → pass through
export function toTemporal(value: Temporal.PlainDateTime): Temporal.PlainDateTime;

// Instant + timezone → ZonedDateTime
export function toTemporal(value: Temporal.Instant, timezone: string): Temporal.ZonedDateTime;
// Instant without timezone → pass through
export function toTemporal(value: Temporal.Instant): Temporal.Instant;

// Legacy types always require timezone
export function toTemporal(
  value: Date | number,
  timezone: string,
  options?: ToTemporalOptions,
): Temporal.ZonedDateTime;

// Adapter catch-all
export function toTemporal(
  value: unknown,
  timezone: string,
  options?: ToTemporalOptions,
): Temporal.ZonedDateTime;

export function toTemporal(
  value: unknown,
  timezone?: string,
  options?: ToTemporalOptions,
):
  | Temporal.ZonedDateTime
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.Instant
  | Temporal.PlainTime {
  assertTemporalAvailable();

  if (isTemporalZonedDateTime(value)) return value;
  if (isTemporalPlainDate(value)) return value;
  if (isTemporalPlainTime(value)) return value;

  if (isTemporalPlainDateTime(value)) {
    // With timezone: convert and apply disambiguation for DST-ambiguous wall-clock times
    if (timezone) {
      return value.toZonedDateTime(timezone, { disambiguation: disambiguationFor(options) });
    }
    return value;
  }

  if (isTemporalInstant(value)) {
    if (timezone) return value.toZonedDateTimeISO(timezone);
    return value;
  }

  if (value instanceof Date) {
    if (!timezone) {
      throw new TemporalConversionError(
        'timezone is required when converting a Date to Temporal.ZonedDateTime',
      );
    }
    return Temporal.Instant.fromEpochMilliseconds(value.getTime()).toZonedDateTimeISO(timezone);
  }

  if (typeof value === 'number') {
    if (!timezone) {
      throw new TemporalConversionError(
        'timezone is required when converting epoch ms to Temporal.ZonedDateTime',
      );
    }
    return Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO(timezone);
  }

  const adapter = findAdapter(value);
  if (adapter) {
    const tz = timezone ?? adapter.getTimezone?.(value);
    if (!tz) {
      throw new TemporalConversionError(
        `timezone is required when converting via adapter "${adapter.name}"`,
      );
    }
    const epochMs = adapter.toEpochMs(value);
    return Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(tz);
  }

  throw new TemporalConversionError(
    `Cannot convert value of type "${typeof value}" to Temporal. ` +
      'Register an adapter with registerAdapter() for custom date types.',
  );
}

// ─── fromTemporal ───────────────────────────────────────────────────────────

export interface FromTemporalOptions {
  /**
   * PlainDateTime-as-UTC conversion is lossy for non-UTC consumers.
   * Pass this explicitly to acknowledge the behaviour.
   */
  plainDateTimeAsUTC?: boolean;
}

export function fromTemporal(
  value: Temporal.ZonedDateTime | Temporal.Instant | Temporal.PlainDateTime,
  _options?: FromTemporalOptions,
): Date {
  assertTemporalAvailable();

  // NOTE: Temporal supports nanosecond precision; Date only supports milliseconds.
  // Sub-millisecond values are silently truncated.
  if (isTemporalInstant(value)) {
    return new Date(Number(value.epochMilliseconds));
  }
  if (isTemporalZonedDateTime(value)) {
    return new Date(Number(value.epochMilliseconds));
  }
  if (isTemporalPlainDateTime(value)) {
    // PlainDateTime carries no timezone; we treat it as UTC here.
    // This matches the behaviour of `new Date('2026-06-20T14:30:00')` in most runtimes.
    return new Date(Number(value.toZonedDateTime('UTC').epochMilliseconds));
  }

  // TypeScript types prevent reaching here, but guard for JS callers
  throw new TemporalConversionError(
    'fromTemporal only accepts ZonedDateTime, Instant, or PlainDateTime. ' +
      'PlainDate and PlainTime have no epoch equivalent.',
  );
}

// ─── toEpochMs ──────────────────────────────────────────────────────────────

export function toEpochMs(value: unknown): number {
  assertTemporalAvailable();

  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;

  if (isTemporalInstant(value)) return Number(value.epochMilliseconds);
  if (isTemporalZonedDateTime(value)) return Number(value.epochMilliseconds);
  if (isTemporalPlainDateTime(value)) return Number(value.toZonedDateTime('UTC').epochMilliseconds);

  const adapter = findAdapter(value);
  if (adapter) return adapter.toEpochMs(value);

  throw new TemporalConversionError(
    `Cannot extract epoch ms from value of type "${typeof value}"`,
  );
}

// ─── extractFields ──────────────────────────────────────────────────────────

export function extractFields(value: unknown, timezone?: string): DateTimeFields {
  assertTemporalAvailable();

  if (isTemporalZonedDateTime(value)) {
    return {
      year: value.year,
      month: value.month,
      day: value.day,
      hour: value.hour,
      minute: value.minute,
      second: value.second,
      millisecond: value.millisecond,
      dayOfWeek: value.dayOfWeek,
      timezone: value.timeZoneId,
    };
  }

  if (isTemporalPlainDateTime(value)) {
    return {
      year: value.year,
      month: value.month,
      day: value.day,
      hour: value.hour,
      minute: value.minute,
      second: value.second,
      millisecond: value.millisecond,
      dayOfWeek: value.dayOfWeek,
    };
  }

  if (isTemporalPlainDate(value)) {
    return {
      year: value.year,
      month: value.month,
      day: value.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      dayOfWeek: value.dayOfWeek,
    };
  }

  if (isTemporalInstant(value)) {
    return extractFields(value.toZonedDateTimeISO(timezone ?? 'UTC'));
  }

  if (value instanceof Date || typeof value === 'number') {
    return extractFields(toTemporal(value, timezone ?? 'UTC'));
  }

  const adapter = findAdapter(value);
  if (adapter) {
    const tz = timezone ?? adapter.getTimezone?.(value) ?? 'UTC';
    return extractFields(toTemporal(value, tz));
  }

  throw new TemporalConversionError(`Cannot extract fields from value of type "${typeof value}"`);
}

// ─── isTemporalType guard ────────────────────────────────────────────────────

export function isTemporalType(
  value: unknown,
): value is
  | Temporal.ZonedDateTime
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.Instant
  | Temporal.PlainTime {
  if (typeof globalThis.Temporal === 'undefined') return false;
  return (
    value instanceof Temporal.ZonedDateTime ||
    value instanceof Temporal.PlainDate ||
    value instanceof Temporal.PlainDateTime ||
    value instanceof Temporal.Instant ||
    value instanceof Temporal.PlainTime
  );
}
