'use client';
import { useState, useEffect } from 'react';
import { X, Calendar, Trash2 } from 'lucide-react';
import gardenDataService from '@/lib/gardenDataService';

export default function LoadGardenModel({ isOpen, onClose, onLoad }) {
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
      const userGardens = await gardenDataService.getGardens();
      setGardens(userGardens);
    } catch (error) {
      console.error('Failed to load gardens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (garden) => {
    try {
      const fullGarden = await gardenDataService.getGardenById(garden.id);
      onLoad(fullGarden);
      onClose();
    } catch (error) {
      console.error('Failed to load garden:', error);
      alert('Failed to load garden. Please try again.');
    }
  };

  const handleDelete = async (gardenId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this garden?')) {
      try {
        await gardenDataService.deleteGarden(gardenId);
        setGardens(prev => prev.filter(g => g.id !== gardenId));
      } catch (error) {
        console.error('Failed to delete garden:', error);
        alert('Failed to delete garden. Please try again.');
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
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading gardens...</p>
          </div>
        ) : gardens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌱</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">No saved gardens found</h4>
            <p className="text-gray-600">Create your first garden to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gardens.map((garden) => (
              <div
                key={garden.id}
                onClick={() => handleLoad(garden)}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{garden.name}</h4>
                  <div className="text-sm text-gray-600 mt-1">
                    {garden.dimensions?.width || garden.width}×{garden.dimensions?.height || garden.height} units • {garden.plantedItems?.length || 0} plants
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(garden.updatedAt || garden.createdAt).toLocaleDateString()}
                    </div>
                    {garden.location && (
                      <span>📍 {garden.location}</span>
                    )}
                    {garden.soilType && (
                      <span>🌱 {garden.soilType}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(garden.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-4"
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