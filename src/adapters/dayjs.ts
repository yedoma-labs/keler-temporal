import type { TemporalAdapter } from '../types.js';

// dayjs intentionally exposes $isDayjsObject for detection
interface DayjsLike {
  $isDayjsObject: true;
  valueOf(): number;
  $offset?: number;
}

export const dayjsAdapter: TemporalAdapter<DayjsLike> = {
  name: 'dayjs',

  detect(value: unknown): value is DayjsLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>).$isDayjsObject === true
    );
  },

  toEpochMs(value: DayjsLike): number {
    return value.valueOf();
  },

  getTimezone(_value: DayjsLike): string | undefined {
    // dayjs-timezone plugin exposes $x.$timezone
    const x = (_value as unknown as Record<string, unknown>).$x;
    if (typeof x === 'object' && x !== null) {
      const tz = (x as Record<string, unknown>).$timezone;
      if (typeof tz === 'string') return tz;
    }
    return undefined;
  },
};
