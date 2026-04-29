'use client';

import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const confirmClasses = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-green-600 hover:bg-green-700 text-white';

  const iconClasses = variant === 'danger'
    ? 'bg-red-100 text-red-600'
    : 'bg-green-100 text-green-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-gray-100">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
