'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  MouseSensor,
  TouchSensor
} from '@dnd-kit/core';
import PlantLibrary from '@/components/Garden/PlantLibrary';
import GardenCanvas from '@/components/Garden/GardenCanvas';
import ControlPanel from '@/components/Garden/ControlPanel';
import DraggablePlant from '@/components/Garden/DraggablePlant';
import SaveGardenModel from '@/components/Garden/SaveGardenModel';
import LoadGardenModel from '@/components/Garden/LoadGardenModel';
import PlantEditModal from '@/components/Garden/PlantEditModal';
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';
import { snapToGrid, checkPlantOverlap, isWithinBounds } from '@/components/Garden/Utils/GardenUtils';
import apiClient from '@/lib/api';

export default function GardenPlannerPage() {
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
  
  // Garden state management
  const [currentGarden, setCurrentGarden] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // State to store plant library data
  const [libraryPlants, setLibraryPlants] = useState([]);

  // 🔄 AUTO-REFRESH: Store refresh function
  const [refreshPlantsFunction, setRefreshPlantsFunction] = useState(null);

  // Plant Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);

  // Enhanced sensor configuration to prevent sidebar dragging
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Require 250ms hold before starting drag on touch
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

  // 🔄 AUTO-REFRESH: Enhanced callback to receive plants AND refresh function
  const handlePlantsLoaded = (plants, refreshFunction) => {
    console.log('📚 Plants loaded in main component:', plants);
    setLibraryPlants(plants);
    
    // Store the refresh function for later use
    if (refreshFunction) {
      setRefreshPlantsFunction(() => refreshFunction);
      console.log('🔄 Refresh function stored successfully');
    }
  };

  // Handle edit plant requests from PlantLibrary
  const handleEditPlant = (plant) => {
    console.log('🖊️ Edit plant requested in main page:', plant.name || 'New Plant');
    setEditingPlant(plant);
    setShowEditModal(true);
  };

  // 🔄 AUTO-REFRESH: Enhanced save plant function
  const handleSavePlant = async (updatedPlant) => {
    try {
      console.log('💾 Saving plant in main page:', updatedPlant);
      
      // FIXED: Transform data for API with correct enum values
      const plantData = {
        name: updatedPlant.name,
        emoji: updatedPlant.emoji,
        size: updatedPlant.size,
        category: updatedPlant.category,
        description: updatedPlant.description,
        spacing: updatedPlant.spacing,
        
        // FIXED: Map frontend values to database enum values
        sunlight: updatedPlant.sunlight, // Should be "Full Sun", "Partial Sun", or "Shade"
        water_needs: updatedPlant.waterNeeds, // Should be "Low", "Moderate", or "High"
        difficulty: updatedPlant.difficulty, // Should be "Easy", "Medium", or "Hard"
        
        days_to_maturity: updatedPlant.daysToMaturity ? parseInt(updatedPlant.daysToMaturity) : null,
        companion_plants: JSON.stringify(updatedPlant.companionPlants || []),
        avoid_plants: JSON.stringify(updatedPlant.avoidPlants || []),
        soil_types: JSON.stringify(updatedPlant.soilTypes || []),
        planting_depth: updatedPlant.plantingDepth
      };

      console.log('📋 Transformed plant data for API:', plantData);

      if (updatedPlant.id) {
        // Update existing plant
        console.log('📝 Updating existing plant:', updatedPlant.id);
        await apiClient.updatePlant(updatedPlant.id, plantData);
      } else {
        // Add new plant - generate ID from name
        const newId = updatedPlant.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        plantData.id = newId;
        console.log('🆕 Adding new plant to library with ID:', newId);
        await apiClient.addPlantToLibrary(plantData);
      }

      console.log('✅ Plant saved successfully');
      
      // 🔄 AUTO-REFRESH: Call the refresh function to reload plant library
      if (refreshPlantsFunction) {
        console.log('🔄 Auto-refreshing plant library...');
        try {
          await refreshPlantsFunction();
          console.log('✅ Plant library refreshed successfully');
        } catch (refreshError) {
          console.error('❌ Failed to refresh plant library:', refreshError);
        }
      } else {
        console.warn('⚠️ No refresh function available');
      }
      
    } catch (error) {
      console.error('❌ Failed to save plant:', error);
      throw error;
    }
  };

  // 🔄 AUTO-REFRESH: Enhanced delete plant function
  const handleDeletePlant = async (plant) => {
    try {
      console.log('🗑️ Deleting plant:', plant.name);
      await apiClient.deletePlantFromLibrary(plant.id);
      console.log('✅ Plant deleted successfully');
      
      // 🔄 AUTO-REFRESH: Call the refresh function to reload plant library
      if (refreshPlantsFunction) {
        console.log('🔄 Auto-refreshing plant library after delete...');
        try {
          await refreshPlantsFunction();
          console.log('✅ Plant library refreshed successfully after delete');
        } catch (refreshError) {
          console.error('❌ Failed to refresh plant library after delete:', refreshError);
        }
      } else {
        console.warn('⚠️ No refresh function available for delete');
      }
      
    } catch (error) {
      console.error('❌ Failed to delete plant:', error);
      throw error;
    }
  };

  // Get active plant for drag overlay with proper plant resolution
  const activePlant = useMemo(() => {
    if (!activeId) return null;
    
    console.log('🔍 Looking for active plant with ID:', activeId);
    
    // First check if it's a placed plant
    const placedPlant = placedPlants.find(p => p.id === activeId);
    if (placedPlant) {
      console.log('✅ Found placed plant:', placedPlant);
      return placedPlant;
    }
    
    // Then check if it's from the library
    if (activeId.startsWith('library-')) {
      const libraryId = activeId.replace('library-', '');
      console.log('🔍 Looking for library plant with ID:', libraryId);
      
      // Check in the loaded library plants
      const libraryPlant = libraryPlants.find(p => p.id === libraryId);
      if (libraryPlant) {
        console.log('✅ Found library plant:', libraryPlant);
        return libraryPlant;
      }
      
      // Fallback to PLANT_LIBRARY constant
      const fallbackPlant = PLANT_LIBRARY?.find(p => p.id === libraryId);
      if (fallbackPlant) {
        console.log('✅ Found fallback plant:', fallbackPlant);
        return fallbackPlant;
      }
    }
    
    console.log('❌ No plant found for activeId:', activeId);
    return null;
  }, [activeId, placedPlants, libraryPlants]);

  // Load garden data using apiClient
  useEffect(() => {
    const loadGarden = async () => {
      if (!gardenId) return;
      
      setLoading(true);
      try {
        const garden = await apiClient.getGarden(gardenId);
        
        if (!garden) {
          alert('Garden not found');
          router.push('/gardens');
          return;
        }
        
        // Set garden data
        setCurrentGarden(garden);
        setDimensions({
          width: garden.dimensions?.width ?? 20,
          height: garden.dimensions?.height ?? 12
        });
        
        // Convert planted items from storage format to planner format
        if (garden.plantedItems && garden.plantedItems.length > 0) {
          const convertedPlants = garden.plantedItems.map(item => ({
            id: `plant-${item.id ?? crypto.randomUUID()}`,
            plantId: item.plantId,
            name: item.name,
            emoji: item.emoji,
            size: item.size,
            category: item.category,
            // Convert grid positions to pixel positions
            x: gridToPixels(item.xPosition || 0),
            y: gridToPixels(item.yPosition || 0),
            plantedDate: item.plantedDate ? new Date(item.plantedDate) : null,
            notes: item.notes || '',
            isFromLibrary: false
          }));
          setPlacedPlants(convertedPlants);
        }
        
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to load garden:', error);
        alert('Failed to load garden. Please try again.');
        router.push('/gardens');
      } finally {
        setLoading(false);
      }
    };

    loadGarden();
  }, [gardenId, router]);

  // Track changes for unsaved indicator
  useEffect(() => {
    if (currentGarden) {
      setHasUnsavedChanges(true);
    }
  }, [dimensions, gridSize, placedPlants]);

  // Enhanced bounds checking
  const isWithinBoundsFlexible = (plant, dimensions, gridSize, useGrid = true) => {
    const plantSize = (plant.size || 1) * gridSize;
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
      const newSize = (newPlant.size || 1) * gridSize;
      
      return existingPlants.some(existing => {
        const existingSize = (existing.size || 1) * gridSize;
        
        return !(newPlant.x >= existing.x + existingSize ||
                 existing.x >= newPlant.x + newSize ||
                 newPlant.y >= existing.y + existingSize ||
                 existing.y >= newPlant.y + newSize);
      });
    }
  };

  // Enhanced handleDragStart with debug logging
  const handleDragStart = (event) => {
    const { active } = event;
    const draggedData = active.data.current;
    
    console.log('🚀 Drag Start:', {
      activeId: active.id,
      isFromLibrary: draggedData?.isFromLibrary,
      draggedData: draggedData,
      libraryPlantsCount: libraryPlants.length,
      placedPlantsCount: placedPlants.length
    });

    // Only set active ID if it's a valid draggable item
    if (draggedData && (draggedData.isFromLibrary !== undefined)) {
      setActiveId(active.id);
    } else {
      console.warn('⚠️ Invalid drag data, canceling drag');
      return;
    }
  };

  // Enhanced handleDragEnd with better scroll container handling
  const handleDragEnd = (event) => {
    const { active, over, delta, activatorEvent } = event;
    
    console.log('🏁 Drag End:', {
      activeId: active.id,
      overId: over?.id,
      delta: delta,
      hasActivatorEvent: !!activatorEvent
    });

    setActiveId(null);

    // Must drop over the garden canvas
    if (!over || over.id !== 'garden-canvas') {
      console.log('❌ Not dropped over canvas, over =', over?.id);
      return;
    }

    const draggedData = active.data.current;
    
    if (draggedData?.isFromLibrary) {
      // Adding new plant from library
      console.log('🌱 Adding new plant from library');
      
      const canvasElement = document.querySelector('[data-canvas="true"]');
      if (!canvasElement) {
        console.error('❌ Canvas element not found');
        return;
      }

      // Enhanced: Better scroll container detection and handling
      const canvasRect = canvasElement.getBoundingClientRect();
      
      // Find all possible scroll containers
      const mainScrollContainer = canvasElement.closest('.overflow-auto');
      const sidebarScrollContainer = document.querySelector('[data-sidebar] .overflow-y-auto');
      
      // Get scroll offsets from both containers
      const mainScrollLeft = mainScrollContainer ? mainScrollContainer.scrollLeft : 0;
      const mainScrollTop = mainScrollContainer ? mainScrollContainer.scrollTop : 0;
      const sidebarScrollTop = sidebarScrollContainer ? sidebarScrollContainer.scrollTop : 0;

      console.log('📏 Enhanced Canvas Info:', {
        canvasRect: {
          left: canvasRect.left,
          top: canvasRect.top,
          width: canvasRect.width,
          height: canvasRect.height
        },
        scroll: { 
          mainLeft: mainScrollLeft, 
          mainTop: mainScrollTop,
          sidebarTop: sidebarScrollTop
        },
        delta: delta
      });

      // Enhanced: Better drop position calculation considering all scroll offsets
      let dropX, dropY;

      if (activatorEvent) {
        // Get the original start position
        const startX = activatorEvent.clientX || activatorEvent.touches?.[0]?.clientX;
        const startY = activatorEvent.clientY || activatorEvent.touches?.[0]?.clientY;
        
        if (startX && startY && delta) {
          // Calculate final position considering scroll offsets
          dropX = startX + delta.x;
          dropY = startY + delta.y;
          
          console.log('✅ Using activator + delta method with scroll compensation');
          console.log('📍 Calculated drop position:', { dropX, dropY });
        }
      }

      // Fallback methods if primary calculation fails
      if (!dropX || !dropY || dropX < 0 || dropY < 0) {
        // Method 2: Use canvas center as fallback
        dropX = canvasRect.left + canvasRect.width / 2;
        dropY = canvasRect.top + canvasRect.height / 2;
        console.log('⚠️ Using canvas center fallback:', { dropX, dropY });
      }

      // Convert screen coordinates to canvas coordinates
      const canvasX = (dropX - canvasRect.left) + mainScrollLeft;
      const canvasY = (dropY - canvasRect.top) + mainScrollTop;

      console.log('🎯 Final canvas coordinates:', { canvasX, canvasY });

      // Validate drop is within canvas bounds
      if (canvasX < 0 || canvasY < 0 || canvasX > canvasRect.width || canvasY > canvasRect.height) {
        console.log('❌ Drop outside canvas bounds, using center');
        // Force to canvas center if outside bounds
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;
        
        const plantSize = (draggedData.size || 1) * gridSize;
        let plantX = centerX - (plantSize / 2);
        let plantY = centerY - (plantSize / 2);

        // Apply grid snapping if enabled
        if (showGrid) {
          plantX = snapToGrid(Math.max(0, plantX), gridSize);
          plantY = snapToGrid(Math.max(0, plantY), gridSize);
        } else {
          plantX = Math.max(0, plantX);
          plantY = Math.max(0, plantY);
        }

        // Create new plant object
        const newPlant = {
          ...draggedData,
          id: `plant-${Date.now()}`,
          plantId: draggedData.id,
          x: plantX,
          y: plantY,
          isFromLibrary: false,
          plantedDate: new Date()
        };

        setPlacedPlants(prev => [...prev, newPlant]);
        console.log('🎉 Plant placed at canvas center!');
        
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
        return;
      }

      // Normal placement logic continues...
      const plantSize = (draggedData.size || 1) * gridSize;
      let plantX = canvasX - (plantSize / 2);
      let plantY = canvasY - (plantSize / 2);

      console.log('📍 Plant Position Calculation:', {
        canvasCoords: { x: canvasX, y: canvasY },
        plantSize: plantSize,
        rawPlantPos: { x: plantX, y: plantY }
      });

      // Apply grid snapping if enabled
      if (showGrid) {
        plantX = snapToGrid(Math.max(0, plantX), gridSize);
        plantY = snapToGrid(Math.max(0, plantY), gridSize);
        console.log('📐 After grid snapping:', { x: plantX, y: plantY });
      } else {
        plantX = Math.max(0, plantX);
        plantY = Math.max(0, plantY);
        console.log('🔄 No grid snapping, clamped to bounds:', { x: plantX, y: plantY });
      }

      // Ensure plant stays within garden boundaries
      const maxX = (dimensions.width * gridSize) - plantSize;
      const maxY = (dimensions.height * gridSize) - plantSize;
      plantX = Math.min(plantX, Math.max(0, maxX));
      plantY = Math.min(plantY, Math.max(0, maxY));

      console.log('🏡 Final Position:', {
        final: { x: plantX, y: plantY },
        grid: { 
          x: Math.round(plantX / gridSize), 
          y: Math.round(plantY / gridSize) 
        },
        bounds: { maxX, maxY },
        dimensions: dimensions
      });

      // Create new plant object
      const newPlant = {
        ...draggedData,
        id: `plant-${Date.now()}`,
        plantId: draggedData.id,
        x: plantX,
        y: plantY,
        isFromLibrary: false,
        plantedDate: new Date()
      };

      // Validate placement (bounds and overlap)
      const withinBounds = isWithinBoundsFlexible(newPlant, dimensions, gridSize, showGrid);
      const hasOverlap = checkPlantOverlapFlexible(newPlant, placedPlants, gridSize, showGrid);

      console.log('🔍 Placement Validation:', {
        withinBounds: withinBounds,
        hasOverlap: hasOverlap,
        plantCount: placedPlants.length
      });

      if (withinBounds && !hasOverlap) {
        setPlacedPlants(prev => [...prev, newPlant]);
        console.log('🎉 Plant placed successfully!');
        
        // Auto-close sidebar on mobile after successful placement
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      } else {
        console.log('❌ Placement validation failed');
        if (!withinBounds) {
          alert('Cannot place plant outside garden boundaries.');
        } else {
          alert('Cannot place plant here - it overlaps with another plant.');
        }
      }
      
    } else if (!draggedData?.isFromLibrary) {
      // Moving existing plant
      console.log('🔄 Moving existing plant');
      
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
            console.log('✅ Plant moved to:', { x: newX, y: newY });
            return updatedPlant;
          } else {
            console.log('❌ Invalid move position, keeping original');
            return plant;
          }
        }
        return plant;
      }));
    }
  };

  // Save garden using apiClient
  const handleSaveGarden = async (gardenName) => {
    try {
      console.log('🎯 Starting garden save process...');
      
      // Convert planner format to API format
      const plantedItems = placedPlants.map(plant => ({
        plant_id: plant.plantId || plant.id?.replace('plant-', '') || 'unknown',
        plant_name: plant.name,
        plant_emoji: plant.emoji,
        plant_size: plant.size || 1,
        plant_category: plant.category || 'other',
        x_position: Math.floor((plant.x || 0) / gridSize),
        y_position: Math.floor((plant.y || 0) / gridSize),
        planted_date: plant.plantedDate ? 
          (plant.plantedDate instanceof Date ? 
            plant.plantedDate.toISOString().split('T')[0] : 
            plant.plantedDate) : 
          new Date().toISOString().split('T')[0],
        notes: plant.notes || ''
      }));

      console.log('📊 Processed planted items:', plantedItems);

      const gardenData = {
        name: gardenName,
        description: currentGarden?.description || '',
        width: dimensions.width,
        height: dimensions.height,
        soilType: currentGarden?.soilType || 'Loamy',
        location: currentGarden?.location || 'Garden',
        status: currentGarden?.status || 'Active'
      };

      // Add ID if updating existing garden
      if (currentGarden?.id) {
        gardenData.id = currentGarden.id;
      }

      console.log('🏡 Garden data to save:', gardenData);

      // Use the enhanced save method
      const savedGarden = await apiClient.saveCompleteGarden(gardenData, plantedItems);
      
      // Update current garden state
      setCurrentGarden({
        ...savedGarden,
        dimensions: {
          width: savedGarden.width,
          height: savedGarden.height
        },
        soilType: savedGarden.soil_type || savedGarden.soilType,
        plantedItems: placedPlants // Keep the planner format for the UI
      });
      
      setHasUnsavedChanges(false);
      
      console.log('✅ Garden save completed successfully');
      return savedGarden;
      
    } catch (error) {
      console.error('❌ Garden save failed:', error);
      throw error;
    }
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
      console.warn('Garden name is an object:', garden.name);
      return garden.name.name || garden.name.value || `Garden ${garden.id || 'Untitled'}`;
    } else {
      return String(garden.name || 'Garden');
    }
  };

  const safeGardenName = getSafeGardenName(currentGarden);

  // Load garden using apiClient
  const handleLoadGarden = async (gardenData) => {
    if (!gardenData) {
      alert("Garden not found");
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
      category: item.category,
      x: gridToPixels(item.xPosition || 0),
      y: gridToPixels(item.yPosition || 0),
      plantedDate: item.plantedDate ? new Date(item.plantedDate) : null,
      notes: item.notes,
      isFromLibrary: false
    }));
    
    setPlacedPlants(convertedPlants);
    setHasUnsavedChanges(false);
  };

  const handleNavigateToGardens = (savedGarden) => {
    router.push(`/gardens?saved=true&gardenId=${savedGarden.id}`);
  };

  const handleBackToGarden = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push('/gardens');
      }
    } else {
      router.push('/gardens');
    }
  };

  const handlePlantRemove = (plantId) => {
    setPlacedPlants(prev => prev.filter(p => p.id !== plantId));
  };

  // Dimension change validation
  const validateDimensionChange = (newDimensions) => {
    // Calculate minimum required dimensions
    let maxX = 0, maxY = 0;
    
    placedPlants.forEach(plant => {
      const plantSize = plant.size || 1;
      const plantGridX = pixelsToGrid(plant.x);
      const plantGridY = pixelsToGrid(plant.y);
      maxX = Math.max(maxX, plantGridX + plantSize);
      maxY = Math.max(maxY, plantGridY + plantSize);
    });
    
    if (newDimensions.width < maxX || newDimensions.height < maxY) {
      alert(`Cannot resize garden smaller than ${maxX}×${maxY} due to existing plants.`);
      return false;
    }
    
    return true;
  };

  const handleDimensionChange = (newDimensions) => {
    if (validateDimensionChange(newDimensions)) {
      setDimensions(newDimensions);
    }
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen min-w-0 relative z-20">
          <ControlPanel
            dimensions={dimensions}
            gridSize={gridSize}
            showGrid={showGrid}
            showRuler={showRuler}
            onDimensionChange={handleDimensionChange}
            onGridSizeChange={setGridSize}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleRuler={() => setShowRuler(!showRuler)}
            onSave={() => setShowSaveModal(true)}
            hasUnsavedChanges={hasUnsavedChanges}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            gardenName={safeGardenName}
            onBackClick={handleBackToGarden}
          />

          <div className="flex-1 relative overflow-hidden">
            <GardenCanvas
              dimensions={dimensions}
              gridSize={gridSize}
              showGrid={showGrid}
              showRuler={showRuler}
              placedPlants={placedPlants}
              onPlantRemove={handlePlantRemove}
            />
          </div>
        </div>

        {/* Enhanced DragOverlay with better visibility and debugging */}
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
                width: (activePlant.size || 1) * gridSize,
                height: (activePlant.size || 1) * gridSize,
                pointerEvents: 'none',
              }}
              className="relative flex flex-col items-center justify-center border-4 border-green-500 rounded-xl bg-white shadow-2xl transform scale-125"
            >
              {/* Glow effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-blue-400/30 rounded-xl blur-lg -z-10"></div>
              
              {/* Pulsing ring effect */}
              <div className="absolute -inset-4 border-2 border-dashed border-green-400 rounded-xl opacity-60 animate-ping"></div>
              
              {/* Plant emoji - large and prominent */}
              <div className="text-5xl mb-2 filter drop-shadow-2xl animate-bounce">
                {activePlant.emoji}
              </div>
              
              {/* Plant name with high contrast */}
              <div className="text-sm text-center font-bold text-gray-900 px-3 py-1 bg-white rounded-full border-2 border-green-500 shadow-lg">
                {activePlant.name}
              </div>
              
              {/* Size indicator */}
              <div className="text-xs text-gray-700 mt-2 font-medium bg-green-100 px-2 py-1 rounded border border-green-300">
                {activePlant.size}×{activePlant.size} units
              </div>
              
              {/* Drop zone indicator */}
              <div className="absolute -bottom-6 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                Drop on canvas
              </div>
            </div>
          ) : (
            // Debug: Show when no plant is found
            activeId && (
              <div className="bg-red-100 border-2 border-red-500 rounded p-2 text-red-800 text-xs">
                Debug: No plant found for ID: {activeId}
              </div>
            )
          )}
        </DragOverlay>
        
      </DndContext>

      {/* Plant Edit Modal - RENDERED AT ROOT LEVEL */}
      <PlantEditModal
        isOpen={showEditModal}
        onClose={() => {
          console.log('🚪 Closing plant edit modal');
          setShowEditModal(false);
          setEditingPlant(null);
        }}
        plant={editingPlant}
        onSave={handleSavePlant}
        onDelete={editingPlant?.id ? handleDeletePlant : null}
        isPlaced={false}
      />

      {/* Save Garden Modal */}
      <SaveGardenModel
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveGarden}
        onNavigateToGardens={handleNavigateToGardens}
        currentGarden={{
          ...currentGarden,
          width: dimensions.width,
          height: dimensions.height,
          gridSize: gridSize,
          plantedItems: placedPlants
        }}
      />

      {/* Load Garden Modal */}
      <LoadGardenModel
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoadGarden}
      />
    </div>
  );
}