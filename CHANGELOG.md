# Changelog

## 0.1.0 (2026-06-20)

### Features

- Core converters: `toTemporal`, `fromTemporal`, `toEpochMs`
- Adapter registry: register custom adapters for moment, luxon, dayjs, or any legacy date type
- Compat layer: date-fns-compatible functions that accept both legacy and Temporal inputs
- Test utilities: `freezeNow`, `makePlainDate`, `makeZonedDateTime`, `makeInstant`, `makePlainDateTime`
- Migration warnings: `enableMigrationWarnings` / `disableMigrationWarnings` (dev-only)
- First-party adapters: `@yedoma-labs/keler-temporal/adapters/moment`, `/adapters/luxon`, `/adapters/dayjs`
