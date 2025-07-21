'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import PlantLibrary from '@/components/Garden/PlantLibrary';
import GardenCanvas from '@/components/Garden/GardenCanvas';
import ControlPanel from '@/components/Garden/ControlPanel';
import DraggablePlant from '@/components/Garden/DraggablePlant';
import SaveGardenModel from '@/components/Garden/SaveGardenModel';
import LoadGardenModel from '@/components/Garden/LoadGardenModel';
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';
import { snapToGrid, checkPlantOverlap, isWithinBounds } from '@/components/Garden/Utils/GardenUtils';
import gardenDataService from '@/lib/gardenDataService';

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
  
  // Track drag overlay position
  const [dragOverlayPosition, setDragOverlayPosition] = useState({ x: 0, y: 0 });
  const dragOverlayRef = useRef(null);
  
  // Garden state management
  const [currentGarden, setCurrentGarden] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const sensors = useSensors(
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

  // Load garden data using gardenDataService
  useEffect(() => {
    const loadGarden = async () => {
      if (!gardenId) return;
      
      setLoading(true);
      try {
        const garden = await gardenDataService.getGardenById(parseInt(gardenId));
        
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

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || over.id !== 'garden-canvas') return;

    const draggedData = active.data.current;
    
    if (draggedData?.isFromLibrary) {
      // Adding new plant from library
      const canvasElement = document.querySelector('[data-canvas="true"]');
      if (!canvasElement) return;

      const canvasRect = canvasElement.getBoundingClientRect();
      const scrollContainer = canvasElement.closest('.overflow-auto');
      const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      const overlayX = dragOverlayPosition.x;
      const overlayY = dragOverlayPosition.y;
      
      const canvasX = (overlayX - canvasRect.left) + scrollLeft;
      const canvasY = (overlayY - canvasRect.top) + scrollTop;
      
      const plantSize = (draggedData.size || 1) * gridSize;
      const plantX = canvasX - (plantSize / 2);
      const plantY = canvasY - (plantSize / 2);
      
      let finalX, finalY;
      if (showGrid) {
        finalX = snapToGrid(Math.max(0, plantX), gridSize);
        finalY = snapToGrid(Math.max(0, plantY), gridSize);
      } else {
        finalX = Math.max(0, plantX);
        finalY = Math.max(0, plantY);
      }

      const newPlant = {
        ...draggedData,
        id: `plant-${Date.now()}`,
        plantId: draggedData.id,
        x: finalX,
        y: finalY,
        isFromLibrary: false,
        plantedDate: new Date()
      };

      if (isWithinBoundsFlexible(newPlant, dimensions, gridSize, showGrid) && 
          !checkPlantOverlapFlexible(newPlant, placedPlants, gridSize, showGrid)) {
        setPlacedPlants(prev => [...prev, newPlant]);
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      } else {
        if (!isWithinBoundsFlexible(newPlant, dimensions, gridSize, showGrid)) {
          alert('Cannot place plant outside garden boundaries.');
        } else {
          alert('Cannot place plant here - it overlaps with another plant.');
        }
      }
      
    } else if (!draggedData?.isFromLibrary) {
      // Moving existing plant
      setPlacedPlants(prev => prev.map(plant => {
        if (plant.id === active.id) {
          let newX, newY;
          
          if (showGrid) {
            newX = snapToGrid(Math.max(0, (plant.x || 0) + event.delta.x), gridSize);
            newY = snapToGrid(Math.max(0, (plant.y || 0) + event.delta.y), gridSize);
          } else {
            newX = Math.max(0, (plant.x || 0) + event.delta.x);
            newY = Math.max(0, (plant.y || 0) + event.delta.y);
          }
          
          const updatedPlant = { ...plant, x: newX, y: newY };
          
          const otherPlants = prev.filter(p => p.id !== plant.id);
          if (isWithinBoundsFlexible(updatedPlant, dimensions, gridSize, showGrid) && 
              !checkPlantOverlapFlexible(updatedPlant, otherPlants, gridSize, showGrid)) {
            return updatedPlant;
          }
        }
        return plant;
      }));
    }
    
    setDragOverlayPosition({ x: 0, y: 0 });
  };

  // Save garden using gardenDataService
  const handleSaveGarden = async (gardenName) => {
    try {
      // Convert planner format to storage format
      const plantedItems = placedPlants.map(plant => ({
        id: plant.id,
        plantId: plant.plantId || plant.id.replace('plant-', ''),
        name: plant.name,
        emoji: plant.emoji,
        size: plant.size,
        category: plant.category,
        // Convert pixel positions to grid positions
        xPosition: pixelsToGrid(plant.x),
        yPosition: pixelsToGrid(plant.y),
        plantedDate: plant.plantedDate || new Date(),
        notes: plant.notes || ''
      }));

      const gardenData = {
        name: gardenName,
        soilType: currentGarden?.soilType || 'Loamy',
        dimensions: {
          width: dimensions.width,
          height: dimensions.height
        },
        location: currentGarden?.location || 'Garden',
        status: currentGarden?.status || 'Active',
        plantedItems: plantedItems
      };

      let savedGarden;
      if (currentGarden?.id) {
        // Update existing garden
        savedGarden = await gardenDataService.saveGarden({
          ...gardenData,
          id: currentGarden.id,
          createdAt: currentGarden.createdAt
        }, true);
      } else {
        // Create new garden
        savedGarden = await gardenDataService.saveGarden(gardenData, false);
      }
      
      setCurrentGarden(savedGarden);
      setHasUnsavedChanges(false);
      
      return savedGarden;
    } catch (error) {
      console.error('Failed to save garden:', error);
      throw error;
    }
  };

  // Load garden using gardenDataService
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

  // Track drag overlay position
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (activeId && dragOverlayRef.current) {
        const overlayRect = dragOverlayRef.current.getBoundingClientRect();
        setDragOverlayPosition({
          x: overlayRect.left + overlayRect.width / 2,
          y: overlayRect.top + overlayRect.height / 2
        });
      }
    };

    if (activeId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
    };
  }, [activeId]);

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

  const activePlant = activeId ? 
    placedPlants.find(p => p.id === activeId) || 
    PLANT_LIBRARY.find(p => `library-${p.id}` === activeId) : null;

  // Custom DragOverlay with ref for position tracking
  const CustomDragOverlay = ({ activePlant, gridSize }) => {
    if (!activePlant) return null;
    
    const plantSize = (activePlant.size || 1) * gridSize;
    
    return (
      <div
        ref={dragOverlayRef}
        style={{
          width: plantSize,
          height: plantSize,
        }}
        className="flex flex-col items-center justify-center border-2 border-green-400 rounded-lg bg-white/90 shadow-lg"
      >
        <div className="text-2xl mb-1">{activePlant.emoji}</div>
        <div className="text-xs text-center font-medium text-gray-700 px-1">
          {activePlant.name}
        </div>
      </div>
    );
  };

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
    <div className="flex h-screen bg-gray-50 overflow-auto shadow-lg">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Plant Library Sidebar */}
        <div data-sidebar className="relative">
          <PlantLibrary
            plants={PLANT_LIBRARY}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            placedPlants={placedPlants}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen min-w-0 relative">
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
            gardenName={currentGarden?.name}
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

        {/* DragOverlay */}
        <DragOverlay>
          <CustomDragOverlay
            activePlant={activePlant}
            gridSize={gridSize}
          />
        </DragOverlay>
      </DndContext>

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

      <LoadGardenModel
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoad={handleLoadGarden}
      />
    </div>
  );
}