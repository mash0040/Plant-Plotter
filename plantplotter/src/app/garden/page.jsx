'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, MouseSensor, TouchSensor} from '@dnd-kit/core';
import { ArrowRight, Plus, Ruler, Sprout } from 'lucide-react';
import PlantLibrary from '@/components/Garden/PlantLibrary';
import GardenCanvas from '@/components/Garden/GardenCanvas';
import ControlPanel from '@/components/Garden/ControlPanel';
import DraggablePlant from '@/components/Garden/DraggablePlant';
import LoadGardenModel from '@/components/Garden/LoadGardenModel';
import PlantEditModal from '@/components/Garden/PlantEditModal';
import RowPlantingModal from '@/components/Garden/RowPlantingModal';
import GardenForm from '@/components/Gardens/GardenForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmationModal from '@/components/ConfirmationModal';
import RequestErrorNotice from '@/components/RequestErrorNotice';
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';
import { snapToGrid, checkPlantOverlap, isWithinBounds, getPlantFootprint } from '@/components/Garden/Utils/GardenUtils';
import apiClient from '@/lib/api';
import { getActionErrorMessage, isAuthenticationError } from '@/lib/apiErrors';

const SAVE_MESSAGE_DURATION_MS = 6000;
const GARDEN_STATUS_STYLES = {
  Active: 'bg-green-100 text-green-800',
  Planning: 'bg-amber-100 text-amber-800',
  Dormant: 'bg-gray-100 text-gray-700'
};

function GardenPlannerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gardenId = searchParams.get('id');
  
  const [dimensions, setDimensions] = useState({ width: 20, height: 12 });
  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [placedPlants, setPlacedPlants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTouchPlanner, setIsTouchPlanner] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [plannerGardenSummaries, setPlannerGardenSummaries] = useState([]);
  const [isLoadingGardenSummaries, setIsLoadingGardenSummaries] = useState(false);
  const [gardenSummaryError, setGardenSummaryError] = useState('');
  
  // Garden state management
  const [currentGarden, setCurrentGarden] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCreateGardenForm, setShowCreateGardenForm] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [layoutSaveMessage, setLayoutSaveMessage] = useState('');
  const [layoutSaveError, setLayoutSaveError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [duplicatePlantPending, setDuplicatePlantPending] = useState(null);
  const [plannerLoadError, setPlannerLoadError] = useState('');
  const [placementPreview, setPlacementPreview] = useState(null);
  const [plannerLoadRetryKey, setPlannerLoadRetryKey] = useState(0);
  const [gardenSummaryRetryKey, setGardenSummaryRetryKey] = useState(0);

  // State to store plant library data
  const [libraryPlants, setLibraryPlants] = useState([]);

  useEffect(() => {
    if (!layoutSaveMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setLayoutSaveMessage('');
    }, SAVE_MESSAGE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [layoutSaveMessage]);

  // Store refresh function
  const [refreshPlantsFunction, setRefreshPlantsFunction] = useState(null);

  // Plant Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);

  // Row Planting Modal state
  const [showRowPlantingModal, setShowRowPlantingModal] = useState(false);
  const [rowPlantingPlant, setRowPlantingPlant] = useState(null);

  // Enhanced sensor configuration to prevent sidebar dragging
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Helper function to convert pixels to grid units
  const pixelsToGrid = (pixels) => Math.round(pixels / gridSize);
  
  // Helper function to convert grid units to pixels
  const gridToPixels = (gridUnits) => gridUnits * gridSize;

  // Enhanced duplicate checking function
  const checkForDuplicatePlant = (newPlantData, existingPlants) => {
    return existingPlants.some(existing => 
      existing.plantId === newPlantData.id || 
      existing.name?.toLowerCase() === newPlantData.name?.toLowerCase() ||
      existing.plantId?.toLowerCase() === newPlantData.id?.toLowerCase()
    );
  };

  // Enhanced callback to receive plants AND refresh function
  const handlePlantsLoaded = (plants, refreshFunction) => {
    setLibraryPlants(plants);
    
    if (refreshFunction) {
      setRefreshPlantsFunction(() => refreshFunction);
    }
  };

  // Handle edit plant requests from PlantLibrary
  const handleEditPlant = (plant) => {
    setEditingPlant(plant);
    setShowEditModal(true);
  };

  // Handle row planting requests from PlantLibrary
  const handlePlantRow = (plant) => {
    setRowPlantingPlant(plant);
    setShowRowPlantingModal(true);
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Enhanced save plant function
  const handleSavePlant = async (updatedPlant) => {
    try {
      // Transform data for API with correct enum values
      const plantData = {
        name: updatedPlant.name,
        emoji: updatedPlant.emoji,
        size: updatedPlant.size,
        category: updatedPlant.category,
        description: updatedPlant.description,
        spacing: updatedPlant.spacing,
        
        // Map frontend values to database enum values
        sunlight: updatedPlant.sunlight,
        water_needs: updatedPlant.waterNeeds,
        difficulty: updatedPlant.difficulty,
        
        days_to_maturity: updatedPlant.daysToMaturity ? parseInt(updatedPlant.daysToMaturity) : null,
        companion_plants: JSON.stringify(updatedPlant.companionPlants || []),
        avoid_plants: JSON.stringify(updatedPlant.avoidPlants || []),
        soil_types: JSON.stringify(updatedPlant.soilTypes || []),
        planting_depth: updatedPlant.plantingDepth
      };

      if (updatedPlant.id) {
        // Update existing plant
        await apiClient.updatePlant(updatedPlant.id, plantData);
      } else {
        // Add new plant - generate ID from name
        const newId = updatedPlant.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        plantData.id = newId;
        await apiClient.addPlantToLibrary(plantData);
      }
      
      // Auto-refresh plant library
      if (refreshPlantsFunction) {
        try {
          await refreshPlantsFunction();
        } catch (refreshError) {
          console.error('Failed to refresh plant library:', refreshError);
        }
      }
      
    } catch (error) {
      console.error('Failed to save plant:', error);
      throw error;
    }
  };

  // Enhanced delete plant function
  const handleDeletePlant = async (plant) => {
    try {
      await apiClient.deletePlantFromLibrary(plant.id);
      
      // Auto-refresh plant library
      if (refreshPlantsFunction) {
        try {
          await refreshPlantsFunction();
        } catch (refreshError) {
          console.error('Failed to refresh plant library after delete:', refreshError);
        }
      }
      
    } catch (error) {
      console.error('Failed to delete plant:', error);
      throw error;
    }
  };

  // Row planting execution handler
  const handleExecuteRowPlanting = (plantsToAdd) => {
    const hasOutOfBoundsPlant = plantsToAdd.some(plant => (
      !isWithinBoundsFlexible(plant, dimensions, gridSize, showGrid)
    ));

    if (hasOutOfBoundsPlant) {
      return {
        success: false,
        message: 'This row does not fit inside the garden. Adjust the row and try again.'
      };
    }

    const hasExistingOverlap = plantsToAdd.some(plant => (
      checkPlantOverlapFlexible(plant, placedPlants, gridSize, showGrid)
    ));

    if (hasExistingOverlap) {
      return {
        success: false,
        message: 'This row overlaps existing plants. Choose a different spot.'
      };
    }

    const hasRowOverlap = plantsToAdd.some((plant, index) => {
      const otherRowPlants = plantsToAdd.filter((_, otherIndex) => otherIndex !== index);
      return checkPlantOverlapFlexible(plant, otherRowPlants, gridSize, showGrid);
    });

    if (hasRowOverlap) {
      return {
        success: false,
        message: 'Plants in this row overlap each other. Increase spacing and try again.'
      };
    }

    setPlacedPlants(prev => [...prev, ...plantsToAdd]);
    setHasUnsavedChanges(true);

    return { success: true };
  };

  // Get active plant for drag overlay with proper plant resolution
  const activePlant = useMemo(() => {
    if (!activeId) return null;
    
    // First check if it's a placed plant
    const placedPlant = placedPlants.find(p => p.id === activeId);
    if (placedPlant) {
      return placedPlant;
    }
    
    // Then check if it's from the library
    if (activeId.startsWith('library-')) {
      const libraryId = activeId.replace('library-', '');
      
      // Check in the loaded library plants
      const libraryPlant = libraryPlants.find(p => p.id === libraryId);
      if (libraryPlant) {
        return libraryPlant;
      }
      
      // Fallback to PLANT_LIBRARY constant
      const fallbackPlant = PLANT_LIBRARY?.find(p => p.id === libraryId);
      if (fallbackPlant) {
        return fallbackPlant;
      }
    }
    
    return null;
  }, [activeId, placedPlants, libraryPlants]);

  // Load garden data using apiClient
  useEffect(() => {
    const loadGarden = async () => {
      if (!gardenId) return;
      
      setLoading(true);
      try {
        setPlannerLoadError('');
        const garden = await apiClient.getGarden(gardenId);
        
        if (!garden) {
          setPlannerLoadError('Garden not found.');
          setCurrentGarden(null);
          setPlacedPlants([]);
          return;
        }
        
        // Set garden data
        setCurrentGarden(garden);
        
        // Better dimension handling - try multiple sources
        const gardenWidth = garden.width || garden.dimensions?.width || 20;
        const gardenHeight = garden.height || garden.dimensions?.height || 12;
        
        setDimensions({
          width: gardenWidth,
          height: gardenHeight
        });
        
        // Convert planted items from storage format to planner format
        if (garden.plantedItems && garden.plantedItems.length > 0) {
          const convertedPlants = garden.plantedItems.map(item => ({
            id: `plant-${item.id ?? crypto.randomUUID()}`,
            plantId: item.plantId,
            name: item.name,
            emoji: item.emoji,
            size: item.size,
            category: getBestPlantCategory(item),
            // Convert grid positions to pixel positions
            x: gridToPixels(item.xPosition || 0),
            y: gridToPixels(item.yPosition || 0),
            plantedDate: item.plantedDate ? new Date(item.plantedDate) : null,
            notes: item.notes || '',
            isFromLibrary: false
          }));
          setPlacedPlants(convertedPlants);
        } else {
          setPlacedPlants([]);
        }
        
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to load garden:', error);
        setPlannerLoadError(getActionErrorMessage(error, 'This garden could not be loaded.', 'Try again.'));
        setCurrentGarden(null);
        setPlacedPlants([]);
      } finally {
        setLoading(false);
      }
    };

    loadGarden();
  }, [gardenId, router, plannerLoadRetryKey]);

  useEffect(() => {
    const loadGardenSummaries = async () => {
      if (gardenId) return;

      setIsLoadingGardenSummaries(true);
      setGardenSummaryError('');

      try {
        const summaries = await apiClient.getGardenSummaries();
        setPlannerGardenSummaries(Array.isArray(summaries) ? summaries : []);
      } catch (error) {
        console.error('Failed to load garden summaries for planner:', error);
        if (isAuthenticationError(error)) {
          return;
        }
        setGardenSummaryError(getActionErrorMessage(error, 'Your gardens could not be loaded.', 'Try again.'));
        setPlannerGardenSummaries([]);
      } finally {
        setIsLoadingGardenSummaries(false);
      }
    };

    loadGardenSummaries();
  }, [gardenId, gardenSummaryRetryKey]);

  // Enhanced bounds checking
  const isWithinBoundsFlexible = (plant, dimensions, gridSize, useGrid = true) => {
    const plantSize = getPlantFootprint(plant) * gridSize;
    const maxX = dimensions.width * gridSize;
    const maxY = dimensions.height * gridSize;
    
    if (useGrid) {
      return isWithinBounds(plant, dimensions, gridSize);
    } else {
      return plant.x >= 0 && 
             plant.y >= 0 && 
             plant.x + plantSize <= maxX && 
             plant.y + plantSize <= maxY;
    }
  };

  // Enhanced overlap checking
  const checkPlantOverlapFlexible = (newPlant, existingPlants, gridSize, useGrid = true) => {
    if (useGrid) {
      return checkPlantOverlap(newPlant, existingPlants, gridSize);
    } else {
      const newSize = getPlantFootprint(newPlant) * gridSize;
      
      return existingPlants.some(existing => {
        const existingSize = getPlantFootprint(existing) * gridSize;
        
        return !(newPlant.x >= existing.x + existingSize ||
                 existing.x >= newPlant.x + newSize ||
                 newPlant.y >= existing.y + existingSize ||
                 existing.y >= newPlant.y + newSize);
      });
    }
  };

  const addPlacedPlant = (newPlant) => {
    setLayoutSaveMessage('');
    setLayoutSaveError('');
    setPlacedPlants(prev => [...prev, newPlant]);
    setHasUnsavedChanges(true);

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const validateNewPlantPlacement = (newPlant) => {
    const withinBounds = isWithinBoundsFlexible(newPlant, dimensions, gridSize, showGrid);
    const hasOverlap = checkPlantOverlapFlexible(newPlant, placedPlants, gridSize, showGrid);
    const plantFootprint = getPlantFootprint(newPlant);
    const footprintLabel = `${plantFootprint}x${plantFootprint}`;

    if (!withinBounds) {
      setLayoutSaveMessage('');
      setLayoutSaveError(`This ${footprintLabel} plant needs to fit fully inside the garden.`);
      return false;
    }

    if (hasOverlap) {
      setLayoutSaveMessage('');
      setLayoutSaveError(`This ${footprintLabel} plant needs a clear ${footprintLabel} space.`);
      return false;
    }

    return true;
  };

  const handleNewPlantPlacement = (newPlant, { allowDuplicate = false } = {}) => {
    if (!validateNewPlantPlacement(newPlant)) return;

    const isDuplicate = checkForDuplicatePlant(newPlant, placedPlants);

    if (isDuplicate && !allowDuplicate) {
      setDuplicatePlantPending(newPlant);
      return;
    }

    addPlacedPlant(newPlant);
  };

  const handleConfirmDuplicatePlant = () => {
    if (!duplicatePlantPending) return;
    const plantToAdd = duplicatePlantPending;
    setDuplicatePlantPending(null);
    handleNewPlantPlacement(plantToAdd, { allowDuplicate: true });
  };

  const handleDragStart = (event) => {
    if (isTouchPlanner) return;

    const { active } = event;
    const draggedData = active.data.current;

    // Only set active ID if it's a valid draggable item
    if (draggedData && (draggedData.isFromLibrary !== undefined)) {
      setActiveId(active.id);
    } else {
      return;
    }
  };

  const getDragClientPoint = (dragEvent) => {
    const translatedRect = dragEvent?.active?.rect?.current?.translated;
    if (translatedRect) {
      return {
        x: translatedRect.left + (translatedRect.width / 2),
        y: translatedRect.top + (translatedRect.height / 2)
      };
    }

    const initialRect = dragEvent?.active?.rect?.current?.initial;
    if (initialRect && dragEvent?.delta) {
      return {
        x: initialRect.left + (initialRect.width / 2) + dragEvent.delta.x,
        y: initialRect.top + (initialRect.height / 2) + dragEvent.delta.y
      };
    }

    const activatorEvent = dragEvent?.activatorEvent;
    const delta = dragEvent?.delta;
    const startX = activatorEvent?.clientX ?? activatorEvent?.touches?.[0]?.clientX ?? activatorEvent?.changedTouches?.[0]?.clientX;
    const startY = activatorEvent?.clientY ?? activatorEvent?.touches?.[0]?.clientY ?? activatorEvent?.changedTouches?.[0]?.clientY;

    if (startX === undefined || startY === undefined || !delta) {
      return null;
    }

    return {
      x: startX + delta.x,
      y: startY + delta.y
    };
  };

  const getLibraryPlantPlacement = (dragEvent, draggedData) => {
    const canvasElement = document.querySelector('[data-canvas="true"]');
    const clientPoint = getDragClientPoint(dragEvent);

    if (!canvasElement || !clientPoint) {
      return null;
    }

    const canvasRect = canvasElement.getBoundingClientRect();
    let canvasX = clientPoint.x - canvasRect.left;
    let canvasY = clientPoint.y - canvasRect.top;
    const isOverGardenCanvas = dragEvent?.over?.id === 'garden-canvas';

    if (canvasX < 0 || canvasY < 0 || canvasX > canvasRect.width || canvasY > canvasRect.height) {
      const outsideDistance = Math.max(
        canvasX < 0 ? Math.abs(canvasX) : 0,
        canvasY < 0 ? Math.abs(canvasY) : 0,
        canvasX > canvasRect.width ? canvasX - canvasRect.width : 0,
        canvasY > canvasRect.height ? canvasY - canvasRect.height : 0
      );

      if (!isOverGardenCanvas || outsideDistance > gridSize) {
        return {
          isInsideCanvas: false
        };
      }

      canvasX = Math.min(Math.max(canvasX, 0), canvasRect.width);
      canvasY = Math.min(Math.max(canvasY, 0), canvasRect.height);
    }

    const plantFootprint = getPlantFootprint(draggedData);
    const plantSize = plantFootprint * gridSize;
    let plantX = canvasX - (plantSize / 2);
    let plantY = canvasY - (plantSize / 2);

    if (showGrid) {
      plantX = snapToGrid(Math.max(0, plantX), gridSize);
      plantY = snapToGrid(Math.max(0, plantY), gridSize);
    } else {
      plantX = Math.max(0, plantX);
      plantY = Math.max(0, plantY);
    }

    const maxX = (dimensions.width * gridSize) - plantSize;
    const maxY = (dimensions.height * gridSize) - plantSize;
    plantX = Math.min(plantX, Math.max(0, maxX));
    plantY = Math.min(plantY, Math.max(0, maxY));

    const proposedPlant = {
      ...draggedData,
      x: plantX,
      y: plantY,
      isFromLibrary: false
    };
    const withinBounds = isWithinBoundsFlexible(proposedPlant, dimensions, gridSize, showGrid);
    const hasOverlap = checkPlantOverlapFlexible(proposedPlant, placedPlants, gridSize, showGrid);
    const footprintLabel = `${plantFootprint}x${plantFootprint}`;

    return {
      isInsideCanvas: true,
      plant: proposedPlant,
      preview: {
        x: plantX,
        y: plantY,
        size: plantFootprint,
        isValid: withinBounds && !hasOverlap,
        message: !withinBounds
          ? `This ${footprintLabel} plant needs to fit fully inside the garden.`
          : hasOverlap
            ? `This ${footprintLabel} plant needs a clear ${footprintLabel} space.`
            : ''
      }
    };
  };

  const handleDragMove = (event) => {
    if (isTouchPlanner) return;

    const draggedData = event.active.data.current;

    if (!draggedData?.isFromLibrary) {
      setPlacementPreview(null);
      return;
    }

    const placement = getLibraryPlantPlacement(event, draggedData);
    setPlacementPreview(placement?.isInsideCanvas ? placement.preview : null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setPlacementPreview(null);
  };

  const handleDragEnd = (event) => {
    if (isTouchPlanner) return;

    const { active, over, delta } = event;

    setActiveId(null);
    setPlacementPreview(null);

    const draggedData = active.data.current;

    if (draggedData?.isFromLibrary) {
      const placement = getLibraryPlantPlacement(event, draggedData);

      if (!placement?.isInsideCanvas) {
        return;
      }

      const newPlant = {
        ...placement.plant,
        id: `plant-${Date.now()}`,
        plantId: draggedData.id,
        isFromLibrary: false,
        plantedDate: new Date()
      };

      handleNewPlantPlacement(newPlant);
      
    } else if (!draggedData?.isFromLibrary) {
      if (!over || over.id !== 'garden-canvas') {
        return;
      }

      // Moving existing plant
      setPlacedPlants(prev => prev.map(plant => {
        if (plant.id === active.id) {
          let newX, newY;
          
          if (showGrid) {
            newX = snapToGrid(Math.max(0, (plant.x || 0) + delta.x), gridSize);
            newY = snapToGrid(Math.max(0, (plant.y || 0) + delta.y), gridSize);
          } else {
            newX = Math.max(0, (plant.x || 0) + delta.x);
            newY = Math.max(0, (plant.y || 0) + delta.y);
          }
          
          const updatedPlant = { ...plant, x: newX, y: newY };
          
          // Check if new position is valid
          const otherPlants = prev.filter(p => p.id !== plant.id);
          if (isWithinBoundsFlexible(updatedPlant, dimensions, gridSize, showGrid) && 
              !checkPlantOverlapFlexible(updatedPlant, otherPlants, gridSize, showGrid)) {
            if (updatedPlant.x !== plant.x || updatedPlant.y !== plant.y) {
              setHasUnsavedChanges(true);
            }
            return updatedPlant;
          } else {
            return plant;
          }
        }
        return plant;
      }));
    }
  };

  const getPlannerPlantedItemsPayload = () => placedPlants.map(plant => ({
    plant_id: plant.plantId || plant.id?.replace('plant-', '') || 'unknown',
    plant_name: plant.name,
    plant_emoji: plant.emoji,
    plant_size: getPlantFootprint(plant),
    plant_category: getBestPlantCategory(plant),
    x_position: Math.floor((plant.x || 0) / gridSize),
    y_position: Math.floor((plant.y || 0) / gridSize),
    planted_date: plant.plantedDate ?
      (plant.plantedDate instanceof Date ?
        plant.plantedDate.toISOString().split('T')[0] :
        plant.plantedDate) :
      new Date().toISOString().split('T')[0],
    notes: plant.notes || ''
  }));

  const getMinimumDimensionsForPlacedPlants = () => {
    return placedPlants.reduce((minimumDimensions, plant) => {
      const plantSize = getPlantFootprint(plant);
      const plantGridX = pixelsToGrid(plant.x);
      const plantGridY = pixelsToGrid(plant.y);

      return {
        width: Math.max(minimumDimensions.width, plantGridX + plantSize),
        height: Math.max(minimumDimensions.height, plantGridY + plantSize)
      };
    }, { width: 0, height: 0 });
  };

  const getDimensionValidationMessage = (newDimensions) => {
    const minimumDimensions = getMinimumDimensionsForPlacedPlants();

    if (newDimensions.width < minimumDimensions.width || newDimensions.height < minimumDimensions.height) {
      return `Cannot resize garden smaller than ${minimumDimensions.width}x${minimumDimensions.height} m because existing plants would be outside the garden.`;
    }

    return '';
  };

  const handleSaveLayout = async () => {
    if (isSavingLayout) return;

    if (!currentGarden?.id) {
      setLayoutSaveError('Create or select a garden before saving a layout.');
      return;
    }

    if (!hasUnsavedChanges) {
      setLayoutSaveError('');
      setLayoutSaveMessage('No changes to save.');
      return;
    }

    try {
      setIsSavingLayout(true);
      setLayoutSaveError('');
      setLayoutSaveMessage('');

      const dimensionError = getDimensionValidationMessage(dimensions);
      if (dimensionError) {
        setLayoutSaveError(dimensionError);
        return;
      }

      const updatedGarden = await apiClient.updateGarden(currentGarden.id, {
        name: currentGarden.name,
        description: currentGarden.description || '',
        width: dimensions.width,
        height: dimensions.height,
        soil_type: currentGarden.soil_type || currentGarden.soilType || 'Loamy',
        location: currentGarden.location || null,
        status: currentGarden.status || 'Planning'
      });

      const plantedItems = getPlannerPlantedItemsPayload();
      await apiClient.saveGardenPlantedItems(currentGarden.id, plantedItems);

      setCurrentGarden(prev => ({
        ...prev,
        ...updatedGarden,
        dimensions: {
          width: updatedGarden.dimensions?.width || updatedGarden.width || dimensions.width,
          height: updatedGarden.dimensions?.height || updatedGarden.height || dimensions.height
        },
        soilType: updatedGarden.soil_type || updatedGarden.soilType || prev.soilType,
        plantCount: placedPlants.length,
        plant_count: placedPlants.length,
        plantedItems: placedPlants
      }));
      
      setHasUnsavedChanges(false);
      setLayoutSaveMessage('Layout saved.');
    } catch (error) {
      console.error('Garden layout save failed:', error);
      setLayoutSaveError(getActionErrorMessage(
        error,
        'Your layout could not be saved.',
        'Your changes are still here; try again.'
      ));
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleCreateGardenFromPlanner = async (gardenData) => {
    const createData = {
      name: gardenData.name,
      description: gardenData.description || '',
      width: gardenData.dimensions?.width || gardenData.width,
      height: gardenData.dimensions?.height || gardenData.height,
      soil_type: gardenData.soil_type || gardenData.soilType,
      location: gardenData.location,
      status: gardenData.status
    };

    const savedGarden = await apiClient.createGarden(createData);
    setShowCreateGardenForm(false);
    router.push(`/garden?id=${savedGarden.id}`);
  };

  const getSafeGardenName = (garden) => {
    if (!garden || !garden.name) {
      return 'Garden';
    }
    
    // Handle corrupted object names
    if (typeof garden.name === 'string') {
      // If it's the corrupted "[object Object]" string, use a fallback
      if (garden.name === '[object Object]') {
        return `Garden ${garden.id || 'Untitled'}`;
      }
      return garden.name;
    } else if (typeof garden.name === 'object' && garden.name !== null) {
      // If somehow it's still an actual object, extract string
      return garden.name.name || garden.name.value || `Garden ${garden.id || 'Untitled'}`;
    } else {
      return String(garden.name || 'Garden');
    }
  };

  const safeGardenName = getSafeGardenName(currentGarden);
  const activePlantFootprint = activePlant ? getPlantFootprint(activePlant) : 1;
  const isCompactDragOverlay = activePlantFootprint === 1 || gridSize < 48;
  const isDraggingFromLibrary = typeof activeId === 'string' && activeId.startsWith('library-');
  const dragPlacementState = placementPreview
    ? (placementPreview.isValid ? 'valid' : 'invalid')
    : 'neutral';
  const dragIntentLabel = dragPlacementState === 'valid'
    ? 'Ready to place'
    : dragPlacementState === 'invalid'
      ? 'Space blocked'
      : isDraggingFromLibrary
        ? 'Move onto garden'
        : 'Move plant';
  const dragOverlayTone = dragPlacementState === 'valid'
    ? 'border-green-600 bg-green-50/95'
    : dragPlacementState === 'invalid'
      ? 'border-red-500 bg-red-50/95'
      : 'border-green-700 bg-white/95';
  const dragIntentTone = dragPlacementState === 'valid'
    ? 'bg-green-600 text-white'
    : dragPlacementState === 'invalid'
      ? 'bg-red-600 text-white'
      : 'bg-green-100 text-green-900';

  const getBestPlantCategory = (plant) => {
    const existingCategory = plant?.category || plant?.plant_category || plant?.type;
    if (existingCategory && existingCategory.toLowerCase?.() !== 'other') {
      return existingCategory;
    }

    const plantId = plant?.plantId || plant?.plant_id || plant?.id?.replace?.('plant-', '');
    const plantName = plant?.name?.toLowerCase?.().trim();
    const availablePlantData = [...libraryPlants, ...(PLANT_LIBRARY || [])];
    const libraryPlant = availablePlantData.find((libraryItem) => (
      libraryItem.id === plantId ||
      libraryItem.name?.toLowerCase?.().trim() === plantName
    ));

    return libraryPlant?.category || libraryPlant?.type || existingCategory || null;
  };

  // Load garden using apiClient
  const handleLoadGarden = async (gardenData) => {
    if (!gardenData) {
      setLayoutSaveMessage('');
      setLayoutSaveError('Garden not found.');
      return;
    }
    
    setCurrentGarden(gardenData);
    setDimensions({ 
      width: gardenData.dimensions?.width || gardenData.width, 
      height: gardenData.dimensions?.height || gardenData.height 
    });
    
    // Convert storage format to planner format
    const convertedPlants = (gardenData.plantedItems || []).map(item => ({
      id: `plant-${item.id || Date.now()}`,
      plantId: item.plantId,
      name: item.name,
      emoji: item.emoji,
      size: item.size,
      category: getBestPlantCategory(item),
      x: gridToPixels(item.xPosition || 0),
      y: gridToPixels(item.yPosition || 0),
      plantedDate: item.plantedDate ? new Date(item.plantedDate) : null,
      notes: item.notes,
      isFromLibrary: false
    }));
    
    setPlacedPlants(convertedPlants);
    setHasUnsavedChanges(false);
  };

  const handleBackToGarden = () => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      router.push('/garden');
    }
  };

  const handleConfirmLeavePlanner = () => {
    setShowLeaveConfirm(false);
    router.push('/garden');
  };

  const handlePlantRemove = (plantId) => {
    setLayoutSaveMessage('');
    setLayoutSaveError('');
    setPlacedPlants(prev => {
      const nextPlants = prev.filter(p => p.id !== plantId);
      if (nextPlants.length !== prev.length) {
        setHasUnsavedChanges(true);
      }
      return nextPlants;
    });
  };

  // Dimension change validation
  const validateDimensionChange = (newDimensions) => {
    const validationMessage = getDimensionValidationMessage(newDimensions);

    if (validationMessage) {
      setLayoutSaveMessage('');
      setLayoutSaveError(validationMessage);
      return false;
    }

    return true;
  };

  const handleDimensionChange = (newDimensions) => {
    if (validateDimensionChange(newDimensions)) {
      setLayoutSaveMessage('');
      setLayoutSaveError('');
      if (newDimensions.width !== dimensions.width || newDimensions.height !== dimensions.height) {
        setHasUnsavedChanges(true);
      }
      setDimensions(newDimensions);
      return true;
    }

    return false;
  };

  const handleGridSizeChange = (newGridSize) => {
    if (newGridSize === gridSize) return;

    const scale = newGridSize / gridSize;

    setPlacedPlants(prev => prev.map(plant => ({
      ...plant,
      x: Math.round((plant.x || 0) * scale),
      y: Math.round((plant.y || 0) * scale)
    })));
    setLayoutSaveMessage('');
    setLayoutSaveError('');
    setGridSize(newGridSize);
  };

  // Close sidebar handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 1024) {
        const sidebar = event.target.closest('[data-sidebar]');
        const menuButton = event.target.closest('[data-menu-button]');
        
        if (!sidebar && !menuButton) {
          setSidebarOpen(false);
        }
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(pointer: coarse), (max-width: 767px)');
    const updateTouchPlanner = () => setIsTouchPlanner(mediaQuery.matches);

    updateTouchPlanner();
    mediaQuery.addEventListener('change', updateTouchPlanner);

    return () => mediaQuery.removeEventListener('change', updateTouchPlanner);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading garden...</p>
        </div>
      </div>
    );
  }

  if (plannerLoadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
          <RequestErrorNotice
            title="Planner unavailable"
            message={plannerLoadError}
            onRetry={() => setPlannerLoadRetryKey(prevKey => prevKey + 1)}
          />
          <Link
            href="/gardens"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:w-auto"
          >
            Go to My Gardens
          </Link>
        </div>
      </div>
    );
  }

  if (!gardenId) {
    if (isLoadingGardenSummaries) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your gardens...</p>
          </div>
        </div>
      );
    }

    const hasGardenSummaries = plannerGardenSummaries.length > 0;

    if (gardenSummaryError && !hasGardenSummaries) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 px-4 py-8">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
            <RequestErrorNotice
              title="Gardens unavailable"
              message={gardenSummaryError}
              onRetry={() => setGardenSummaryRetryKey(prevKey => prevKey + 1)}
            />
            <Link
              href="/gardens"
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:w-auto"
            >
              Go to My Gardens
            </Link>
          </div>
        </div>
      );
    }

    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-6xl">
          {hasGardenSummaries ? (
            <div className="space-y-8">
              <div className="flex flex-col gap-5 border-b border-green-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <h1 className="text-2xl font-semibold text-green-950 sm:text-3xl">Choose a garden to plan</h1>
                  <p className="mt-2 text-base leading-7 text-green-950/70">
                    Compare your garden spaces, then open one to arrange plants and refine its layout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateGardenForm(true)}
                  className="touch-target inline-flex min-h-11 w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-800 shadow-sm transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Create Garden
                </button>
              </div>

              {gardenSummaryError && (
                <RequestErrorNotice
                  title="Gardens may be out of date"
                  message={gardenSummaryError}
                  onRetry={() => setGardenSummaryRetryKey(prevKey => prevKey + 1)}
                />
              )}

              <div className={`grid w-full grid-cols-1 items-stretch gap-5 ${
                plannerGardenSummaries.length === 1
                  ? 'mx-auto max-w-md'
                  : plannerGardenSummaries.length === 2
                    ? 'mx-auto max-w-3xl sm:grid-cols-2'
                    : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {plannerGardenSummaries.map((gardenSummary) => {
                  const status = gardenSummary.status || 'Planning';
                  const plantCount = gardenSummary.plantCount || gardenSummary.plant_count || 0;
                  const width = gardenSummary.dimensions?.width || gardenSummary.width;
                  const height = gardenSummary.dimensions?.height || gardenSummary.height;

                  return (
                    <article
                      key={gardenSummary.id}
                      className="flex h-full flex-col rounded-xl bg-white p-5 shadow-[0_12px_30px_-20px_rgba(20,83,45,0.55)] transition-shadow hover:shadow-[0_16px_36px_-20px_rgba(20,83,45,0.7)] sm:p-6"
                    >
                      <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${GARDEN_STATUS_STYLES[status] || GARDEN_STATUS_STYLES.Planning}`}>
                        {status}
                      </span>

                      <h2 className="mt-4 break-words text-xl font-semibold leading-7 text-green-950">
                        {gardenSummary.name}
                      </h2>

                      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-green-100 py-4">
                        <div className="min-w-0">
                          <dt className="flex items-center gap-2 text-xs font-medium text-green-900/70">
                            <Ruler className="h-4 w-4 flex-shrink-0 text-green-700" />
                            Size
                          </dt>
                          <dd className="mt-1 break-words text-base font-semibold text-gray-900">
                            {width}m x {height}m
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="flex items-center gap-2 text-xs font-medium text-green-900/70">
                            <Sprout className="h-4 w-4 flex-shrink-0 text-green-700" />
                            Plants
                          </dt>
                          <dd className="mt-1 text-base font-semibold text-gray-900">
                            {plantCount}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto pt-6">
                        <Link
                          href={`/garden?id=${gardenSummary.id}`}
                          className="touch-target inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                        >
                          Plan Garden
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <section className="mx-auto flex w-full max-w-3xl flex-col items-center border-y border-green-200 py-12 text-center sm:py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Sprout className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold text-green-950 sm:text-3xl">Start your first garden plan</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-green-950/70">
                Create a garden with its dimensions, then open the planner to arrange plants in the space.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateGardenForm(true)}
                className="touch-target mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Create Garden
              </button>
            </section>
          )}
        </div>

        <GardenForm
          garden={null}
          onSave={handleCreateGardenFromPlanner}
          onClose={() => setShowCreateGardenForm(false)}
          isOpen={showCreateGardenForm}
        />
      </main>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Plant Library Sidebar */}
        <div 
          data-sidebar 
          className={`relative flex-shrink-0 lg:z-10 ${sidebarOpen ? 'z-[60]' : 'z-10'}`}
          style={{ 
            touchAction: 'pan-y',
            userSelect: 'none'
          }}
        >
          <PlantLibrary
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            placedPlants={placedPlants}
            onPlantsLoaded={handlePlantsLoaded}
            onEditPlant={handleEditPlant}
            onPlantRow={handlePlantRow}
            disableDrag={isTouchPlanner}
          />
        </div>

        {/* Main Content Area */}
        <main
          aria-label="Garden planner workspace"
          className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-emerald-50/40"
        >
          <ControlPanel
            dimensions={dimensions}
            gridSize={gridSize}
            showGrid={showGrid}
            showRuler={showRuler}
            onDimensionChange={handleDimensionChange}
            onGridSizeChange={handleGridSizeChange}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleRuler={() => setShowRuler(!showRuler)}
            onSave={handleSaveLayout}
            hasUnsavedChanges={hasUnsavedChanges}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            gardenName={safeGardenName}
            onBackClick={handleBackToGarden}
            backLabel="Choose another garden"
            saveLabel={isSavingLayout ? 'Saving...' : 'Save Layout'}
            saveMessage={layoutSaveMessage}
            saveError={layoutSaveError}
          />

          <section
            aria-label="Garden layout workspace"
            className="relative min-h-0 flex-1 overflow-hidden border-t border-green-100 bg-emerald-100/50"
          >
            <GardenCanvas
              dimensions={dimensions}
              gridSize={gridSize}
              showGrid={showGrid}
              showRuler={showRuler}
              placedPlants={placedPlants}
              onPlantRemove={handlePlantRemove}
              placementPreview={placementPreview}
              isPlantLibraryOpen={sidebarOpen}
              disablePlantDragging={isTouchPlanner}
            />
          </section>
        </main>

        {/* DragOverlay with enhanced visibility */}
        {!isTouchPlanner && (
        <DragOverlay
          dropAnimation={prefersReducedMotion ? null : {
            duration: 180,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          style={{
            zIndex: 999999,
          }}
        >
          {activePlant ? (
            <div
              style={{
                width: activePlantFootprint * gridSize,
                height: activePlantFootprint * gridSize,
                pointerEvents: 'none',
              }}
              className={`relative flex items-center justify-center overflow-visible rounded-lg border-2 shadow-[0_12px_28px_-12px_rgba(20,83,45,0.55)] transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none ${dragOverlayTone}`}
            >
              <div aria-hidden="true" className={`${isCompactDragOverlay ? 'text-lg' : 'text-4xl'} drop-shadow-sm`}>
                {activePlant.emoji}
              </div>

              <div className="absolute left-1/2 top-full z-10 mt-2 w-max max-w-48 -translate-x-1/2 rounded-lg bg-white px-2.5 py-2 text-center shadow-[0_10px_24px_-12px_rgba(17,24,39,0.6)]">
                <p className="truncate text-xs font-semibold text-green-950">
                  {activePlant.name}
                </p>
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold">
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-green-900">
                    {activePlantFootprint}x{activePlantFootprint} units
                  </span>
                  <span className={`rounded px-1.5 py-0.5 ${dragIntentTone}`}>
                    {dragIntentLabel}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
        )}
        
      </DndContext>

      {/* Plant Edit Modal */}
      <PlantEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPlant(null);
        }}
        plant={editingPlant}
        onSave={handleSavePlant}
        onDelete={editingPlant?.id ? handleDeletePlant : null}
        isPlaced={false}
      />

      {/* Row Planting Modal */}
      <RowPlantingModal
        isOpen={showRowPlantingModal}
        onClose={() => {
          setShowRowPlantingModal(false);
          setRowPlantingPlant(null);
        }}
        plant={rowPlantingPlant}
        onPlant={handleExecuteRowPlanting}
        gridSize={gridSize}
        dimensions={dimensions}
      />

      {/* Load Garden Modal */}
      <LoadGardenModel
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoadGarden}
      />

      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Leave planner?"
        message="You have unsaved planner changes. If you leave now, those changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={handleConfirmLeavePlanner}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      <ConfirmationModal
        isOpen={Boolean(duplicatePlantPending)}
        title="Add another plant?"
        message={`This garden already has ${duplicatePlantPending?.name || 'this plant'}. Add another one?`}
        confirmLabel="Add Another"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleConfirmDuplicatePlant}
        onCancel={() => setDuplicatePlantPending(null)}
      />
    </div>
  );
}

export default function GardenPlannerPage() {
  return (
    <ProtectedRoute>
      <GardenPlannerPageContent />
    </ProtectedRoute>
  );
}
