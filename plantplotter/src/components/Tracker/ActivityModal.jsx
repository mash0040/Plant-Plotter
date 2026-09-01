'use client';
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import useAccessibleDialog from '@/hooks/useAccessibleDialog';

export default function ActivityModal({
  isOpen,
  formData,
  onFormDataChange,
  onSubmit,
  onClose,
  selectedGarden
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const plantSelectRef = useRef(null);
  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen,
    onClose,
    canDismiss: !isSubmitting,
    initialFocusRef: plantSelectRef
  });

  if (!isOpen) return null;

  const gardenPlantOptions = Array.from(
    new Set((selectedGarden.plantedItems || []).map(plant => (
      plant?.name || plant?.plant_name || plant?.plantName || ''
    )).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const activityLabels = {
    planted: 'Planted',
    watered: 'Watered',
    fertilized: 'Fertilized',
    harvested: 'Harvested',
    pruned: 'Pruned',
    weeded: 'Weeded'
  };
  const activityLabel = activityLabels[formData.activity] || 'Activity';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !formData.plant || !formData.activity || gardenPlantOptions.length === 0) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        activity: formData.activity,
        plant: formData.plant,
        notes: formData.notes
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div
        {...dialogProps}
        className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 id={titleId} className="text-lg font-semibold text-gray-900">
            Log {activityLabel}
          </h3>
          <div className="text-sm text-gray-700 mt-1">
            to {selectedGarden.name}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
            <div>
              <label htmlFor="quick-activity-plant" className="block text-sm font-medium text-gray-700 mb-2">
                Plant
              </label>
              <select
                ref={plantSelectRef}
                id="quick-activity-plant"
                value={formData.plant}
                onChange={(event) => onFormDataChange({ ...formData, plant: event.target.value })}
                className="w-full min-h-11 rounded border border-gray-300 bg-white p-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                required
                disabled={gardenPlantOptions.length === 0}
              >
                <option value="">Select a plant</option>
                {gardenPlantOptions.map(plantName => (
                  <option key={plantName} value={plantName}>
                    {plantName}
                  </option>
                ))}
              </select>

              {gardenPlantOptions.length === 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>Add plants to this garden before logging care activity.</p>
                  <Link
                    href={`/garden?id=${selectedGarden.id}`}
                    className="mt-2 inline-flex font-medium text-green-700 hover:text-green-800"
                  >
                    Manage Plants
                  </Link>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="quick-activity-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                id="quick-activity-notes"
                value={formData.notes}
                onChange={(event) => onFormDataChange({ ...formData, notes: event.target.value })}
                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                rows="3"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 border-t border-gray-200 bg-gray-50 p-4 sm:p-5">
            <button
              type="submit"
              disabled={isSubmitting || !formData.plant || !formData.activity || gardenPlantOptions.length === 0}
              className="min-h-11 flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Activity'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-11 flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
