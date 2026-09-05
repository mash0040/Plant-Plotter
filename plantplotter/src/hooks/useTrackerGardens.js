'use client';
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import {
  getUserFacingErrorMessage,
  isAuthenticationError,
  shouldUseLocalReadFallback
} from '@/lib/apiErrors';
import {
  hydrateTrackerGarden,
  normalizeTrackerGardens
} from '@/lib/trackerData';
import { getTrackerFailureMessage } from './useTrackerFeedback';

export default function useTrackerGardens({ showError, showWarning, clearFeedback }) {
  const [gardens, setGardens] = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [isLoadingGardens, setIsLoadingGardens] = useState(true);
  const [isLoadingSelectedGardenPlants, setIsLoadingSelectedGardenPlants] = useState(false);
  const [gardenLoadError, setGardenLoadError] = useState('');

  const loadGardens = useCallback(async () => {
    try {
      setIsLoadingGardens(true);
      setGardenLoadError('');
      const gardenSummaries = await apiClient.getGardenSummaries();
      const trackerGardens = normalizeTrackerGardens(gardenSummaries);

      setGardens(trackerGardens);
      setSelectedGarden(currentGarden => currentGarden || trackerGardens[0] || null);
      setGardenLoadError('');
      clearFeedback('gardens-load');
    } catch (error) {
      console.error('Failed to load gardens from API:', error);
      if (isAuthenticationError(error)) {
        setGardens([]);
        setGardenLoadError('');
        clearFeedback('gardens-load');
        return;
      }

      const errorMessage = getUserFacingErrorMessage(error, 'Could not load your gardens. Please try again.');

      if (shouldUseLocalReadFallback(error)) {
        try {
          const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
          const trackerGardens = normalizeTrackerGardens(localGardens, { fromLocalStorage: true });

          setGardens(trackerGardens);
          setSelectedGarden(currentGarden => currentGarden || trackerGardens[0] || null);
          if (trackerGardens.length > 0) {
            setGardenLoadError('');
            showWarning('gardens-load', `Showing saved garden data. ${errorMessage}`);
          } else {
            setGardenLoadError(errorMessage);
            clearFeedback('gardens-load');
          }
        } catch (localError) {
          console.error('Failed to load from localStorage:', localError);
          setGardens([]);
          setGardenLoadError(errorMessage);
          clearFeedback('gardens-load');
        }
      } else {
        setGardens([]);
        setGardenLoadError(errorMessage);
        clearFeedback('gardens-load');
      }
    } finally {
      setIsLoadingGardens(false);
    }
  }, [clearFeedback, showWarning]);

  const loadSelectedGardenPlants = useCallback(async () => {
    if (!selectedGarden || selectedGarden.hasLoadedPlants) return;

    try {
      setIsLoadingSelectedGardenPlants(true);
      const plantedItems = await apiClient.getGardenPlants(selectedGarden.id);
      const gardenWithPlants = hydrateTrackerGarden(selectedGarden, plantedItems);

      setSelectedGarden(gardenWithPlants);
      setGardens(currentGardens => currentGardens.map(garden => (
        garden.id === gardenWithPlants.id ? gardenWithPlants : garden
      )));
      clearFeedback('plants-load');
    } catch (error) {
      console.error('Failed to load selected garden plants:', error);
      showError(
        'plants-load',
        getTrackerFailureMessage(error, 'Plants for this garden could not be loaded. Plant-based actions may be unavailable.')
      );
      setSelectedGarden(currentGarden => (
        currentGarden ? { ...currentGarden, hasLoadedPlants: true } : currentGarden
      ));
    } finally {
      setIsLoadingSelectedGardenPlants(false);
    }
  }, [clearFeedback, selectedGarden, showError]);

  useEffect(() => {
    loadGardens();
  }, [loadGardens]);

  return {
    gardens,
    selectedGarden,
    setSelectedGarden,
    isLoadingGardens,
    isLoadingSelectedGardenPlants,
    gardenLoadError,
    loadGardens,
    loadSelectedGardenPlants
  };
}
