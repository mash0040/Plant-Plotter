'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, MouseSensor, TouchSensor} from '@dnd-kit/core';
import { ArrowRight, Plus } from 'lucide-react';
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
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';
import { snapToGrid, checkPlantOverlap, isWithinBounds, getPlantFootprint } from '@/components/Garden/Utils/GardenUtils';
import apiClient from '@/lib/api';

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

  // State to store plant library data
  const [libraryPlants, setLibraryPlants] = useState([]);

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
        setPlannerLoadError('Failed to load garden. Please try again.');
        setCurrentGarden(null);
        setPlacedPlants([]);
      } finally {
        setLoading(false);
      }
    };

    loadGarden();
  }, [gardenId, router]);

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
        if (error.status === 401) {
          return;
        }
        setGardenSummaryError('Could not load your gardens. Please try again.');
        setPlannerGardenSummaries([]);
      } finally {
        setIsLoadingGardenSummaries(false);
      }
    };

    loadGardenSummaries();
  }, [gardenId]);

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
    const isDuplicate = checkForDuplicatePlant(newPlant, placedPlants);

    if (isDuplicate && !allowDuplicate) {
      setDuplicatePlantPending(newPlant);
      return;
    }

    if (!validateNewPlantPlacement(newPlant)) return;

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
          isInsideCanvas: false,
          message: 'Drop plants inside the garden canvas.'
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
        setLayoutSaveMessage('');
        setLayoutSaveError(placement?.message || 'Drop plants inside the garden canvas.');
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
        location: currentGarden.location || 'Garden',
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
      setLayoutSaveMessage('Changes saved successfully.');
    } catch (error) {
      console.error('Garden layout save failed:', error);
      setLayoutSaveError(error.message || 'Failed to save layout. Please try again.');
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
        <div className="w-full max-w-md bg-white/90 border border-red-100 rounded-2xl shadow-xl p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Planner unavailable</h1>
          <p className="text-sm text-gray-600 mb-5">{plannerLoadError}</p>
          <Link
            href="/gardens"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 px-4 py-8">
        <div className="mx-auto w-full max-w-5xl">
          {hasGardenSummaries ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-7 h-7 text-green-700" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">Choose a garden to plan</h1>
                <p className="mx-auto max-w-2xl text-gray-600">
                  Select one of your gardens to open its planner. Garden details and saved plants will load after you choose.
                </p>
              </div>

              {gardenSummaryError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {gardenSummaryError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plannerGardenSummaries.map((gardenSummary) => (
                  <div
                    key={gardenSummary.id}
                    className="rounded-2xl border border-green-100 bg-white/90 p-5 shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-gray-900 break-words">{gardenSummary.name}</h2>
                      <span className="flex-shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        {gardenSummary.status || 'Planning'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <div className="flex justify-between gap-3">
                        <span>Size</span>
                        <span className="font-medium text-gray-900">
                          {gardenSummary.dimensions?.width || gardenSummary.width}m x {gardenSummary.dimensions?.height || gardenSummary.height}m
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Plants</span>
                        <span className="font-medium text-gray-900">
                          {gardenSummary.plantCount || gardenSummary.plant_count || 0}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/garden?id=${gardenSummary.id}`}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      Plan
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowCreateGardenForm(true)}
                className="mx-auto flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-800 shadow-sm transition-colors hover:bg-green-50"
              >
                <Plus className="w-4 h-4" />
                Create Another Garden
              </button>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-lg text-center">
              <div className="bg-white/90 border border-green-100 rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-7 h-7 text-green-700" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">No gardens yet</h1>
                <p className="text-gray-600 mb-6">
                  Create your first garden space, then you can open the planner and start adding plants.
                </p>
                {gardenSummaryError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {gardenSummaryError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateGardenForm(true)}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Garden
                </button>
              </div>
            </div>
          )}
        </div>

        <GardenForm
          garden={null}
          onSave={handleCreateGardenFromPlanner}
          onClose={() => setShowCreateGardenForm(false)}
          isOpen={showCreateGardenForm}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
          className="relative flex-shrink-0 z-10"
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
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 relative">
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
            saveLabel={isSavingLayout ? 'Saving...' : 'Save Changes'}
          />

          {(layoutSaveMessage || layoutSaveError) && (
            <div role={layoutSaveError ? 'alert' : 'status'} aria-live="polite" className="px-3 sm:px-4 py-2 bg-white border-b border-gray-100">
              <div className={`text-sm font-medium ${layoutSaveError ? 'text-red-700' : 'text-green-700'}`}>
                {layoutSaveError || layoutSaveMessage}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 relative overflow-hidden">
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
          </div>
        </div>

        {/* DragOverlay with enhanced visibility */}
        {!isTouchPlanner && (
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
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
              className="relative flex flex-col items-center justify-center overflow-visible border-4 border-green-500 rounded-xl bg-white shadow-2xl transform scale-125"
            >
              {/* Glow effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-blue-400/30 rounded-xl blur-lg -z-10"></div>
              
              {/* Pulsing ring effect */}
              <div className="absolute -inset-4 border-2 border-dashed border-green-400 rounded-xl opacity-60 animate-ping"></div>
              
              {/* Plant emoji - large and prominent */}
              <div className={`${isCompactDragOverlay ? 'text-2xl' : 'text-5xl mb-2'} filter drop-shadow-2xl animate-bounce`}>
                {activePlant.emoji}
              </div>
              
              {/* Plant name with high contrast */}
              <div className={`text-center font-bold text-gray-900 bg-white rounded-full border-2 border-green-500 shadow-lg ${
                isCompactDragOverlay
                  ? 'absolute -bottom-6 max-w-28 truncate px-2 py-0.5 text-[10px]'
                  : 'px-3 py-1 text-sm'
              }`}>
                {activePlant.name}
              </div>
              
              {/* Size indicator */}
              {!isCompactDragOverlay && (
                <div className="text-xs text-gray-700 mt-2 font-medium bg-green-100 px-2 py-1 rounded border border-green-300">
                  {activePlantFootprint}x{activePlantFootprint} units
                </div>
              )}
              
              {/* Drop zone indicator */}
              <div className={`absolute text-green-600 font-medium bg-green-50 px-2 py-1 rounded border border-green-200 ${
                isCompactDragOverlay ? '-bottom-12 text-[10px]' : '-bottom-6 text-xs'
              }`}>
                Drop on canvas
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
