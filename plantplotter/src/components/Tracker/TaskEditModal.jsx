'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function TaskEditModal({ 
  isOpen, 
  onClose, 
  task, 
  onSave, 
  onDelete, 
  gardens = [] 
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    garden_id: '',
    due_date: '',
    priority: 'medium',
    plant_name: '',
    status: 'pending',
    estimated_duration: '',
    recurring_pattern: 'none',
    notes: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-50' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const recurringOptions = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  // Load task data when modal opens
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        garden_id: task.garden_id || (gardens.length > 0 ? gardens[0].id : ''),
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        priority: task.priority || 'medium',
        plant_name: task.plant_name || '',
        status: task.status || 'pending',
        estimated_duration: task.estimated_duration || '',
        recurring_pattern: task.recurring_pattern || 'none',
        notes: task.notes || ''
      });
      setError('');
    } else if (isOpen && !task) {
      // New task
      setFormData({
        title: '',
        description: '',
        garden_id: gardens.length > 0 ? gardens[0].id : '',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        plant_name: '',
        status: 'pending',
        estimated_duration: '',
        recurring_pattern: 'none',
        notes: ''
      });
      setError('');
    }
  }, [isOpen, task, gardens]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!formData.garden_id) {
      setError('Please select a garden');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const taskData = {
        ...formData,
        // Ensure proper field names for API
        due_date: formData.due_date || null,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null
      };

      await onSave(task?.id ? { ...taskData, id: task.id } : taskData);
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      setError(error.message || 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError(error.message || 'Failed to delete task');
    }
  };

  if (!isOpen) return null;

  const selectedGarden = gardens.find(g => g.id === formData.garden_id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {task ? 'Edit Task' : 'Create New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Title and Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Water tomatoes"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Detailed description of the task..."
              />
            </div>
          </div>

          {/* Garden and Plant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Garden *
              </label>
              <select
                value={formData.garden_id}
                onChange={(e) => handleInputChange('garden_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a garden</option>
                {gardens.map(garden => (
                  <option key={garden.id} value={garden.id}>
                    {garden.icon || '🌱'} {garden.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plant (Optional)
              </label>
              <input
                type="text"
                value={formData.plant_name}
                onChange={(e) => handleInputChange('plant_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Specific plant name"
              />
            </div>
          </div>

          {/* Due Date and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 30"
                min="1"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurring Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recurring Pattern
            </label>
            <select
              value={formData.recurring_pattern}
              onChange={(e) => handleInputChange('recurring_pattern', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
              placeholder="Additional notes or reminders..."
            />
          </div>

          {/* Selected Garden Preview */}
          {selectedGarden && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedGarden.icon || '🌱'}</span>
                <div>
                  <div className="font-medium text-green-800">{selectedGarden.name}</div>
                  <div className="text-sm text-green-600">
                    {selectedGarden.location} • {selectedGarden.plantCount || 0} plants
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {task && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
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