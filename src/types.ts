export type NativeTemporalType =
  | Temporal.Instant
  | Temporal.ZonedDateTime
  | Temporal.PlainDateTime
  | Temporal.PlainDate
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.PlainMonthDay;

export type LegacyDateInput = Date | number;

export type TemporalInput = NativeTemporalType | LegacyDateInput;

export type TemporalOutput<T> = T extends Temporal.ZonedDateTime
  ? Temporal.ZonedDateTime
  : T extends Temporal.PlainDate
    ? Temporal.PlainDate
    : T extends Temporal.PlainDateTime
      ? Temporal.PlainDateTime
      : T extends Temporal.Instant
        ? Temporal.Instant
        : T extends Temporal.PlainTime
          ? Temporal.PlainTime
          : Temporal.ZonedDateTime;

export interface TemporalAdapter<T = unknown> {
  readonly name: string;
  detect(value: unknown): value is T;
  toEpochMs(value: T): number;
  getTimezone?(value: T): string | undefined;
}

export type DisambiguationOption = 'compatible' | 'earlier' | 'later' | 'reject';

export interface ToTemporalOptions {
  disambiguation?: DisambiguationOption;
}

export interface DateTimeFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  dayOfWeek: number;
  timezone?: string;
}
