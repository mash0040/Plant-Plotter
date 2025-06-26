'use client';
import React from 'react';

export default function ActivityModal({ 
  isOpen, 
  formData, 
  onFormDataChange, 
  onSubmit, 
  onClose 
}) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.plant || !formData.activity) return;
    
    onSubmit({
      activity: formData.activity,
      plant: formData.plant,
      notes: formData.notes
    });
  };

  const plantOptions = [
    'Tomatoes',
    'Carrots',
    'Basil',
    'Lettuce',
    'Peppers',
    'Herbs',
    'Cucumbers',
    'Spinach',
    'Radishes',
    'Beans'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Add {formData.activity} Activity
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plant
            </label>
            <select
              value={formData.plant}
              onChange={(e) => onFormDataChange({...formData, plant: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Select a plant</option>
              {plantOptions.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => onFormDataChange({...formData, notes: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows="3"
              placeholder="Add any additional notes..."
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={!formData.plant || !formData.activity}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Activity
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}