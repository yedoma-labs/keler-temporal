# Changelog

All notable changes will be documented here. Follows [Conventional Commits](https://www.conventionalcommits.org/).

## 0.1.1 (2026-06-20)

### Fixes

- **Build**: vite-plugin-dts v5 uses `unplugin-dts` under the hood; old `outDir` option was silently ignored, causing declaration files to land in `dist/src/` instead of `dist/`. Fixed by switching to the correct `outDirs` option and adding a postbuild step that promotes `dist/src/*` → `dist/`.
- **Build**: added `exclude: ['src/**/__tests__/**']` to dts config to keep test declaration stubs out of the published package.
- **gitignore**: added `*.tgz` to prevent accidental commit of local tarballs.

## 0.1.0 (2026-06-20)

Initial release.

### Features

- **Core converters** (`@yedoma-labs/keler-temporal`)
  - `toTemporal(value, timezone?, options?)` — converts `Date`, `number`, or any registered adapter value to a native Temporal type. Pass-through for existing Temporal types. `PlainDateTime + timezone` calls `toZonedDateTime()` with DST disambiguation support. `Instant + timezone` calls `toZonedDateTimeISO()`.
  - `fromTemporal(value)` — converts any Temporal type back to `Date`. `PlainDateTime` treated as UTC. Sub-millisecond precision truncated.
  - `toEpochMs(value)` — extracts epoch milliseconds from any supported input.
  - `extractFields(value, timezone?)` — returns ISO field bag: `{ year, month, day, hour, minute, second, millisecond, dayOfWeek, timezone? }`.
  - `isTemporalType(value)` — type guard for any native Temporal type.

- **Adapter registry**
  - `registerAdapter(adapter)` — registers a named adapter; validates `detect` and `toEpochMs` are functions (prototype pollution guard). Adapters replace by name.
  - `findAdapter(value)` — returns first matching registered adapter.
  - `listAdapters()` — returns registered adapter names.
  - `clearAdapters()` — removes all adapters (for test teardown).
  - Built-in adapters (zero runtime deps, duck-type detection):
    - `@yedoma-labs/keler-temporal/adapters/moment` — detects `_isAMomentObject === true`, reads `_z.name` for moment-timezone
    - `@yedoma-labs/keler-temporal/adapters/luxon` — detects `isLuxonDateTime === true`, reads `zoneName`
    - `@yedoma-labs/keler-temporal/adapters/dayjs` — detects `$isDayjsObject === true`, reads `$x.$timezone`

- **Compat layer** (`@yedoma-labs/keler-temporal/compat`)
  - All functions accept `Date` (legacy path) and Temporal types (native path).
  - `format(date, formatStr)` — character-by-character token scanner (no regex); 17 tokens + quoted literals `'...'`
  - `parseISO(str)` — string-shape detection: `[` → ZonedDateTime, `T` → PlainDateTime, else → PlainDate
  - `isValid(value)` — returns `false` for invalid `Date`, non-date types, `null`, `undefined`
  - `addDays` / `addMonths` / `addYears` / `subDays` / `subMonths` — arithmetic preserving input type; month-end overflow uses Temporal `constrain`
  - `isAfter` / `isBefore` / `isSameDay` — comparisons
  - `startOfDay` / `endOfDay` / `startOfMonth` / `endOfMonth` — boundary helpers; `endOfDay` returns `23:59:59.999999999`
  - `differenceInDays` / `differenceInMonths` — signed differences

- **Migration warnings** (`@yedoma-labs/keler-temporal`)
  - `enableMigrationWarnings(options?)` — enables runtime warnings when `Date` is passed to compat functions; throws in `NODE_ENV=production`
  - `disableMigrationWarnings()` — disables warnings
  - Options: `level: 'warn' | 'error' | 'silent'`, `stack: boolean`, `ignore: string[]`

- **Testing utilities** (`@yedoma-labs/keler-temporal/testing`)
  - `freezeNow(iso)` — freezes `Clock` to fixed instant; returns `{ [Symbol.dispose] }` for `using` declarations
  - `unfreezeNow()` / `resetClock()` — explicit cleanup
  - `makeZonedDateTime(isoOrFields, timezone?)` — two overloads
  - `makePlainDate(fields)` / `makePlainDateTime(fields)` / `makeInstant(iso)` — test helpers
  - `kelorTemporalPlugin()` — Vitest plugin; auto-calls `resetClock()` in `afterEach`

- **Clock abstraction** (`@yedoma-labs/keler-temporal`)
  - `Clock` interface with `instant()`, `zonedDateTimeISO()`, `plainDateISO()`, `plainDateTimeISO()`, `plainTimeISO()`, `timeZoneId()`
  - `getClock()` / `setClock(clock)` / `resetClock()`
  - Design: delegates to `Temporal.Now.*` rather than patching it (non-writable on Chrome 144+ native)

### Error types

- `TemporalConversionError` — unsupported input or missing required timezone
- `TemporalAdapterError` — invalid adapter registration
- `TemporalNotAvailableError` — Temporal not available in environment

### Build

- ESM primary, CJS secondary (`preserveModules`, `vite build` + `vite-plugin-dts`)
- Named entry points: `.`, `./compat`, `./testing`, `./adapters/moment`, `./adapters/luxon`, `./adapters/dayjs`
- `sideEffects: false` for tree-shaking
- `engines.node: >=22.0.0`
- `temporal-polyfill` optional peer dependency (`>=0.2.0`)
