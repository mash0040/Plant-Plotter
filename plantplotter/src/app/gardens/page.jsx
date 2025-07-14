'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import gardenDataService from '@/lib/gardenDataService';
import GardenList from '@/components/Gardens/GardenList';
import GardenForm from '@/components/Gardens/GardenForm';
import { CheckCircle } from 'lucide-react';

export default function AllGardensPage() {
  const searchParams = useSearchParams();
  const [gardens, setGardens] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      
      // Use the centralized garden data service
      const gardens = await gardenDataService.getGardens();
      console.log('Loaded gardens from data service:', gardens);
      setGardens(gardens);
    } catch (error) {
      console.error('Failed to load gardens:', error);
      setGardens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedGarden(null);
    setIsFormOpen(true);
  };

  const handleEdit = (garden) => {
    console.log('Editing garden:', garden); // Debug log
    setSelectedGarden(garden);
    setIsFormOpen(true);
  };

  const handleDelete = async (garden) => {
    try {
      await gardenDataService.deleteGarden(garden.id);
      
      // Reload gardens to reflect the deletion
      await loadGardens();
      
      setSuccessMessage(`"${garden.name}" deleted successfully!`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Failed to delete garden:', error);
      alert('Failed to delete garden. Please try again.');
    }
  };

  const handleView = (garden) => {
    console.log('View garden:', garden);
    // Navigate to garden detail page or show modal
  };

  const handleSave = async (gardenData) => {
    try {
      const isUpdate = selectedGarden !== null;
      
      if (isUpdate) {
        // Update existing garden
        const updatedGarden = await gardenDataService.saveGarden({
          ...gardenData,
          id: selectedGarden.id,
          createdAt: selectedGarden.createdAt,
          plantedItems: selectedGarden.plantedItems || []
        }, true);
        
        setSuccessMessage(`"${updatedGarden.name}" updated successfully!`);
      } else {
        // Create new garden
        const newGarden = await gardenDataService.saveGarden({
          ...gardenData,
          plantCount: 0,
          plantedItems: []
        }, false);
        
        setSuccessMessage(`"${newGarden.name}" created successfully!`);
      }
      
      // Reload gardens to reflect the changes
      await loadGardens();
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setIsFormOpen(false);
      setSelectedGarden(null);
      
    } catch (error) {
      console.error('Failed to save garden:', error);
      alert('Failed to save garden. Please try again.');
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setSelectedGarden(null);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gardens...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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


      <GardenList
        gardens={gardens}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onAddNew={handleAddNew}
      />

      <GardenForm
        garden={selectedGarden}
        onSave={handleSave}
        onClose={handleClose}
        isOpen={isFormOpen}
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
    </>
  );
}