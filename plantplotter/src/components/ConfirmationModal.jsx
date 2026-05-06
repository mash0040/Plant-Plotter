'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

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
  const [isConfirming, setIsConfirming] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsConfirming(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmClasses = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-green-600 hover:bg-green-700 text-white';

  const iconClasses = variant === 'danger'
    ? 'bg-red-100 text-red-600'
    : 'bg-green-100 text-green-600';

  const handleConfirm = async () => {
    if (isConfirming) return;

    setIsConfirming(true);

    try {
      await onConfirm?.();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl bg-white p-5 shadow-xl border border-gray-100">
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
                disabled={isConfirming}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-11 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 ${confirmClasses}`}
          >
            {isConfirming ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
