'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGardens, createGarden, updateGarden, deleteGarden } from '@/lib/api';
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
      
      // Try to load from localStorage first
      const localGardens = localStorage.getItem('gardens');
      
      if (localGardens && localGardens !== '[]') {
        // If we have data in localStorage, use it
        const parsedGardens = JSON.parse(localGardens);
        console.log('Loaded gardens from localStorage:', parsedGardens);
        setGardens(parsedGardens);
      } else {
        // If no localStorage data, load from API and save to localStorage
        console.log('Loading gardens from API...');
        const apiGardens = await getGardens();
        console.log('API gardens loaded:', apiGardens);
        
        // Save to localStorage for future use
        localStorage.setItem('gardens', JSON.stringify(apiGardens));
        setGardens(apiGardens);
      }
    } catch (error) {
      console.error('Failed to load gardens:', error);
      
      // If everything fails, try API one more time
      try {
        const apiGardens = await getGardens();
        setGardens(apiGardens);
        // Try to save to localStorage
        try {
          localStorage.setItem('gardens', JSON.stringify(apiGardens));
        } catch (storageError) {
          console.warn('Failed to save to localStorage:', storageError);
        }
      } catch (apiError) {
        console.error('Failed to load from API:', apiError);
        // Set empty array as fallback
        setGardens([]);
      }
    } finally {
      setLoading(false);
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

  const handleDelete = async (garden) => {
    try {
      // Delete from localStorage
      const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
      const updatedGardens = localGardens.filter(g => g.id !== garden.id);
      localStorage.setItem('gardens', JSON.stringify(updatedGardens));
      
      // Update state
      setGardens(prevGardens => 
        prevGardens.filter(g => g.id !== garden.id)
      );
      
      // TODO: Also delete from real API when backend is ready
      // await deleteGarden(garden.id);
      
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
      let savedGarden;
      
      if (selectedGarden) {
        // Update existing garden
        savedGarden = {
          ...gardenData,
          id: selectedGarden.id,
          updatedAt: new Date().toISOString(),
          createdAt: selectedGarden.createdAt,
          plantedItems: selectedGarden.plantedItems || []
        };
        
        // Update in localStorage
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        const gardenIndex = localGardens.findIndex(g => g.id === selectedGarden.id);
        if (gardenIndex >= 0) {
          localGardens[gardenIndex] = savedGarden;
          localStorage.setItem('gardens', JSON.stringify(localGardens));
        }
        
        setGardens(prevGardens =>
          prevGardens.map(g =>
            g.id === selectedGarden.id ? savedGarden : g
          )
        );
        
        setSuccessMessage(`"${savedGarden.name}" updated successfully!`);
      } else {
        // Add new garden
        savedGarden = {
          ...gardenData,
          id: Date.now(), // Simple ID generation for demo
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          plantCount: 0,
          plantedItems: []
        };
        
        // Save to localStorage
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        localGardens.push(savedGarden);
        localStorage.setItem('gardens', JSON.stringify(localGardens));
        
        setGardens(prevGardens => [...prevGardens, savedGarden]);
        setSuccessMessage(`"${savedGarden.name}" created successfully!`);
      }
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setIsFormOpen(false);
      setSelectedGarden(null);
      
      // TODO: Replace with real API calls when backend is ready
      // if (selectedGarden) {
      //   await updateGarden(selectedGarden.id, gardenData);
      // } else {
      //   await createGarden(gardenData);
      // }
      
    } catch (error) {
      console.error('Failed to save garden:', error);
      alert('Failed to save garden. Please try again.');
    }
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setSelectedGarden(null);
  };

  // Add a function to reset data (useful for development/testing)
  const handleResetData = () => {
    if (window.confirm('Reset all garden data? This will reload the demo data.')) {
      localStorage.removeItem('gardens');
      loadGardens();
    }
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