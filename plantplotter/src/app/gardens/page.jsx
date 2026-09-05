// app/gardens/page.jsx
'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api';
import GardenList from '@/components/Gardens/GardenList';
import GardenForm from '@/components/Gardens/GardenForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmationModal from '@/components/ConfirmationModal';
import RequestErrorNotice from '@/components/RequestErrorNotice';
import { CheckCircle, X } from 'lucide-react';
import {
  getActionErrorMessage,
  isAuthenticationError,
  isValidationError,
  shouldUseLocalReadFallback
} from '@/lib/apiErrors';

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
  const messageRef = useRef(null);

  // Check for success parameters from garden planner
  useEffect(() => {
    const saved = searchParams.get('saved');
    const gardenId = searchParams.get('gardenId');
    
    if (saved === 'true' && gardenId) {
      setSuccessMessage('Garden saved.');
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

  useEffect(() => {
    if ((!showSuccessMessage && !error) || !messageRef.current) return;

    messageRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [showSuccessMessage, error]);

  const loadGardens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isAuth = apiClient.isAuthenticated();
      
      if (!isAuth) {
        setError('Please sign in to view your gardens.');
        setGardens([]);
        setLoading(false);
        return;
      }

      const gardens = await apiClient.getGardenSummaries();
      
      if (!Array.isArray(gardens)) {
        throw new Error('Invalid response format from API');
      }
      
      // Gardens are already transformed by the API client
      setGardens(gardens);
      
    } catch (error) {
      console.error('Failed to load gardens from API:', error);
      if (isAuthenticationError(error)) {
        setGardens([]);
        return;
      }

      const errorMessage = getActionErrorMessage(error, 'Your gardens could not be loaded.', 'Try again.');

      if (shouldUseLocalReadFallback(error)) {
        try {
          const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');

          if (Array.isArray(localGardens) && localGardens.length > 0) {
            setGardens(localGardens);
            setError(`Showing local garden data. ${errorMessage}`);
          } else {
            setGardens([]);
            setError(errorMessage);
          }
        } catch (localError) {
          console.error('Failed to load from localStorage:', localError);
          setGardens([]);
          setError(errorMessage);
        }
      } else {
        setGardens([]);
        setError(errorMessage);
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
      
      setSuccessMessage(`"${gardenToDelete.name}" deleted.`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Failed to delete garden via API:', error);
      if (isAuthenticationError(error)) {
        return;
      }

      setError(getActionErrorMessage(error, 'This garden could not be deleted.', 'It remains in your gardens.'));
    }
  };

  const handleSave = async (gardenData) => {
    try {
      setError(null);
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
          throw error;
        }
        
        setSuccessMessage('Garden updated.');
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
          throw error;
        }
        
        setSuccessMessage('Garden created.');
      }
      
      // Reload gardens to reflect the changes
      await loadGardens();
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setIsFormOpen(false);
      setSelectedGarden(null);
      
    } catch (error) {
      console.error('Failed to save garden:', error);
      if (isAuthenticationError(error) || isValidationError(error)) {
        throw error;
      }

      throw error;
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setSelectedGarden(null);
  };

  if (loading) {
    return <GardensLoading />;
  }

  const showPageError = Boolean(error && !isFormOpen);
  const showFullPageError = Boolean(showPageError && gardens.length === 0);

  if (showFullPageError) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
            <RequestErrorNotice
              noticeRef={messageRef}
              title="Gardens unavailable"
              message={error}
              onRetry={loadGardens}
            />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {/* Success Message */}
      {showSuccessMessage && (
        <div ref={messageRef} role="status" aria-live="polite" className="fixed left-4 right-4 top-20 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3 animate-slide-in-right sm:left-auto sm:right-4 sm:max-w-md">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">{successMessage}</span>
          <button
            type="button"
            onClick={() => setShowSuccessMessage(false)}
            aria-label="Dismiss success message"
            className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-green-600 transition-colors hover:bg-green-100 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-green-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {showPageError && (
        <RequestErrorNotice
          noticeRef={messageRef}
          message={error}
          onRetry={loadGardens}
          onDismiss={() => setError(null)}
          dismissLabel="Dismiss error"
          className="fixed left-4 right-4 top-20 z-50 shadow-lg sm:left-6 sm:right-auto sm:max-w-xl"
        />
      )}

      <GardenList
        gardens={gardens}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddNew={handleAddNew}
        getStatusColor={getStatusColor}
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
