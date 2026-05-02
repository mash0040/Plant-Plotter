'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ActivityModal({
  isOpen,
  formData,
  onFormDataChange,
  onSubmit,
  onClose,
  selectedGarden
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.plant || !formData.activity || gardenPlantOptions.length === 0) return;

    onSubmit({
      activity: formData.activity,
      plant: formData.plant,
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Log {activityLabel}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            to {selectedGarden.name}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto p-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plant
              </label>
              <select
                value={formData.plant}
                onChange={(event) => onFormDataChange({ ...formData, plant: event.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(event) => onFormDataChange({ ...formData, notes: event.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows="3"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 border-t border-gray-200 bg-gray-50 p-5">
            <button
              type="submit"
              disabled={!formData.plant || !formData.activity || gardenPlantOptions.length === 0}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Activity
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
