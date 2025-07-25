'use client';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from './useAuth';

export const useGardens = () => {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  const transformGardenFromAPI = (garden) => ({
    id: garden.id,
    name: garden.name,
    description: garden.description,
    dimensions: {
      width: garden.width || garden.dimensions?.width,
      height: garden.height || garden.dimensions?.height
    },
    soilType: garden.soil_type || garden.soilType,
    location: garden.location,
    status: garden.status,
    plantCount: garden.plant_count || garden.plantCount || 0,
    plantedItems: garden.plantedItems || [],
    createdAt: garden.created_at || garden.createdAt,
    updatedAt: garden.updated_at || garden.updatedAt
  });

  const transformGardenForAPI = (gardenData) => ({
    name: gardenData.name,
    description: gardenData.description || '',
    width: gardenData.dimensions?.width || gardenData.width,
    height: gardenData.dimensions?.height || gardenData.height,
    soil_type: gardenData.soilType,
    location: gardenData.location,
    status: gardenData.status
  });

  const fetchGardens = async () => {
    if (!isAuthenticated) {
      setGardens([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching gardens with planted items...');
      
      // Use the API method that now returns array directly
      const data = await apiClient.getGardens();
      
      // Data is already transformed by the API client
      console.log('✅ Gardens loaded:', data);
      setGardens(data);
      
    } catch (err) {
      console.error('Failed to fetch gardens:', err);
      setError(err.message);
      
      // Fallback to localStorage
      try {
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        if (Array.isArray(localGardens) && localGardens.length > 0) {
          setGardens(localGardens);
          setError(`Using local data: ${err.message}`);
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

  useEffect(() => {
    fetchGardens();
  }, [user, isAuthenticated]);

  const createGarden = async (gardenData) => {
    try {
      setError(null);
      
      const apiData = transformGardenForAPI(gardenData);
      const newGarden = await apiClient.createGarden(apiData);
      const transformedGarden = transformGardenFromAPI(newGarden);
      
      setGardens(prev => [transformedGarden, ...prev]);
      return transformedGarden;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateGarden = async (id, gardenData) => {
    try {
      setError(null);
      
      const apiData = transformGardenForAPI(gardenData);
      const updatedGarden = await apiClient.updateGarden(id, apiData);
      const transformedGarden = transformGardenFromAPI(updatedGarden);
      
      setGardens(prev => prev.map(g => g.id === id ? transformedGarden : g));
      return transformedGarden;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteGarden = async (id) => {
    try {
      setError(null);
      
      await apiClient.deleteGarden(id);
      setGardens(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getGardenById = async (id) => {
    try {
      // Use the updated API method that fetches garden with planted items
      const garden = await apiClient.getGarden(id);
      return transformGardenFromAPI(garden);
    } catch (err) {
      console.error('Failed to fetch garden by ID:', err);
      
      // Fallback to local state
      const localGarden = gardens.find(g => g.id == id);
      if (localGarden) {
        return localGarden;
      }
      
      throw err;
    }
  };

  // New method to refresh a specific garden's planted items
  const refreshGardenPlants = async (gardenId) => {
    try {
      const plantedItems = await apiClient.getGardenPlants(gardenId);
      
      setGardens(prev => prev.map(garden => 
        garden.id === gardenId 
          ? { 
              ...garden, 
              plantedItems,
              plantCount: plantedItems.length 
            }
          : garden
      ));
      
      return plantedItems;
    } catch (err) {
      console.error('Failed to refresh garden plants:', err);
      throw err;
    }
  };

  return {
    gardens,
    loading,
    error,
    refetch: fetchGardens,
    createGarden,
    updateGarden,
    deleteGarden,
    getGardenById,
    refreshGardenPlants
  };
};