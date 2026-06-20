import type { TemporalAdapter } from '../types.js';

// moment intentionally exposes _isAMomentObject for detection (documented since moment 2.x)
interface MomentLike {
  _isAMomentObject: true;
  valueOf(): number;
  utcOffset(): number;
  isUtc(): boolean;
  toISOString(): string;
}

export const momentAdapter: TemporalAdapter<MomentLike> = {
  name: 'moment',

  detect(value: unknown): value is MomentLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>)['_isAMomentObject'] === true
    );
  },

  toEpochMs(value: MomentLike): number {
    return value.valueOf();
  },

  getTimezone(value: MomentLike): string | undefined {
    // moment-timezone sets _z.name; plain moment has no zone
    const tz = (value as unknown as Record<string, unknown>)['_z'];
    if (typeof tz === 'object' && tz !== null && typeof (tz as Record<string, unknown>)['name'] === 'string') {
      return (tz as Record<string, string>)['name'];
    }
    return undefined;
  },
};
