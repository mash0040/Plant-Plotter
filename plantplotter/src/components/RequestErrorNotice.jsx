'use client';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export default function RequestErrorNotice({
  message,
  title = '',
  onRetry,
  retryLabel = 'Retry',
  retryType = 'button',
  onDismiss,
  dismissLabel = 'Dismiss message',
  noticeRef,
  className = ''
}) {
  if (!message) return null;

  const showRetry = Boolean(onRetry || retryType === 'submit');

  return (
    <div
      ref={noticeRef}
      role="alert"
      aria-live="assertive"
      className={`rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 shadow-sm sm:p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          {title && (
            <h2 className="text-base font-semibold leading-6 text-red-950">
              {title}
            </h2>
          )}
          <p className="text-sm font-medium leading-6">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-100 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-red-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showRetry && (
        <button
          type={retryType}
          onClick={onRetry}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-800 shadow-sm transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-red-50 sm:ml-8 sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
