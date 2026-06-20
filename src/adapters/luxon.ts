import type { TemporalAdapter } from '../types.js';

// luxon intentionally exposes isLuxonDateTime for detection (documented in luxon source)
interface LuxonDateTimeLike {
  isLuxonDateTime: true;
  valueOf(): number;
  zoneName: string | null;
  isValid: boolean;
}

export const luxonAdapter: TemporalAdapter<LuxonDateTimeLike> = {
  name: 'luxon',

  detect(value: unknown): value is LuxonDateTimeLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>).isLuxonDateTime === true
    );
  },

  toEpochMs(value: LuxonDateTimeLike): number {
    return value.valueOf();
  },

  getTimezone(value: LuxonDateTimeLike): string | undefined {
    return value.zoneName ?? undefined;
  },
};
