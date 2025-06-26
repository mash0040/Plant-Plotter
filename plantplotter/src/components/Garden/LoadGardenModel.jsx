'use client';
import { useState, useEffect } from 'react';
import { X, Calendar, Trash2 } from 'lucide-react';
import { GardenService } from '@/components/Garden/Services/GardenService';

export default function LoadGardenModel({ isOpen, onClose, onLoad, userId }) {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGardens();
    }
  }, [isOpen]);

  const loadGardens = async () => {
    setLoading(true);
    try {
      const userGardens = await GardenService.getUserGardens(userId);
      setGardens(userGardens);
    } catch (error) {
      console.error('Failed to load gardens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (garden) => {
    try {
      const fullGarden = await GardenService.loadGarden(garden.id);
      onLoad(fullGarden);
      onClose();
    } catch (error) {
      console.error('Failed to load garden:', error);
    }
  };

  const handleDelete = async (gardenId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this garden?')) {
      try {
        await GardenService.deleteGarden(gardenId);
        setGardens(prev => prev.filter(g => g.id !== gardenId));
      } catch (error) {
        console.error('Failed to delete garden:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Load Garden</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading gardens...</div>
        ) : gardens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No saved gardens found. Create your first garden!
          </div>
        ) : (
          <div className="space-y-3">
            {gardens.map((garden) => (
              <div
                key={garden.id}
                onClick={() => handleLoad(garden)}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{garden.name}</h4>
                  <div className="text-sm text-gray-600 mt-1">
                    {garden.width}×{garden.height} units • {garden.plantedItems?.length || 0} plants
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(garden.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(garden.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}