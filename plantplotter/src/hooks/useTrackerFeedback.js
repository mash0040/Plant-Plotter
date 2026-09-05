'use client';
import { useCallback, useEffect, useState } from 'react';
import { getUserFacingErrorMessage } from '@/lib/apiErrors';

export const TRACKER_SUCCESS_DURATION_MS = 6000;

export const getTrackerFailureMessage = (error, actionMessage) => {
  const errorDetail = getUserFacingErrorMessage(error, '');
  return errorDetail && errorDetail !== actionMessage
    ? `${actionMessage} ${errorDetail}`
    : actionMessage;
};

const FEEDBACK_PRIORITY = {
  success: 1,
  warning: 2,
  error: 3
};

export const shouldReplaceTrackerFeedback = (currentFeedback, nextFeedback) => {
  if (!currentFeedback || currentFeedback.context === nextFeedback.context) return true;

  return FEEDBACK_PRIORITY[nextFeedback.type] >= FEEDBACK_PRIORITY[currentFeedback.type];
};

export default function useTrackerFeedback() {
  const [feedback, setFeedback] = useState(null);

  const showFeedback = useCallback((type, context, message) => {
    if (!message) return;

    const nextFeedback = { type, context, message };
    setFeedback(currentFeedback => (
      shouldReplaceTrackerFeedback(currentFeedback, nextFeedback)
        ? nextFeedback
        : currentFeedback
    ));
  }, []);

  const showError = useCallback((context, message) => {
    showFeedback('error', context, message);
  }, [showFeedback]);

  const showWarning = useCallback((context, message) => {
    showFeedback('warning', context, message);
  }, [showFeedback]);

  const showSuccess = useCallback((context, message) => {
    showFeedback('success', context, message);
  }, [showFeedback]);

  const clearFeedback = useCallback((context) => {
    setFeedback(currentFeedback => {
      if (!currentFeedback || (context && currentFeedback.context !== context)) {
        return currentFeedback;
      }

      return null;
    });
  }, []);

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;

    const timeoutId = setTimeout(() => {
      setFeedback(currentFeedback => (
        currentFeedback === feedback ? null : currentFeedback
      ));
    }, TRACKER_SUCCESS_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [feedback]);

  return {
    feedback,
    showError,
    showWarning,
    showSuccess,
    clearFeedback,
    dismissFeedback
  };
}
