# @yedoma-labs/keler-temporal

<picture>
  <source media="(max-width: 640px)" srcset="https://raw.githubusercontent.com/yedoma-labs/assets/main/resized/banner-resized-mobile.png">
  <img src="https://raw.githubusercontent.com/yedoma-labs/assets/main/resized/banner-resized.png" alt="Project Header">
</picture>

[![CI](https://github.com/yedoma-labs/keler-temporal/actions/workflows/ci.yml/badge.svg)](https://github.com/yedoma-labs/keler-temporal/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@yedoma-labs/keler-temporal.svg)](https://www.npmjs.com/package/@yedoma-labs/keler-temporal)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **кэлэр** (Yakutian/Sakha) — _coming, future_

Bridge library for gradual migration from legacy date libraries (date-fns, moment.js, Luxon, Day.js) to the [TC39 Temporal API](https://tc39.es/proposal-temporal/).

Temporal is stable in Chrome 144+ and Node 24+, but migrating an existing codebase in one shot is impractical — this library solves that by providing converters, drop-in compat functions, and runtime migration warnings so you can replace legacy date code file-by-file without breaking anything. Your existing `Date` objects, moment instances, and Luxon DateTimes keep working while you adopt Temporal at your own pace.

## What it is

- **Converters**: `toTemporal()` / `fromTemporal()` — coerce any date value to/from native Temporal types
- **Compat layer**: drop-in replacements for common date-fns / moment functions that accept both `Date` and Temporal types
- **Migration warnings**: opt-in runtime warnings when legacy `Date` objects pass through compat functions
- **Adapter system**: plug in moment.js, Luxon, Day.js — or write your own adapter
- **Testing utilities**: `freezeNow()`, `makeZonedDateTime()` — deterministic time in tests

## What it is not

- Not a date formatting library. Use `Intl.DateTimeFormat` or Temporal's built-in `.toString()`.
- Not a replacement for the Temporal API itself. This is scaffolding to get there.
- Not a polyfill. Install [`temporal-polyfill`](https://github.com/nicolo-ribaudo/tc39-proposal-temporal-polyfill) separately if needed.

## Requirements

- Node 22+ or Chrome 144+ (native Temporal) **OR** `temporal-polyfill ^0.2.0` as a peer dep
- pnpm (project toolchain)

## Installation

```sh
pnpm add @yedoma-labs/keler-temporal
```

If your environment doesn't have Temporal natively (Node < 24, older browsers):

```sh
pnpm add temporal-polyfill
```

Then in your app entry point:

```ts
import { install } from 'temporal-polyfill/shim';
install();
```

## Quickstart

### 1. Convert legacy Dates to Temporal

```ts
import { toTemporal, fromTemporal } from '@yedoma-labs/keler-temporal';

const date = new Date('2026-06-20T14:30:00Z');
const zdt = toTemporal(date, 'Europe/Berlin');
// Temporal.ZonedDateTime<'Europe/Berlin'>

const back = fromTemporal(zdt);
// Date (same epoch ms, lossless round-trip)
```

### 2. Use compat functions during migration

```ts
import { addDays, format, startOfMonth } from '@yedoma-labs/keler-temporal/compat';

// Works with Date (legacy path)
format(new Date(), 'yyyy-MM-dd');

// Works with Temporal types (future-ready path)
const zdt = Temporal.Now.zonedDateTimeISO('Europe/Berlin');
format(zdt, 'yyyy-MM-dd HH:mm');
addDays(zdt, 7);
startOfMonth(zdt);
```

### 3. Enable migration warnings to find legacy usage

```ts
import { enableMigrationWarnings } from '@yedoma-labs/keler-temporal';

// Dev-only — throws in production
enableMigrationWarnings({ level: 'warn', stack: true });

// Now every Date passed to a compat function logs a warning with call site
format(new Date(), 'yyyy'); // [keler] format() (date-fns) called with legacy Date.
```

## API Reference

### Core (`@yedoma-labs/keler-temporal`)

#### `toTemporal(value, timezone?, options?)`

Converts any date value to a Temporal type.

| Input type | + `timezone` | Result |
|---|---|---|
| `Temporal.*` (any) | — | returned as-is |
| `Temporal.PlainDateTime` | ✓ | `ZonedDateTime` (disambiguation applies) |
| `Temporal.Instant` | ✓ | `ZonedDateTime` |
| `Date` / `number` | required | `ZonedDateTime` |
| registered adapter | optional | `ZonedDateTime` |

```ts
// PlainDateTime + timezone — DST disambiguation
toTemporal(pdt, 'America/New_York', { disambiguation: 'earlier' });

// epoch ms
toTemporal(Date.now(), 'UTC');

// Instant pass-through
toTemporal(Temporal.Now.instant()); // → Instant (no timezone)
```

Options: `{ disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject' }` (default `'compatible'`)

#### `fromTemporal(value)`

Converts a Temporal type to `Date`. PlainDateTime is interpreted as UTC. Sub-millisecond precision is truncated (Temporal supports nanoseconds; `Date` does not).

#### `toEpochMs(value)`

Extracts epoch milliseconds as a `number`. Accepts `Date`, `number`, or any Temporal type. PlainDateTime treated as UTC.

#### `extractFields(value, timezone?)`

Returns `DateTimeFields` — `{ year, month, day, hour, minute, second, millisecond, dayOfWeek, timezone? }`. `dayOfWeek` is ISO 8601 (1=Monday, 7=Sunday).

#### `isTemporalType(value)`

Type guard — returns `true` for any native Temporal type.

### Compat (`@yedoma-labs/keler-temporal/compat`)

All functions accept both `Date` and Temporal types. When migration warnings are enabled, passing a `Date` emits a warning.

| Function | Equivalent | Notes |
|---|---|---|
| `format(date, fmt)` | `date-fns/format` | 18 tokens, quoted literals `'...'` |
| `parseISO(str)` | `date-fns/parseISO` | Returns PlainDate / PlainDateTime / ZonedDateTime based on string shape |
| `isValid(value)` | `date-fns/isValid` | Returns `false` for non-date types |
| `addDays(date, n)` | `date-fns/addDays` | Preserves input type |
| `addMonths(date, n)` | `date-fns/addMonths` | Month-end clamped via Temporal `constrain` |
| `addYears(date, n)` | `date-fns/addYears` | |
| `subDays(date, n)` | `date-fns/subDays` | |
| `subMonths(date, n)` | `date-fns/subMonths` | |
| `isAfter(a, b)` | `date-fns/isAfter` | |
| `isBefore(a, b)` | `date-fns/isBefore` | |
| `isSameDay(a, b)` | `date-fns/isSameDay` | Compares calendar date only |
| `startOfDay(date)` | `date-fns/startOfDay` | |
| `endOfDay(date)` | `date-fns/endOfDay` | Returns `23:59:59.999999999` |
| `startOfMonth(date)` | `date-fns/startOfMonth` | |
| `endOfMonth(date)` | `date-fns/endOfMonth` | |
| `differenceInDays(a, b)` | `date-fns/differenceInDays` | |
| `differenceInMonths(a, b)` | `date-fns/differenceInMonths` | |

#### `format` tokens

| Token | Meaning | Example |
|---|---|---|
| `yyyy` | 4-digit year | `2026` |
| `yy` | 2-digit year | `26` |
| `MMMM` | full month name | `June` |
| `MMM` | abbrev month name | `Jun` |
| `MM` | zero-padded month | `06` |
| `M` | unpadded month | `6` |
| `dd` | zero-padded day | `20` |
| `d` | unpadded day | `5` |
| `EEEE` | full weekday name | `Saturday` |
| `EEE` | abbrev weekday name | `Sat` |
| `HH` | 24h zero-padded hour | `14` |
| `H` | 24h unpadded hour | `9` |
| `hh` | 12h zero-padded hour | `02` |
| `a` | AM / PM | `PM` |
| `mm` | zero-padded minute | `30` |
| `ss` | zero-padded second | `45` |
| `SSS` | zero-padded millisecond | `123` |

Wrap non-token text in single quotes: `"'Today is' yyyy-MM-dd"` → `Today is 2026-06-20`.

### Adapter system (`@yedoma-labs/keler-temporal`)

Register adapters to teach `toTemporal()` about third-party date types.

```ts
import { registerAdapter } from '@yedoma-labs/keler-temporal';
import { momentAdapter } from '@yedoma-labs/keler-temporal/adapters/moment';

registerAdapter(momentAdapter);

// Now moment instances convert automatically
const zdt = toTemporal(moment(), 'UTC');
```

Built-in adapters (zero runtime dependencies — they detect by duck-typing):

- `@yedoma-labs/keler-temporal/adapters/moment` — moment.js + moment-timezone
- `@yedoma-labs/keler-temporal/adapters/luxon` — Luxon `DateTime`
- `@yedoma-labs/keler-temporal/adapters/dayjs` — Day.js + dayjs-timezone

Custom adapter:

```ts
import { registerAdapter, type TemporalAdapter } from '@yedoma-labs/keler-temporal';

const myAdapter: TemporalAdapter<MyDateType> = {
  name: 'my-lib',
  detect(value): value is MyDateType {
    return typeof value === 'object' && value !== null && '_myFlag' in value;
  },
  toEpochMs(value) {
    return value.getEpochMs();
  },
  // optional:
  getTimezone(value) {
    return value.timezone;
  },
};

registerAdapter(myAdapter);
```

### Migration warnings (`@yedoma-labs/keler-temporal`)

```ts
import { enableMigrationWarnings, disableMigrationWarnings } from '@yedoma-labs/keler-temporal';

enableMigrationWarnings({
  level: 'warn',    // 'warn' | 'error' | 'silent'
  stack: true,      // include call site in warning
  ignore: ['format'], // skip specific function names
});

disableMigrationWarnings();
```

Calling `enableMigrationWarnings()` in `NODE_ENV=production` throws immediately.

### Testing utilities (`@yedoma-labs/keler-temporal/testing`)

```ts
import { freezeNow, makeZonedDateTime, kelorTemporalPlugin } from '@yedoma-labs/keler-temporal/testing';
```

#### `freezeNow(iso)`

Freezes `Temporal.Now.*` to a fixed instant. Returns a disposable — use with `using` (TypeScript 5.2+):

```ts
it('sends reminder at 09:00', () => {
  using _ = freezeNow('2026-06-20T09:00:00+00:00[UTC]');
  // Temporal.Now.instant() is frozen for the duration of this test
  expect(sendReminder()).toBe(true);
  // clock resets automatically when _ goes out of scope
});
```

#### `makeZonedDateTime(isoOrFields, timezone?)`

```ts
makeZonedDateTime('2026-06-20T14:30:00', 'Europe/Berlin');
// or
makeZonedDateTime({ year: 2026, month: 6, day: 20, timezone: 'UTC' });
```

#### `kelorTemporalPlugin()`

Vitest plugin — auto-resets the clock after each test (prevents frozen clock leaking between tests):

```ts
// vitest.config.ts
import { kelorTemporalPlugin } from '@yedoma-labs/keler-temporal/testing';

export default defineConfig({
  plugins: [kelorTemporalPlugin()],
  test: { setupFiles: ['./src/__tests__/setup.ts'] },
});
```

## Adapting from date-fns

| date-fns | keler-temporal/compat |
|---|---|
| `import { format } from 'date-fns'` | `import { format } from '@yedoma-labs/keler-temporal/compat'` |
| `format(date, 'yyyy-MM-dd')` | same |
| `addDays(date, 7)` | same (returns Temporal type) |
| `parseISO('2026-06-20')` | same (returns `Temporal.PlainDate`) |
| `isValid(value)` | same |

## FAQ / Gotchas

**`toTemporal` with a `Date` requires a timezone.**
`Date` is timezone-naive (UTC epoch + local wall clock). You must tell `toTemporal` which timezone to project the instant into.

**`parseISO` returns different types based on string shape.**
`'2026-06-20'` → `PlainDate`. `'2026-06-20T14:30:00'` → `PlainDateTime`. `'2026-06-20T14:30:00+02:00[Europe/Berlin]'` → `ZonedDateTime`. This mirrors how the Temporal API itself works.

**Sub-millisecond precision is lost in `fromTemporal`.**
Temporal supports nanosecond precision; `Date` only milliseconds. `fromTemporal` truncates silently (same as `Number(instant.epochMilliseconds)`).

**Month-end overflow is clamped, not rolled.**
`addMonths(Jan 31, 1)` → `Feb 28` (or `Feb 29` in leap years). This is Temporal's default `constrain` overflow behaviour — same as date-fns.

**DST-ambiguous times: use `disambiguation`.**
Wall-clock times that exist twice (fall-back DST) or not at all (spring-forward) are handled via the `disambiguation` option on `toTemporal`:
```ts
toTemporal(pdt, 'America/New_York', { disambiguation: 'later' });
```
Default is `'compatible'` (matches browser behaviour).

## License

MIT © yedoma-labs
