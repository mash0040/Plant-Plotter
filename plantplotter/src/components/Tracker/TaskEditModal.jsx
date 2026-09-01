'use client';
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Save, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import useAccessibleDialog from '@/hooks/useAccessibleDialog';
import { getUserFacingErrorMessage } from '@/lib/apiErrors';

const GENERAL_GARDEN_TASK_VALUE = '__whole_garden__';

export default function TaskEditModal({ 
  isOpen, 
  onClose, 
  task, 
  onSave, 
  onDelete, 
  gardens = [],
  selectedGarden: currentGarden,
  plantLibrary = [],
  isPlantLibraryLoading = false
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    garden_id: '',
    due_date: '',
    priority: 'medium',
    plant_name: '',
    task_type: 'water',
    status: 'pending',
    estimated_duration: '',
    recurring_pattern: 'none',
    notes: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const errorRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const deleteCancelRef = useRef(null);
  const wasDeleteConfirmOpenRef = useRef(false);
  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen,
    onClose,
    canDismiss: !isSaving && !isDeleting
  });

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-50' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const taskTypeOptions = [
    { value: 'plant', label: 'Plant', titleVerb: 'Plant' },
    { value: 'water', label: 'Water', titleVerb: 'Water' },
    { value: 'fertilize', label: 'Fertilize', titleVerb: 'Fertilize' },
    { value: 'prune', label: 'Prune', titleVerb: 'Prune' },
    { value: 'weed', label: 'Weed', titleVerb: 'Weed' },
    { value: 'harvest', label: 'Harvest', titleVerb: 'Harvest' },
    { value: 'inspect', label: 'Inspect', titleVerb: 'Inspect' },
    { value: 'treat', label: 'Treat Pest/Disease', titleVerb: 'Treat' },
    { value: 'other', label: 'Other', titleVerb: 'Plan' }
  ];

  const recurringOptions = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
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

  const getBackendSafeStatus = (status) => {
    if (status === 'in_progress' || status === 'overdue') return 'pending';
    return status;
  };

  const getGeneratedTitle = (taskType, plantName) => {
    const taskTypeOption = taskTypeOptions.find(option => option.value === taskType);
    const descriptionSummary = formData.description.trim().replace(/\s+/g, ' ').slice(0, 60);

    if (taskType === 'other') {
      return descriptionSummary ? `Other: ${descriptionSummary}` : 'Other garden task';
    }

    if (!taskTypeOption) return '';

    if (!plantName) {
      return taskType === 'plant'
        ? 'Plant task'
        : `${taskTypeOption.titleVerb} whole garden`;
    }

    return `${taskTypeOption.titleVerb} ${plantName}`;
  };

  const getPlantedItemName = (item) => item?.name || item?.plant_name || item?.plantName || '';
  const getLibraryPlantName = (item) => item?.name || item?.plant_name || '';
  const getGardenPlantCount = (garden) => {
    const explicitPlantCount = garden?.plantCount ?? garden?.plant_count;
    if (explicitPlantCount !== undefined && explicitPlantCount !== null) {
      return Number(explicitPlantCount) || 0;
    }

    return garden?.plantedItems?.length || 0;
  };
  const isPlantingTask = formData.task_type === 'plant';
  const isOtherTask = formData.task_type === 'other';
  const selectedPlantValue = formData.plant_name || GENERAL_GARDEN_TASK_VALUE;

  // Load task data when modal opens
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        garden_id: task.garden_id || task.gardenId || (gardens.length > 0 ? gardens[0].id : ''),
        due_date: task.due_date ? getDateKey(task.due_date) : '',
        priority: task.priority || 'medium',
        plant_name: task.plant_name || task.plant || '',
        task_type: task.task_type || task.taskType || 'water',
        status: getBackendSafeStatus(task.status) || 'pending',
        estimated_duration: task.estimated_duration || '',
        recurring_pattern: task.recurring_pattern || 'none',
        notes: task.notes || ''
      });
      setError('');
      setShowDeleteConfirm(false);
    } else if (isOpen && !task) {
      // New task
      setFormData({
        title: '',
        description: '',
        garden_id: currentGarden?.id || (gardens.length > 0 ? gardens[0].id : ''),
        due_date: getTodayDateKey(),
        priority: 'medium',
        plant_name: '',
        task_type: 'water',
        status: 'pending',
        estimated_duration: '',
        recurring_pattern: 'none',
        notes: ''
      });
      setError('');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, task, gardens, currentGarden]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  useEffect(() => {
    if (!isOpen) {
      wasDeleteConfirmOpenRef.current = false;
      return undefined;
    }

    if (showDeleteConfirm) {
      wasDeleteConfirmOpenRef.current = true;
      const frameId = requestAnimationFrame(() => deleteCancelRef.current?.focus());
      return () => cancelAnimationFrame(frameId);
    }

    if (wasDeleteConfirmOpenRef.current) {
      wasDeleteConfirmOpenRef.current = false;
      const frameId = requestAnimationFrame(() => deleteButtonRef.current?.focus());
      return () => cancelAnimationFrame(frameId);
    }

    return undefined;
  }, [isOpen, showDeleteConfirm]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'garden_id' || field === 'task_type' ? { plant_name: '' } : {})
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving || isDeleting) return;

    const selectedGardenForTask = gardens.find(g => String(g.id) === String(formData.garden_id)) || currentGarden;
    const plantedPlantOptions = Array.from(
      new Set((selectedGardenForTask?.plantedItems || []).map(getPlantedItemName).filter(Boolean))
    );
    const libraryPlantOptions = Array.from(
      new Set(plantLibrary.map(getLibraryPlantName).filter(Boolean))
    );
    const availablePlantOptions = isPlantingTask ? libraryPlantOptions : plantedPlantOptions;
    const generatedTitle = getGeneratedTitle(formData.task_type, formData.plant_name);

    if (!formData.garden_id) {
      setError('Please select a garden');
      return;
    }

    if (!task && selectedGardenForTask && getGardenPlantCount(selectedGardenForTask) === 0) {
      setError('Add plants to this garden before creating care tasks.');
      return;
    }

    if (!formData.task_type) {
      setError('Select a task type');
      return;
    }

    if (isPlantingTask && plantLibrary.length === 0) {
      setError(isPlantLibraryLoading ? 'Plant library is still loading. Please try again in a moment.' : 'Plant library could not be loaded. Please try again.');
      return;
    }

    if (isPlantingTask && (!formData.plant_name || !availablePlantOptions.includes(formData.plant_name))) {
      setError('Select a plant from the plant library.');
      return;
    }

    if (!isPlantingTask && !isOtherTask && formData.plant_name && !availablePlantOptions.includes(formData.plant_name)) {
      setError('Select a plant from this garden, or choose Whole garden / general task.');
      return;
    }

    if (isOtherTask && !formData.description.trim()) {
      setError('Add details for Other tasks so you know what needs to be done.');
      return;
    }

    if (!formData.due_date) {
      setError('Due date is required for scheduled tasks.');
      return;
    }

    if (!task && formData.due_date < getTodayDateKey()) {
      setError('New tasks cannot be due in the past. Log an activity instead if this work was already done.');
      return;
    }

    if (formData.estimated_duration) {
      const estimatedDuration = Number(formData.estimated_duration);
      if (!Number.isInteger(estimatedDuration) || estimatedDuration < 1) {
        setError('Estimated duration must be a whole number of minutes.');
        return;
      }
    }

    setIsSaving(true);
    setError('');

    try {
      const taskData = {
        ...formData,
        title: generatedTitle,
        // Ensure proper field names for API
        garden_id: formData.garden_id,
        plant_name: formData.plant_name,
        task_type: formData.task_type,
        due_date: formData.due_date || null,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration, 10) : null,
        status: task ? formData.status : 'pending'
      };

      await onSave(task?.id ? { ...taskData, id: task.id } : taskData);
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      setError(getUserFacingErrorMessage(error, 'Failed to save task'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting || isSaving) return;

    setIsDeleting(true);
    setError('');

    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError(getUserFacingErrorMessage(error, 'Failed to delete task'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const selectedGarden = gardens.find(g => String(g.id) === String(formData.garden_id)) || currentGarden;
  const plantedPlantOptions = Array.from(
    new Set((selectedGarden?.plantedItems || []).map(getPlantedItemName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const libraryPlantOptions = Array.from(
    new Set(plantLibrary.map(getLibraryPlantName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const plantOptions = isPlantingTask ? libraryPlantOptions : plantedPlantOptions;
  const generatedTitle = getGeneratedTitle(formData.task_type, formData.plant_name);
  const isEditingExistingTask = Boolean(task?.id);
  const selectedGardenHasPlants = !selectedGarden || getGardenPlantCount(selectedGarden) > 0;
  const isNoPlantGardenBlocked = !isEditingExistingTask && selectedGarden && !selectedGardenHasPlants;
  const showHistoricalPlantOption = formData.plant_name && !plantOptions.includes(formData.plant_name);
  const plantFieldLabel = isPlantingTask ? 'Plant to Add *' : isOtherTask ? 'Plant' : 'Plant or Area';
  const plantFieldHelp = isPlantingTask
    ? 'Choose from the full plant library, even if it is not planted yet.'
    : isOtherTask
      ? 'Optional. Leave blank if this task is not plant-specific.'
      : 'Choose a planted item, or leave as a whole-garden task.';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        {...dialogProps}
        className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h2 id={titleId} className="text-lg sm:text-xl font-bold text-gray-800">
              {task ? 'Edit Task' : 'Create New Task'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task form"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6" noValidate>
          {error && (
            <div ref={errorRef} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {isNoPlantGardenBlocked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p>Add plants to this garden before creating care tasks.</p>
              {selectedGarden?.id && (
                <Link
                  href={`/garden?id=${selectedGarden.id}`}
                  className="mt-2 inline-flex font-medium text-green-700 hover:text-green-800"
                >
                  Manage Plants
                </Link>
              )}
            </div>
          )}

          {/* Title and Description */}
          <div className="space-y-4">
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Task
              </span>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 break-words">
                {generatedTitle || 'Select a task type and plant'}
              </div>
            </div>

            <div>
              <label htmlFor="task-type" className="block text-sm font-medium text-gray-700 mb-2">
                Task Type *
              </label>
              <select
                id="task-type"
                value={formData.task_type}
                onChange={(e) => handleInputChange('task_type', e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                required
              >
                {taskTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
                {isOtherTask && <span className="text-red-600"> *</span>}
              </label>
              <textarea
                id="task-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                rows="3"
                placeholder={isOtherTask ? 'Describe the task...' : 'Detailed description of the task...'}
              />
              {isOtherTask && (
                <p className="mt-1 text-xs font-medium text-gray-600">
                  Required for Other tasks.
                </p>
              )}
            </div>
          </div>

          {/* Garden and Plant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {isEditingExistingTask ? (
                <span className="block text-sm font-medium text-gray-700 mb-2">Garden</span>
              ) : (
                <label htmlFor="task-garden" className="block text-sm font-medium text-gray-700 mb-2">Garden *</label>
              )}
              {isEditingExistingTask ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <div className="font-medium text-green-800 break-words">{selectedGarden?.name || 'Selected garden'}</div>
                  <div className="text-sm text-green-700">
                    Task remains tied to this garden.
                  </div>
                </div>
              ) : (
              <select
                id="task-garden"
                value={formData.garden_id}
                onChange={(e) => handleInputChange('garden_id', e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                required
              >
                <option value="">Select a garden</option>
                {gardens.map(garden => (
                  <option key={garden.id} value={garden.id}>
                    {garden.name}
                  </option>
                ))}
              </select>
              )}
            </div>

            <div>
              <label htmlFor="task-plant" className="block text-sm font-medium text-gray-700 mb-2">
                {plantFieldLabel}
              </label>
              <select
                id="task-plant"
                value={selectedPlantValue}
                onChange={(e) => handleInputChange('plant_name', e.target.value === GENERAL_GARDEN_TASK_VALUE ? '' : e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                disabled={isNoPlantGardenBlocked || (isPlantingTask ? isPlantLibraryLoading || plantOptions.length === 0 : false)}
              >
                {isPlantingTask ? (
                  <option value={GENERAL_GARDEN_TASK_VALUE}>
                    {isPlantLibraryLoading ? 'Loading plant library...' : 'Select a plant'}
                  </option>
                ) : (
                  <option value={GENERAL_GARDEN_TASK_VALUE}>
                    {isOtherTask ? 'No specific plant' : 'Whole garden / general task'}
                  </option>
                )}
                {showHistoricalPlantOption && (
                  <option value={formData.plant_name}>
                    {formData.plant_name} (saved task value)
                  </option>
                )}
                {plantOptions.map(plantName => (
                  <option key={plantName} value={plantName}>
                    {plantName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs font-medium text-gray-600">
                {plantFieldHelp}
              </p>
            </div>
          </div>

          {/* Due Date and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                id="task-due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="task-duration" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                id="task-duration"
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="e.g., 30"
                min="1"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="task-priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                {priorityOptions.map(option => (
                  <span
                    key={option.value}
                    className={`text-xs px-2 py-1 rounded-full ${
                      formData.priority === option.value ? option.color : 'text-gray-400 bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </div>

            {task && (
              <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="task-status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            )}
          </div>

          {/* Recurring Pattern */}
          <div>
            <label htmlFor="task-recurring-pattern" className="block text-sm font-medium text-gray-700 mb-2">
              Recurring Pattern
            </label>
            <select
              id="task-recurring-pattern"
              value={formData.recurring_pattern}
              onChange={(e) => handleInputChange('recurring_pattern', e.target.value)}
              className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            >
              {recurringOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="task-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="task-notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              rows="2"
              placeholder="Additional notes or reminders..."
            />
          </div>

          {/* Selected Garden Preview */}
          {selectedGarden && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-medium text-green-800 break-words">{selectedGarden.name}</div>
                  <div className="text-sm text-green-700 break-words">
                    {selectedGarden.location} - {selectedGarden.plantCount || 0} plants
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {task && onDelete && (
              showDeleteConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-700">Delete this task? This cannot be undone.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      ref={deleteCancelRef}
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
                  ref={deleteButtonRef}
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </button>
              )
            )}
          </div>
          
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
              disabled={isSaving || isDeleting || isNoPlantGardenBlocked}
              className="flex min-h-11 items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {task ? 'Update Task' : 'Create Task'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
