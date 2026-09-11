'use client';
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import {
  getActionErrorMessage,
  isAuthenticationError,
  shouldUseLocalReadFallback
} from '@/lib/apiErrors';
import {
  hydrateTrackerGarden,
  normalizeTrackerGardens
} from '@/lib/trackerData';
import { getTrackerFailureMessage } from './useTrackerFeedback';
import useTrackerRequestScope from './useTrackerRequestScope';

export default function useTrackerGardens({ showError, showWarning, clearFeedback, initialGardenId }) {
  const [gardens, setGardens] = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [isLoadingGardens, setIsLoadingGardens] = useState(true);
  const [loadingPlantsScope, setLoadingPlantsScope] = useState(null);
  const [gardenLoadError, setGardenLoadError] = useState('');
  const gardensScope = useTrackerRequestScope('gardens');
  const plantsScope = useTrackerRequestScope(selectedGarden?.id);

  const loadGardens = useCallback(async () => {
    if (!gardensScope.isActive()) return;
    const isCurrentRequest = gardensScope.startRequest();
    try {
      setIsLoadingGardens(true);
      setGardenLoadError('');
      const gardenSummaries = await apiClient.getGardenSummaries();
      if (!isCurrentRequest()) return;
      const trackerGardens = normalizeTrackerGardens(gardenSummaries);

      setGardens(trackerGardens);
      setSelectedGarden(currentGarden => currentGarden
        || trackerGardens.find(garden => String(garden.id) === initialGardenId)
        || trackerGardens[0] || null);
      setGardenLoadError('');
      clearFeedback('gardens-load');
    } catch (error) {
      if (!isCurrentRequest()) return;
      console.error('Failed to load gardens from API:', error);
      if (isAuthenticationError(error)) {
        setGardens([]);
        setGardenLoadError('');
        clearFeedback('gardens-load');
        return;
      }

      const errorMessage = getActionErrorMessage(error, 'Your gardens could not be loaded.', 'Try again.');

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
      if (isCurrentRequest()) setIsLoadingGardens(false);
    }
  }, [clearFeedback, gardensScope, initialGardenId, showWarning]);

  const loadSelectedGardenPlants = useCallback(async () => {
    if (!selectedGarden || selectedGarden.hasLoadedPlants || !plantsScope.isActive()) return;
    const isCurrentRequest = plantsScope.startRequest();

    try {
      setLoadingPlantsScope(plantsScope);
      const plantedItems = await apiClient.getGardenPlants(selectedGarden.id);
      if (!isCurrentRequest()) return;
      const gardenWithPlants = hydrateTrackerGarden(selectedGarden, plantedItems);

      setSelectedGarden(currentGarden => (
        currentGarden?.id === selectedGarden.id ? gardenWithPlants : currentGarden
      ));
      setGardens(currentGardens => currentGardens.map(garden => (
        garden.id === gardenWithPlants.id ? gardenWithPlants : garden
      )));
      clearFeedback('plants-load');
    } catch (error) {
      if (!isCurrentRequest()) return;
      console.error('Failed to load selected garden plants:', error);
      showError(
        'plants-load',
        getTrackerFailureMessage(error, 'Plants for this garden could not be loaded. Plant-based actions may be unavailable.')
      );
      setSelectedGarden(currentGarden => (
        currentGarden?.id === selectedGarden.id
          ? { ...currentGarden, hasLoadedPlants: true }
          : currentGarden
      ));
    } finally {
      if (isCurrentRequest()) setLoadingPlantsScope(null);
    }
  }, [clearFeedback, plantsScope, selectedGarden, showError]);

  useEffect(() => {
    clearFeedback('plants-load');
  }, [clearFeedback, plantsScope]);

  useEffect(() => {
    loadGardens();
  }, [loadGardens]);

  return {
    gardens,
    selectedGarden,
    setSelectedGarden,
    isLoadingGardens,
    isLoadingSelectedGardenPlants: loadingPlantsScope === plantsScope,
    gardenLoadError,
    loadGardens,
    loadSelectedGardenPlants
  };
}
