'use client';
import { useState } from 'react';
import { X, Save } from 'lucide-react';

export default function SaveGardenModel({ isOpen, onClose, onSave, currentGarden }) {
  const [gardenName, setGardenName] = useState(currentGarden?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!gardenName.trim()) return;
    
    setSaving(true);
    try {
      await onSave(gardenName.trim());
      onClose();
    } catch (error) {
      console.error('Failed to save garden:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Save Garden</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Garden Name
          </label>
          <input
            type="text"
            value={gardenName}
            onChange={(e) => setGardenName(e.target.value)}
            placeholder="My Vegetable Garden"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!gardenName.trim() || saving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Garden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}