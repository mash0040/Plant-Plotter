'use client';
import { useState, useEffect } from 'react';
import { X, Calendar, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function LoadGardenModel({ isOpen, onClose, onLoad }) {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gardenPendingDelete, setGardenPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [loadError, setLoadError] = useState('');
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      loadGardens();
    }
  }, [isOpen]);

  const loadGardens = async () => {
    setLoading(true);
    try {
      setLoadError('');
      const userGardens = await apiClient.getGardens();
      setGardens(userGardens);
    } catch (error) {
      console.error('Failed to load gardens:', error);
      setLoadError('Failed to load gardens. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (garden) => {
    try {
      setLoadError('');
      const fullGarden = await apiClient.getGarden(garden.id);
      
      const transformedGarden = {
        id: fullGarden.id,
        name: fullGarden.name,
        description: fullGarden.description,
        dimensions: {
          width: fullGarden.width,
          height: fullGarden.height
        },
        gridSize: 40, // Default grid size
        soilType: fullGarden.soil_type,
        location: fullGarden.location,
        status: fullGarden.status,
        plantCount: fullGarden.plant_count,
        plantedItems: fullGarden.plantedItems?.map(item => ({
          id: item.id,
          plantId: item.plant_id,
          name: item.plant_name,
          emoji: item.plant_emoji,
          size: item.plant_size,
          category: item.plant_category,
          x: item.x_position,
          y: item.y_position,
          plantedDate: item.planted_date,
          notes: item.notes
        })) || [],
        createdAt: fullGarden.created_at,
        updatedAt: fullGarden.updated_at
      };
      
      onLoad(transformedGarden);
      onClose();
    } catch (error) {
      console.error('Failed to load garden:', error);
      setLoadError('Failed to load garden. Please try again.');
    }
  };

  const handleDelete = async (gardenId, e) => {
    e.stopPropagation();
    const garden = gardens.find(item => item.id === gardenId);
    setGardenPendingDelete(garden || { id: gardenId, name: 'this garden' });
  };

  const handleConfirmDelete = async () => {
    if (!gardenPendingDelete) return;

    try {
      setDeleteError('');
      await apiClient.deleteGarden(gardenPendingDelete.id);
      setGardens(prev => prev.filter(g => g.id !== gardenPendingDelete.id));
      setGardenPendingDelete(null);
    } catch (error) {
      console.error('Failed to delete garden:', error);
      setDeleteError('Failed to delete garden. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-[600px] max-w-[90vw] max-h-[calc(100vh-1.5rem)] sm:max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Load Garden</h3>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {deleteError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </div>
        )}

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
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{garden.name}</h4>
                  <div className="text-sm text-gray-700 mt-1">
                    {garden.dimensions?.width || garden.width}×{garden.dimensions?.height || garden.height} units • {garden.plantedItems?.length || 0} plants
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-2">
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
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={Boolean(gardenPendingDelete)}
        title="Delete garden?"
        message={`Delete "${gardenPendingDelete?.name || 'this garden'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setGardenPendingDelete(null)}
      />
    </div>
  );
}
