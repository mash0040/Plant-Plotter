import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useBodyScrollLock from './useBodyScrollLock';

function Lock({ active }) {
  useBodyScrollLock(active);
  return null;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useBodyScrollLock', () => {
  it('fixes the page at its current scroll position and restores existing styles on release', () => {
    const originalBodyStyles = document.body.style.cssText;
    const originalRootStyles = document.documentElement.style.cssText;
    document.body.style.cssText = 'position: relative; top: 2px; left: 3px; width: 90%; overflow: auto; color: red;';
    document.documentElement.style.overflow = 'auto';
    const expectedStyles = document.body.style.cssText;
    vi.stubGlobal('scrollX', 20);
    vi.stubGlobal('scrollY', 360);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    const { unmount } = render(<Lock active />);
    try {
      expect(document.body).toHaveStyle({ position: 'fixed', top: '-360px', left: '-20px', width: '100%', overflow: 'hidden' });
      expect(document.documentElement.style.overflow).toBe('hidden');
      // Fixing the body removes the document's scrollable height in a browser.
      vi.stubGlobal('scrollX', 0);
      vi.stubGlobal('scrollY', 0);
      unmount();
      expect(document.body.style.cssText).toBe(expectedStyles);
      expect(document.documentElement.style.overflow).toBe('auto');
      expect(scrollTo).toHaveBeenCalledWith({ left: 20, top: 360, behavior: 'instant' });
    } finally {
      unmount();
      document.body.style.cssText = originalBodyStyles;
      document.documentElement.style.cssText = originalRootStyles;
    }
  });

  it.each(['drawer', 'dialog'])('keeps the page locked when the %s closes before the other overlay', (firstClosed) => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const { rerender } = render(<><Lock active /><Lock active /></>);
    rerender(<><Lock active={firstClosed !== 'drawer'} /><Lock active={firstClosed !== 'dialog'} /></>);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    rerender(<><Lock active={false} /><Lock active={false} /></>);
    expect(document.body.style.overflow).toBe(originalOverflow);
    expect(document.body.style.position).toBe(originalPosition);
  });

  it('balances setup and cleanup in Strict Mode', () => {
    const originalPosition = document.body.style.position;
    const { unmount } = render(<StrictMode><Lock active /></StrictMode>);
    expect(document.body.style.position).toBe('fixed');
    unmount();
    expect(document.body.style.position).toBe(originalPosition);
  });
});
