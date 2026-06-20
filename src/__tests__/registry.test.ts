import { afterEach, describe, expect, it } from 'vitest';
import { TemporalAdapterError } from '../errors.js';
import { clearAdapters, findAdapter, listAdapters, registerAdapter } from '../registry.js';
import type { TemporalAdapter } from '../types.js';

afterEach(() => {
  clearAdapters();
});

const mockAdapter: TemporalAdapter<{ _isMock: true; ms: number }> = {
  name: 'mock',
  detect: (v): v is { _isMock: true; ms: number } =>
    typeof v === 'object' && v !== null && (v as Record<string, unknown>)['_isMock'] === true,
  toEpochMs: (v) => v.ms,
};

describe('registerAdapter', () => {
  it('registers an adapter', () => {
    registerAdapter(mockAdapter);
    expect(listAdapters()).toContain('mock');
  });

  it('replaces adapter with same name', () => {
    registerAdapter(mockAdapter);
    registerAdapter({ ...mockAdapter, toEpochMs: () => 999 });
    expect(listAdapters().filter((n) => n === 'mock')).toHaveLength(1);
  });

  it('throws when detect is not a function', () => {
    expect(() =>
      registerAdapter({ name: 'bad', detect: 'oops' as unknown as (v: unknown) => v is never, toEpochMs: () => 0 }),
    ).toThrow(TemporalAdapterError);
  });

  it('throws when toEpochMs is not a function', () => {
    expect(() =>
      registerAdapter({
        name: 'bad',
        detect: (_v: unknown): _v is never => false,
        toEpochMs: 'oops' as unknown as TemporalAdapter['toEpochMs'],
      }),
    ).toThrow(TemporalAdapterError);
  });
});

describe('findAdapter', () => {
  it('finds matching adapter', () => {
    registerAdapter(mockAdapter);
    const found = findAdapter({ _isMock: true, ms: 100 });
    expect(found?.name).toBe('mock');
  });

  it('returns undefined for unmatched value', () => {
    registerAdapter(mockAdapter);
    expect(findAdapter({ something: 'else' })).toBeUndefined();
  });

  it('returns first matching adapter when multiple registered', () => {
    registerAdapter(mockAdapter);
    registerAdapter({ ...mockAdapter, name: 'mock2' });
    const found = findAdapter({ _isMock: true, ms: 0 });
    expect(found?.name).toBe('mock');
  });
});

describe('clearAdapters', () => {
  it('removes all adapters', () => {
    registerAdapter(mockAdapter);
    clearAdapters();
    expect(listAdapters()).toHaveLength(0);
  });
});

describe('listAdapters', () => {
  it('returns empty array initially', () => {
    expect(listAdapters()).toEqual([]);
  });

  it('returns adapter names in registration order', () => {
    registerAdapter(mockAdapter);
    registerAdapter({ ...mockAdapter, name: 'alpha' });
    expect(listAdapters()).toEqual(['mock', 'alpha']);
  });
});
