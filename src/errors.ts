export class TemporalNotAvailableError extends Error {
  constructor() {
    super(
      '[keler-temporal] Temporal API not available. ' +
        'Use Node.js 24+, Chrome 144+, or install temporal-polyfill as a peer dependency.',
    );
    this.name = 'TemporalNotAvailableError';
  }
}

export class TemporalAdapterError extends Error {
  constructor(message: string) {
    super(`[keler-temporal] Adapter error: ${message}`);
    this.name = 'TemporalAdapterError';
  }
}

export class TemporalConversionError extends Error {
  constructor(message: string) {
    super(`[keler-temporal] Conversion error: ${message}`);
    this.name = 'TemporalConversionError';
  }
}
