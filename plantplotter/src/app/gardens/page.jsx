// app/gardens/page.jsx
'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api';
import GardenList from '@/components/Gardens/GardenList';
import GardenForm from '@/components/Gardens/GardenForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmationModal from '@/components/ConfirmationModal';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

function GardensLoading() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gardens...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function AllGardensContent() {
  const searchParams = useSearchParams();
  const [gardens, setGardens] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [gardenPendingDelete, setGardenPendingDelete] = useState(null);

  // Check for success parameters from garden planner
  useEffect(() => {
    const saved = searchParams.get('saved');
    const gardenId = searchParams.get('gardenId');
    
    if (saved === 'true' && gardenId) {
      setSuccessMessage('Garden saved successfully!');
      setShowSuccessMessage(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      // Clear URL parameters
      window.history.replaceState({}, '', '/gardens');
    }
  }, [searchParams]);

  useEffect(() => {
    loadGardens();
  }, []);

  const loadGardens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isAuth = apiClient.isAuthenticated();
      
      if (!isAuth) {
        setError('Not authenticated. Please log in.');
        setGardens([]);
        setLoading(false);
        return;
      }

      const gardens = await apiClient.getGardens();
      
      if (!Array.isArray(gardens)) {
        throw new Error('Invalid response format from API');
      }
      
      // Gardens are already transformed by the API client
      setGardens(gardens);
      
    } catch (error) {
      console.error('Failed to load gardens from API:', error);
      if (error.status === 401) {
        setGardens([]);
        return;
      }

      setError(`API Error: ${error.message}`);
      
      // Fallback to localStorage
      try {
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        
        if (Array.isArray(localGardens) && localGardens.length > 0) {
          setGardens(localGardens);
          setError(`Using local data (API unavailable: ${error.message})`);
        } else {
          setGardens([]);
        }
      } catch (localError) {
        console.error('Failed to load from localStorage:', localError);
        setGardens([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'Dormant':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handlePlannerOpen = (garden, e) => {
    e?.stopPropagation();
    // Navigate to garden planner with garden ID
    window.location.href = `/garden?id=${garden.id}`;
  };

  const handleView = (garden) => {
    // Navigate to garden detail page
    window.location.href = `/gardens/${garden.id}`;
  };

  const handleAddNew = () => {
    setSelectedGarden(null);
    setIsFormOpen(true);
  };

  const handleEdit = (garden) => {
    setSelectedGarden(garden);
    setIsFormOpen(true);
  };

  const handleDelete = (garden) => {
    setGardenPendingDelete(garden);
  };

  const handleCancelDelete = () => {
    setGardenPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!gardenPendingDelete) return;
    const gardenToDelete = gardenPendingDelete;
    setGardenPendingDelete(null);

    try {
      // Try to delete via API first
      await apiClient.deleteGarden(gardenToDelete.id);
      
      // Reload gardens to reflect the deletion
      await loadGardens();
      
      setSuccessMessage(`"${gardenToDelete.name}" deleted successfully!`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Failed to delete garden via API:', error);
      if (error.status === 401) {
        return;
      }
      
      // Fallback to localStorage deletion
      try {
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        const updatedGardens = localGardens.filter(g => g.id !== gardenToDelete.id);
        localStorage.setItem('gardens', JSON.stringify(updatedGardens));
        
        // Reload gardens to reflect the deletion
        await loadGardens();
        
        setSuccessMessage(`"${gardenToDelete.name}" deleted successfully!`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } catch (localError) {
        console.error('Failed to delete from localStorage:', localError);
        setError('Failed to delete garden. Please try again.');
      }
    }
  };

  const handleSave = async (gardenData) => {
    try {
      const isUpdate = selectedGarden !== null;
      let savedGarden;
      
      if (isUpdate) {
        // Update existing garden
        try {
          const updateData = {
            name: gardenData.name,
            description: gardenData.description || '',
            width: gardenData.dimensions?.width || gardenData.width,
            height: gardenData.dimensions?.height || gardenData.height,
            soil_type: gardenData.soilType,
            location: gardenData.location,
            status: gardenData.status
          };

          savedGarden = await apiClient.updateGarden(selectedGarden.id, updateData);
          
          // Transform response to consistent format
          savedGarden = {
            id: savedGarden.id,
            name: savedGarden.name,
            description: savedGarden.description || '',
            dimensions: {
              width: savedGarden.width || savedGarden.dimensions?.width,
              height: savedGarden.height || savedGarden.dimensions?.height
            },
            soilType: savedGarden.soil_type || savedGarden.soilType,
            location: savedGarden.location,
            status: savedGarden.status,
            plantCount: savedGarden.plant_count || savedGarden.plantCount || 0,
            plantedItems: selectedGarden.plantedItems || [],
            createdAt: savedGarden.created_at || savedGarden.createdAt,
            updatedAt: savedGarden.updated_at || savedGarden.updatedAt
          };
        } catch (error) {
          console.error('Failed to update garden via API:', error);
          if (error.status === 401 || error.status === 400 || error.errors) {
            throw error;
          }

          // Fallback to localStorage update
          const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
          const gardenIndex = localGardens.findIndex(g => g.id === selectedGarden.id);
          
          if (gardenIndex !== -1) {
            savedGarden = {
              ...localGardens[gardenIndex],
              ...gardenData,
              id: selectedGarden.id,
              updatedAt: new Date().toISOString(),
              plantedItems: selectedGarden.plantedItems || []
            };
            
            localGardens[gardenIndex] = savedGarden;
            localStorage.setItem('gardens', JSON.stringify(localGardens));
          }
        }
        
        setSuccessMessage('Garden updated successfully.');
      } else {
        // Create new garden
        try {
          const createData = {
            name: gardenData.name,
            description: gardenData.description || '',
            width: gardenData.dimensions?.width || gardenData.width,
            height: gardenData.dimensions?.height || gardenData.height,
            soil_type: gardenData.soilType,
            location: gardenData.location,
            status: gardenData.status
          };

          savedGarden = await apiClient.createGarden(createData);
          
          // Transform response to consistent format
          savedGarden = {
            id: savedGarden.id,
            name: savedGarden.name,
            description: savedGarden.description || '',
            dimensions: {
              width: savedGarden.width || savedGarden.dimensions?.width,
              height: savedGarden.height || savedGarden.dimensions?.height
            },
            soilType: savedGarden.soil_type || savedGarden.soilType,
            location: savedGarden.location,
            status: savedGarden.status,
            plantCount: savedGarden.plant_count || savedGarden.plantCount || 0,
            plantedItems: [],
            createdAt: savedGarden.created_at || savedGarden.createdAt,
            updatedAt: savedGarden.updated_at || savedGarden.updatedAt
          };
        } catch (error) {
          console.error('Failed to create garden via API:', error);
          if (error.status === 401 || error.status === 400 || error.errors) {
            throw error;
          }

          // Fallback to localStorage creation
          savedGarden = {
            ...gardenData,
            id: Date.now(), // Simple ID generation for fallback
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            plantCount: 0,
            plantedItems: []
          };
          
          const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
          localGardens.push(savedGarden);
          localStorage.setItem('gardens', JSON.stringify(localGardens));
        }
        
        setSuccessMessage('Garden created successfully.');
      }
      
      // Reload gardens to reflect the changes
      await loadGardens();
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setIsFormOpen(false);
      setSelectedGarden(null);
      
    } catch (error) {
      console.error('Failed to save garden:', error);
      if (error.status === 401 || error.status === 400 || error.errors) {
        throw error;
      }

      setError('Failed to save garden. Please try again.');
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setSelectedGarden(null);
  };

  if (loading) {
    return <GardensLoading />;
  }

  return (
    <ProtectedRoute>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3 animate-slide-in-right">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">{successMessage}</span>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-green-600 hover:text-green-800 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800 font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Retry Button */}
      {error && error.includes('API') && (
        <div className="fixed top-16 left-4 z-50">
          <button
            onClick={loadGardens}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      <GardenList
        gardens={gardens}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onAddNew={handleAddNew}
        getStatusColor={getStatusColor}
        handlePlannerOpen={handlePlannerOpen}
        handleView={handleView}
      />

      <GardenForm
        garden={selectedGarden}
        onSave={handleSave}
        onClose={handleClose}
        isOpen={isFormOpen}
      />

      <ConfirmationModal
        isOpen={Boolean(gardenPendingDelete)}
        title="Delete garden?"
        message={`Delete "${gardenPendingDelete?.name || 'this garden'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </ProtectedRoute>
  );
}

export default function AllGardensPage() {
  return (
    <Suspense fallback={<GardensLoading />}>
      <AllGardensContent />
    </Suspense>
  );
}
