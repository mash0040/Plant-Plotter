'use client';
import React from 'react';

export default function ActivityModal({ 
  isOpen, 
  formData, 
  onFormDataChange, 
  onSubmit, 
  onClose,
  selectedGarden
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

  // Get plants from the selected garden's available plants (computed by data service)
  const getPlantOptions = () => {
    // Use the availablePlants array computed by the garden data service
    if (selectedGarden.availablePlants && selectedGarden.availablePlants.length > 0) {
      return selectedGarden.availablePlants;
    }
    
    // Fallback to extracting from plantedItems if availablePlants is not available
    const gardenPlants = [];
    
    if (selectedGarden.plantedItems && selectedGarden.plantedItems.length > 0) {
      selectedGarden.plantedItems.forEach(item => {
        if (item.name && !gardenPlants.includes(item.name)) {
          gardenPlants.push(item.name);
        }
      });
    }
    
    // Add fallback plants if no plants are found
    if (gardenPlants.length === 0) {
      const fallbackPlants = getFallbackPlants(selectedGarden.name, selectedGarden.location);
      gardenPlants.push(...fallbackPlants);
    }
    
    return gardenPlants.sort();
  };

  // Get fallback plants based on garden name/type
  const getFallbackPlants = (gardenName = '', location = '') => {
    const nameUpper = gardenName.toUpperCase();
    const locationUpper = location.toUpperCase();
    
    if (nameUpper.includes('HERB') || nameUpper.includes('SPICE')) {
      return ['Basil', 'Cilantro', 'Parsley', 'Mint', 'Oregano', 'Thyme', 'Rosemary', 'Sage', 'Chives'];
    }
    
    if (nameUpper.includes('FRUIT') || nameUpper.includes('BERRY') || nameUpper.includes('ORCHARD')) {
      return ['Strawberry', 'Blueberry', 'Raspberry', 'Apple Tree', 'Pear Tree', 'Cherry Tree', 'Peach Tree', 'Tomato'];
    }
    
    if (nameUpper.includes('VEGETABLE') || nameUpper.includes('VEG')) {
      return ['Tomato', 'Lettuce', 'Carrot', 'Pepper', 'Cucumber', 'Spinach', 'Radish', 'Broccoli', 'Kale', 'Onion', 'Bean', 'Pea'];
    }
    
    if (nameUpper.includes('FLOWER') || nameUpper.includes('ROSE')) {
      return ['Rose', 'Marigold', 'Nasturtium', 'Lavender', 'Sunflower', 'Petunia', 'Tulip', 'Daffodil'];
    }
    
    if (locationUpper.includes('BALCONY') || locationUpper.includes('CONTAINER')) {
      return ['Lettuce', 'Spinach', 'Radish', 'Cherry Tomato', 'Pepper', 'Basil', 'Parsley', 'Cilantro', 'Strawberry'];
    }
    
    // Default mixed garden plants
    return ['Tomato', 'Lettuce', 'Basil', 'Pepper', 'Carrot', 'Spinach', 'Cucumber', 'Herbs', 'Flowers'];
  };

  const plantOptions = getPlantOptions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
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
            {plantOptions.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No plants found in this garden. You can add plants through the Garden Planner.
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