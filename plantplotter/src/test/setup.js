import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((callback) => {
  callback();
  return 0;
});

globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame || (() => {});
