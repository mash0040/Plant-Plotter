'use client';
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';

export default function ActivityModal({ 
  isOpen, 
  formData, 
  onFormDataChange, 
  onSubmit, 
  onClose,
  selectedGarden
}) {
  const [plantLibrary, setPlantLibrary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch plant library when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPlantLibrary();
    }
  }, [isOpen]);

  const loadPlantLibrary = async () => {
    setLoading(true);
    setError('');
    
    try {
      const plants = await apiClient.getPlantLibrary();
      setPlantLibrary(plants || []);
    } catch (error) {
      console.error('Failed to load plant library:', error);
      setError('Failed to load plant options');
      // Fallback to empty array or default plants
      setPlantLibrary([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Group plants by category for better organization
  const plantsByCategory = plantLibrary.reduce((acc, plant) => {
    const category = plant.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(plant);
    return acc;
  }, {});

  // Sort categories for consistent display
  const sortedCategories = Object.keys(plantsByCategory).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-96 max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          Add {formData.activity} Activity
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center">
          <span>to {selectedGarden.icon} {selectedGarden.name}</span>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plant
            </label>
            
            {loading ? (
              <div className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading plants...</span>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-2">
                <div className="w-full p-2 border border-red-300 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
                <button 
                  onClick={loadPlantLibrary}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Try again
                </button>
              </div>
            ) : (
              <select
                value={formData.plant}
                onChange={(e) => onFormDataChange({...formData, plant: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select a plant</option>
                
                {/* Show garden plants first if any */}
                {selectedGarden.plantedItems && selectedGarden.plantedItems.length > 0 && (
                  <optgroup label="🏡 Plants in Your Garden">
                    {selectedGarden.plantedItems.map(plant => (
                      <option key={`garden-${plant.id}`} value={plant.name}>
                        {plant.emoji || '🌱'} {plant.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                
                {/* Show all plant library plants grouped by category */}
                {sortedCategories.map(category => (
                  <optgroup 
                    key={category} 
                    label={`${getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}`}
                  >
                    {plantsByCategory[category]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(plant => (
                        <option key={`library-${plant.id}`} value={plant.name}>
                          {plant.emoji || '🌱'} {plant.name}
                        </option>
                      ))
                    }
                  </optgroup>
                ))}
              </select>
            )}
            
            {plantLibrary.length === 0 && !loading && !error && (
              <p className="text-xs text-gray-500 mt-1">
                No plants found in library. You can still type a custom plant name below.
              </p>
            )}
          </div>
          
          {/* Custom plant input option */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or enter custom plant name
            </label>
            <input
              type="text"
              value={formData.plant}
              onChange={(e) => onFormDataChange({...formData, plant: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Type plant name..."
            />
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
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
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

// Helper function to get category icons
function getCategoryIcon(category) {
  const icons = {
    vegetables: '🥕',
    fruits: '🍎',
    herbs: '🌿',
    flowers: '🌸',
    other: '🌱'
  };
  return icons[category] || '🌱';
}
