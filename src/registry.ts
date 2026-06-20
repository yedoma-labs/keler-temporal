import { TemporalAdapterError } from './errors.js';
import type { TemporalAdapter } from './types.js';

const adapters: TemporalAdapter[] = [];

export function registerAdapter<T>(adapter: TemporalAdapter<T>): void {
  if (typeof adapter.detect !== 'function') {
    throw new TemporalAdapterError(`"${adapter.name}": detect must be a function`);
  }
  if (typeof adapter.toEpochMs !== 'function') {
    throw new TemporalAdapterError(`"${adapter.name}": toEpochMs must be a function`);
  }

  const existing = adapters.findIndex((a) => a.name === adapter.name);
  if (existing !== -1) {
    adapters.splice(existing, 1, adapter as TemporalAdapter);
  } else {
    adapters.push(adapter as TemporalAdapter);
  }
}

export function findAdapter(value: unknown): TemporalAdapter | undefined {
  return adapters.find((a) => a.detect(value));
}

export function clearAdapters(): void {
  adapters.length = 0;
}

export function listAdapters(): readonly string[] {
  return adapters.map((a) => a.name);
}
