'use client';
import { useState } from 'react';
import { X, Save } from 'lucide-react';

export default function SaveGardenModel({ isOpen, onClose, onSave, currentGarden, onNavigateToGardens }) {
  const [gardenName, setGardenName] = useState(currentGarden?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!gardenName.trim()) return;
    
    setSaving(true);
    try {
      // Call the save function and get the saved garden data
      const savedGarden = await onSave(gardenName.trim());
      
      // Close the modal
      onClose();
      
      // Navigate back to gardens page with success message
      if (onNavigateToGardens) {
        onNavigateToGardens(savedGarden);
      }
    } catch (error) {
      console.error('Failed to save garden:', error);
      alert('Failed to save garden. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && gardenName.trim() && !saving) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {currentGarden?.id ? 'Update Garden' : 'Save Garden'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Garden Name *
          </label>
          <input
            type="text"
            value={gardenName}
            onChange={(e) => setGardenName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="My Vegetable Garden"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            disabled={saving}
            autoFocus
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Garden Summary:</h4>
          <p className="text-sm text-gray-600">
            • Dimensions: {currentGarden?.width}×{currentGarden?.height} units
          </p>
          <p className="text-sm text-gray-600">
            • Plants: {currentGarden?.plantedItems?.length || 0} items
          </p>
          <p className="text-sm text-gray-600">
            • Grid Size: {currentGarden?.gridSize}px
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!gardenName.trim() || saving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {currentGarden?.id ? 'Update Garden' : 'Save Garden'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}