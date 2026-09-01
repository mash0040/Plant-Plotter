'use client';

import { useEffect, useId, useRef } from 'react';
import useBodyScrollLock from './useBodyScrollLock';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const isVisibleWithinDialog = (element, container) => {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;

  let currentElement = element;
  while (currentElement && currentElement !== container) {
    const style = window.getComputedStyle(currentElement);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    currentElement = currentElement.parentElement;
  }

  return true;
};

const getFocusableElements = (container) => (
  Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || [])
    .filter(element => isVisibleWithinDialog(element, container))
);

export default function useAccessibleDialog({
  isOpen,
  onClose,
  canDismiss = true,
  initialFocusRef
}) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const frameId = requestAnimationFrame(() => {
      const focusTarget = initialFocusRef?.current || dialogRef.current;
      focusTarget?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frameId);

      const returnFocusTarget = returnFocusRef.current;
      if (returnFocusTarget?.isConnected) {
        returnFocusTarget.focus({ preventScroll: true });
      }
    };
  }, [initialFocusRef, isOpen]);

  const handleDialogKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (!canDismiss) return;

      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(dialogRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus({ preventScroll: true });
      return;
    }

    const activeIndex = focusableElements.indexOf(document.activeElement);
    const lastIndex = focusableElements.length - 1;

    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      focusableElements[lastIndex].focus();
    } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === lastIndex)) {
      event.preventDefault();
      focusableElements[0].focus();
    }
  };

  return {
    dialogProps: {
      ref: dialogRef,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': titleId,
      tabIndex: -1,
      onKeyDown: handleDialogKeyDown
    },
    titleId
  };
}
