import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  disableMigrationWarnings,
  emitMigrationWarning,
  enableMigrationWarnings,
  isMigrationWarningsEnabled,
} from '../warnings.js';

afterEach(() => {
  disableMigrationWarnings();
  delete process.env.NODE_ENV;
});

describe('enableMigrationWarnings', () => {
  it('enables warnings', () => {
    enableMigrationWarnings();
    expect(isMigrationWarningsEnabled()).toBe(true);
  });

  it('throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => enableMigrationWarnings()).toThrow('called in production');
  });
});

describe('disableMigrationWarnings', () => {
  it('disables warnings', () => {
    enableMigrationWarnings();
    disableMigrationWarnings();
    expect(isMigrationWarningsEnabled()).toBe(false);
  });
});

describe('emitMigrationWarning', () => {
  it('does nothing when disabled', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    emitMigrationWarning('format', 'date-fns');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('calls console.warn when enabled', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableMigrationWarnings({ level: 'warn' });
    emitMigrationWarning('format', 'date-fns');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain('[keler] format()');
    spy.mockRestore();
  });

  it('throws when level is error', () => {
    enableMigrationWarnings({ level: 'error' });
    expect(() => emitMigrationWarning('format', 'date-fns')).toThrow('[keler] format()');
  });

  it('respects ignore list', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableMigrationWarnings({ level: 'warn', ignore: ['format'] });
    emitMigrationWarning('format', 'date-fns');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('is silent when level is silent', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableMigrationWarnings({ level: 'silent' });
    emitMigrationWarning('format', 'date-fns');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
