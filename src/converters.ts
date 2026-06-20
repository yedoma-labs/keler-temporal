import { TemporalConversionError, TemporalNotAvailableError } from './errors.js';
import { findAdapter } from './registry.js';
import type { DateTimeFields, DisambiguationOption, ToTemporalOptions } from './types.js';

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

export function toTemporal(value: Temporal.ZonedDateTime): Temporal.ZonedDateTime;
export function toTemporal(value: Temporal.PlainDate): Temporal.PlainDate;
export function toTemporal(value: Temporal.PlainDateTime): Temporal.PlainDateTime;
export function toTemporal(value: Temporal.Instant): Temporal.Instant;
export function toTemporal(value: Temporal.PlainTime): Temporal.PlainTime;
export function toTemporal(
  value: Date | number,
  timezone: string,
  options?: ToTemporalOptions,
): Temporal.ZonedDateTime;
export function toTemporal(
  value: unknown,
  timezone: string,
  options?: ToTemporalOptions,
): Temporal.ZonedDateTime;
export function toTemporal(
  value: unknown,
  timezone?: string,
  options?: ToTemporalOptions,
): Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.Instant | Temporal.PlainTime {
  assertTemporalAvailable();

  if (isTemporalZonedDateTime(value)) return value;
  if (isTemporalPlainDate(value)) return value;
  if (isTemporalPlainDateTime(value)) return value;
  if (isTemporalInstant(value)) return value;
  if (isTemporalPlainTime(value)) return value;

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

export function fromTemporal(
  value: Temporal.ZonedDateTime | Temporal.Instant | Temporal.PlainDateTime,
  options?: { truncateTo?: 'ms' },
): Date {
  assertTemporalAvailable();

  let epochMs: number;

  if (isTemporalInstant(value)) {
    epochMs = Number(value.epochMilliseconds);
  } else if (isTemporalZonedDateTime(value)) {
    epochMs = Number(value.epochMilliseconds);
  } else if (isTemporalPlainDateTime(value)) {
    // PlainDateTime has no timezone — treat as UTC
    epochMs = Number(value.toZonedDateTime('UTC').epochMilliseconds);
  } else {
    throw new TemporalConversionError(
      'fromTemporal only accepts ZonedDateTime, Instant, or PlainDateTime. ' +
        'PlainDate and PlainTime have no epoch equivalent.',
    );
  }

  if (options?.truncateTo === 'ms' || options === undefined) {
    return new Date(epochMs);
  }

  return new Date(epochMs);
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
    const tz = timezone ?? 'UTC';
    const zdt = value.toZonedDateTimeISO(tz);
    return extractFields(zdt);
  }

  // Legacy Date / number / adapter
  if (value instanceof Date || typeof value === 'number') {
    const tz = timezone ?? 'UTC';
    const zdt = toTemporal(value, tz);
    return extractFields(zdt);
  }

  const adapter = findAdapter(value);
  if (adapter) {
    const tz = timezone ?? adapter.getTimezone?.(value) ?? 'UTC';
    const zdt = toTemporal(value, tz);
    return extractFields(zdt);
  }

  throw new TemporalConversionError(`Cannot extract fields from value of type "${typeof value}"`);
}

// ─── isTemporalType guard ────────────────────────────────────────────────────

export function isTemporalType(value: unknown): value is Temporal.ZonedDateTime | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.Instant | Temporal.PlainTime {
  if (typeof globalThis.Temporal === 'undefined') return false;
  return (
    value instanceof Temporal.ZonedDateTime ||
    value instanceof Temporal.PlainDate ||
    value instanceof Temporal.PlainDateTime ||
    value instanceof Temporal.Instant ||
    value instanceof Temporal.PlainTime
  );
}

// ─── disambiguationFor re-export for compat ─────────────────────────────────

export { disambiguationFor };
export type { DisambiguationOption };
