'use client';

import { useEffect } from 'react';

// A drawer and its details dialog can both own the lock. Only the last
// release may restore the page, regardless of which overlay closes first.
let lockCount = 0;
let restorePage = null;

export default function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return undefined;

    if (lockCount === 0) {
      const { body, documentElement } = document;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const originalStyles = Object.fromEntries(
        ['overflow', 'position', 'top', 'left', 'width'].map(property => [property, body.style[property]])
      );
      const originalRootOverflow = documentElement.style.overflow;

      // Overflow alone does not reliably prevent page panning on mobile Safari.
      documentElement.style.overflow = 'hidden';
      Object.assign(body.style, {
        overflow: 'hidden',
        position: 'fixed',
        top: `${-scrollY}px`,
        left: `${-scrollX}px`,
        width: '100%'
      });

      restorePage = () => {
        Object.assign(body.style, originalStyles);
        documentElement.style.overflow = originalRootOverflow;
        if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
          window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
        }
      };
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        restorePage?.();
        restorePage = null;
      }
    };
  }, [isLocked]);
}
