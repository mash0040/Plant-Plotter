'use client';
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Save, Trash2, Activity } from 'lucide-react';
import { getUserFacingErrorMessage } from '@/lib/apiErrors';

export default function ActivityEditModal({ 
  isOpen, 
  onClose, 
  activity, 
  onSave, 
  onDelete, 
  gardens = [],
  selectedGarden,
  selectedDate
}) {
  const [formData, setFormData] = useState({
    activity_type: '',
    plant_name: '',
    notes: '',
    garden_id: '',
    activity_date: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const errorRef = useRef(null);
  const formRef = useRef(null);

  const activityTypes = [
    { value: 'planted', label: 'Planted' },
    { value: 'watered', label: 'Watered' },
    { value: 'fertilized', label: 'Fertilized' },
    { value: 'harvested', label: 'Harvested' },
    { value: 'pruned', label: 'Pruned' },
    { value: 'weeded', label: 'Weeded' }
  ];

  const getDateKey = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    const date = new Date(value);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  const getTodayDateKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  };

  const getBackendSafeActivityType = (type) => {
    const normalizedType = String(type || '').toLowerCase().trim();
    const labelMap = {
      watering: 'watered',
      fertilizing: 'fertilized',
      pruning: 'pruned',
      planting: 'planted',
      harvesting: 'harvested',
      weeding: 'weeded'
    };

    return labelMap[normalizedType] || normalizedType;
  };

  const getPlantedItemName = (item) => item?.name || item?.plant_name || item?.plantName || '';

  // Load activity data when modal opens
  useEffect(() => {
    if (isOpen && activity) {
      setFormData({
        activity_type: getBackendSafeActivityType(activity.activity_type || activity.activity) || '',
        plant_name: activity.plant_name || '',
        notes: activity.notes || '',
        garden_id: activity.garden_id || (selectedGarden ? selectedGarden.id : ''),
        activity_date: activity.activity_date ? getDateKey(activity.activity_date) : getTodayDateKey()
      });
      setError('');
      setFieldErrors({});
      setShowDeleteConfirm(false);
    } else if (isOpen && !activity) {
      // New activity
      setFormData({
        activity_type: '',
        plant_name: '',
        notes: '',
        garden_id: selectedGarden ? selectedGarden.id : (gardens.length > 0 ? gardens[0].id : ''),
        activity_date: selectedDate || getTodayDateKey()
      });
      setError('');
      setFieldErrors({});
      setShowDeleteConfirm(false);
    }
  }, [isOpen, activity, gardens, selectedGarden, selectedDate]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0 || !formRef.current) return;

    const firstFieldError = formRef.current.querySelector('[data-field-error="true"]');
    firstFieldError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [fieldErrors]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setFieldErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving || isDeleting) return;

    const nextFieldErrors = {};
    
    if (!formData.activity_type.trim()) {
      nextFieldErrors.activity_type = 'Activity type is required.';
    }

    if (!formData.garden_id) {
      nextFieldErrors.garden_id = 'Garden is required.';
    }

    const gardenForSelectedActivity = gardens.find(g => String(g.id) === String(formData.garden_id)) || selectedGarden;
    const validPlantNames = Array.from(
      new Set((gardenForSelectedActivity?.plantedItems || []).map(getPlantedItemName).filter(Boolean))
    );
    const isHistoricalPlant = activity?.id && formData.plant_name && !validPlantNames.includes(formData.plant_name);

    if (validPlantNames.length === 0 && !isHistoricalPlant) {
      nextFieldErrors.plant_name = 'Add plants to this garden before logging care activity.';
    }

    if (!validPlantNames.includes(formData.plant_name) && !isHistoricalPlant) {
      nextFieldErrors.plant_name = 'Select a plant from this garden.';
    }

    if (!formData.activity_date) {
      nextFieldErrors.activity_date = 'Date is required.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('');
      return;
    }

    setIsSaving(true);
    setError('');
    setFieldErrors({});

    try {
      const activityData = {
        ...formData,
        activity_type: getBackendSafeActivityType(formData.activity_type),
        activity_date: formData.activity_date || selectedDate || getTodayDateKey()
      };

      await onSave(activity?.id ? { ...activityData, id: activity.id } : activityData);
      onClose();
    } catch (error) {
      console.error('Failed to save activity:', error);
      setError(getUserFacingErrorMessage(error, 'Failed to save activity'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isSaving || isDeleting) return;

    setIsDeleting(true);
    setError('');

    try {
      await onDelete(activity.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete activity:', error);
      setError(getUserFacingErrorMessage(error, 'Failed to delete activity'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const gardenForActivity = gardens.find(g => String(g.id) === String(formData.garden_id)) || selectedGarden;
  const plantOptions = Array.from(
    new Set((gardenForActivity?.plantedItems || []).map(getPlantedItemName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const showHistoricalPlantOption = activity?.id && formData.plant_name && !plantOptions.includes(formData.plant_name);
  const isEditingExistingActivity = Boolean(activity?.id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              {activity ? 'Edit Activity' : 'Add New Activity'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity form"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" noValidate>
          {error && (
            <div ref={errorRef} className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <span className="text-sm">{error}</span>
            </div>
          )}
          {/* Garden Selection */}
          {!isEditingExistingActivity && gardens.length > 1 && (
            <div>
              <label htmlFor="activity-garden" className="block text-sm font-medium text-gray-700 mb-2">
                Garden *
              </label>
              <select
                id="activity-garden"
                value={formData.garden_id}
                onChange={(e) => handleInputChange('garden_id', e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                required
              >
                <option value="">Select a garden</option>
                {gardens.map(garden => (
                  <option key={garden.id} value={garden.id}>
                    {garden.name}
                  </option>
                ))}
              </select>
              {fieldErrors.garden_id && (
                <p data-field-error="true" className="mt-1 text-sm text-red-600">{fieldErrors.garden_id}</p>
              )}
            </div>
          )}

          {/* Garden Preview */}
          {gardenForActivity && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                    <div>
                  <div className="font-medium text-green-800 break-words">{gardenForActivity.name}</div>
                  <div className="text-sm text-green-700 break-words">
                    {gardenForActivity.location} - {gardenForActivity.plantCount || 0} plants
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Type */}
          <div>
            <label htmlFor="activity-type" className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type *
            </label>
            <select
              id="activity-type"
              value={formData.activity_type}
              onChange={(e) => handleInputChange('activity_type', e.target.value)}
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              required
            >
              <option value="">Select activity type</option>
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {fieldErrors.activity_type && (
              <p data-field-error="true" className="mt-1 text-sm text-red-600">{fieldErrors.activity_type}</p>
            )}
          </div>

          {/* Plant Selection */}
          <div>
            <label htmlFor="activity-plant" className="block text-sm font-medium text-gray-700 mb-2">
              Plant
            </label>
            <select
              id="activity-plant"
              value={formData.plant_name}
              onChange={(e) => handleInputChange('plant_name', e.target.value)}
              className="mb-2 w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              required
              disabled={plantOptions.length === 0}
            >
              <option value="">Select a plant</option>
              {showHistoricalPlantOption && (
                <option value={formData.plant_name}>
                  {formData.plant_name} (no longer planted)
                </option>
              )}
              {plantOptions.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
            {fieldErrors.plant_name && (
              <p data-field-error="true" className="mb-2 text-sm text-red-600">{fieldErrors.plant_name}</p>
            )}
            {plantOptions.length === 0 && !showHistoricalPlantOption && (
              <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>Add plants to this garden before logging care activity.</p>
                {gardenForActivity?.id && (
                  <Link
                    href={`/garden?id=${gardenForActivity.id}`}
                    className="mt-2 inline-flex font-medium text-green-700 hover:text-green-800"
                  >
                    Manage Plants
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Activity Date */}
          <div>
            <label htmlFor="activity-date" className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              id="activity-date"
              type="date"
              value={formData.activity_date}
              onChange={(e) => handleInputChange('activity_date', e.target.value)}
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              required
            />
            {fieldErrors.activity_date && (
              <p data-field-error="true" className="mt-1 text-sm text-red-600">{fieldErrors.activity_date}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="activity-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="activity-notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              rows="3"
              placeholder="Add any additional notes..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {activity && onDelete && (
              showDeleteConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-700">Delete this activity? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="min-h-11 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex min-h-11 items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Activity
                </button>
              )
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="min-h-11 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isDeleting || plantOptions.length === 0}
              className="flex min-h-11 items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {activity ? 'Update Activity' : 'Add Activity'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
