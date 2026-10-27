import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { __setWakeTiming } from '../lib/api';

// Don't wait a real minute for a "sleeping server" in tests.
__setWakeTiming({ totalMs: 40, intervalMs: 10 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.location.hash = '';
});

// jsdom lacks these browser APIs.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
}
