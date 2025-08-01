'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Activity, Calendar } from 'lucide-react';

export default function ActivityEditModal({ 
  isOpen, 
  onClose, 
  activity, 
  onSave, 
  onDelete, 
  gardens = [],
  selectedGarden 
}) {
  const [formData, setFormData] = useState({
    activity_type: '',
    plant_name: '',
    notes: '',
    garden_id: '',
    activity_date: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const activityTypes = [
    'Watering', 'Fertilizing', 'Pruning', 'Planting', 'Harvesting',
    'Pest Control', 'Disease Treatment', 'Soil Amendment', 'Mulching',
    'Transplanting', 'Thinning', 'Staking', 'Weeding', 'Other'
  ];

  // Load activity data when modal opens
  useEffect(() => {
    if (isOpen && activity) {
      setFormData({
        activity_type: activity.activity_type || '',
        plant_name: activity.plant_name || '',
        notes: activity.notes || '',
        garden_id: activity.garden_id || (selectedGarden ? selectedGarden.id : ''),
        activity_date: activity.activity_date ? 
          new Date(activity.activity_date).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0]
      });
      setError('');
    } else if (isOpen && !activity) {
      // New activity
      setFormData({
        activity_type: '',
        plant_name: '',
        notes: '',
        garden_id: selectedGarden ? selectedGarden.id : (gardens.length > 0 ? gardens[0].id : ''),
        activity_date: new Date().toISOString().split('T')[0]
      });
      setError('');
    }
  }, [isOpen, activity, gardens, selectedGarden]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.activity_type.trim()) {
      setError('Activity type is required');
      return;
    }

    if (!formData.garden_id) {
      setError('Please select a garden');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const activityData = {
        ...formData,
        activity_date: formData.activity_date || new Date().toISOString().split('T')[0]
      };

      await onSave(activity?.id ? { ...activityData, id: activity.id } : activityData);
      onClose();
    } catch (error) {
      console.error('Failed to save activity:', error);
      setError(error.message || 'Failed to save activity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      await onDelete(activity.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete activity:', error);
      setError(error.message || 'Failed to delete activity');
    }
  };

  if (!isOpen) return null;

  const gardenForActivity = gardens.find(g => g.id === formData.garden_id) || selectedGarden;

  // Get plants from the selected garden
  const getPlantOptions = () => {
    const gardenPlants = [];
    
    if (gardenForActivity?.plantedItems && gardenForActivity.plantedItems.length > 0) {
      gardenForActivity.plantedItems.forEach(item => {
        if (item.name && !gardenPlants.includes(item.name)) {
          gardenPlants.push(item.name);
        }
      });
    }
    
    // Add fallback plants if no plants are found
    if (gardenPlants.length === 0) {
      return ['Tomato', 'Lettuce', 'Basil', 'Pepper', 'Carrot', 'Spinach', 'Cucumber', 'Herbs', 'Flowers'];
    }
    
    return gardenPlants.sort();
  };

  const plantOptions = getPlantOptions();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {activity ? 'Edit Activity' : 'Add New Activity'}
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
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Garden Selection */}
          {gardens.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Garden *
              </label>
              <select
                value={formData.garden_id}
                onChange={(e) => handleInputChange('garden_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
          )}

          {/* Garden Preview */}
          {gardenForActivity && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">{gardenForActivity.icon || '🌱'}</span>
                <div>
                  <div className="font-medium text-green-800">{gardenForActivity.name}</div>
                  <div className="text-sm text-green-600">
                    {gardenForActivity.location} • {gardenForActivity.plantCount || 0} plants
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type *
            </label>
            <select
              value={formData.activity_type}
              onChange={(e) => handleInputChange('activity_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Select activity type</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Plant Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plant
            </label>
            <select
              value={formData.plant_name}
              onChange={(e) => handleInputChange('plant_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-2"
            >
              <option value="">Select a plant</option>
              {plantOptions.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
            
            {/* Custom plant input */}
            <input
              type="text"
              value={formData.plant_name}
              onChange={(e) => handleInputChange('plant_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Or type plant name..."
            />
          </div>

          {/* Activity Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.activity_date}
              onChange={(e) => handleInputChange('activity_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows="3"
              placeholder="Add any additional notes..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {activity && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Activity
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
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
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