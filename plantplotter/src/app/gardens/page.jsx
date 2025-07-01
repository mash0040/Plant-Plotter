'use client';
import { useEffect, useState } from 'react';
import { getGardens } from '@/lib/api';
import GardenList from '@/components/Gardens/GardenList';
import GardenForm from '@/components/Gardens/GardenForm';

export default function AllGardensPage() {
  const [gardens, setGardens] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGarden, setSelectedGarden] = useState(null);

  useEffect(() => {
    getGardens().then(setGardens);
  }, []);

  const handleAddNew = () => {
    setSelectedGarden(null);
    setIsFormOpen(true);
  };

  const handleEdit = (garden) => {
    setSelectedGarden(garden);
    setIsFormOpen(true);
  };

  const handleDelete = (garden) => {
    setGardens(prevGardens => 
      prevGardens.filter(g => g.id !== garden.id)
    );
  };

  const handleView = (garden) => {
    console.log('View garden:', garden);
    // Navigate to garden detail page or show modal
  };

  const handleSave = (gardenData) => {
    if (selectedGarden) {
      // Update existing garden
      setGardens(prevGardens =>
        prevGardens.map(g =>
          g.id === selectedGarden.id ? { ...gardenData, id: selectedGarden.id } : g
        )
      );
    } else {
      // Add new garden
      const newGarden = {
        ...gardenData,
        id: Date.now() // Simple ID generation
      };
      setGardens(prevGardens => [...prevGardens, newGarden]);
    }
    setIsFormOpen(false);
    setSelectedGarden(null);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setSelectedGarden(null);
  };

  return (
    <>
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
    </>
  );
}