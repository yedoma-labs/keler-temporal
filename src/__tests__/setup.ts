// Install Temporal polyfill before any test runs.
// In production, consumers on Node 24+/Chrome 144+ get native Temporal.
// In CI and dev, the polyfill makes tests work identically.
import { install } from 'temporal-polyfill/shim';

install();
