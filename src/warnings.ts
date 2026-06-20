export interface MigrationWarningsOptions {
  level?: 'warn' | 'error' | 'silent';
  stack?: boolean;
  ignore?: string[];
}

interface WarningsState {
  enabled: boolean;
  level: 'warn' | 'error' | 'silent';
  stack: boolean;
  ignore: Set<string>;
}

const state: WarningsState = {
  enabled: false,
  level: 'warn',
  stack: false,
  ignore: new Set(),
};

export function enableMigrationWarnings(options?: MigrationWarningsOptions): void {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      '[keler-temporal] enableMigrationWarnings() called in production. ' +
        'This is a dev-only migration tool — remove it before shipping.',
    );
  }

  state.enabled = true;
  state.level = options?.level ?? 'warn';
  state.stack = options?.stack ?? false;
  state.ignore = new Set(options?.ignore ?? []);
}

export function disableMigrationWarnings(): void {
  state.enabled = false;
}

export function emitMigrationWarning(fnName: string, lib: string, detail?: string): void {
  if (!state.enabled) return;
  if (state.ignore.has(fnName)) return;
  if (state.level === 'silent') return;

  const stackLine = state.stack ? `\n  at ${captureCallSite()}` : '';
  const message =
    `[keler] ${fnName}() (${lib}) called with legacy Date.` +
    (detail ? ` Hint: ${detail}` : '') +
    stackLine;

  if (state.level === 'error') {
    throw new Error(message);
  }

  console.warn(message);
}

export function isMigrationWarningsEnabled(): boolean {
  return state.enabled;
}

function captureCallSite(): string {
  const err = new Error();
  const lines = err.stack?.split('\n') ?? [];
  // Skip: Error, emitMigrationWarning, compat fn, internal — want the user call site
  const site = lines[4] ?? lines[lines.length - 1] ?? 'unknown';
  return site.trim().replace(/^at\s+/, '');
}
