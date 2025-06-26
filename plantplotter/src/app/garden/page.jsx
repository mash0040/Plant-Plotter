'use client';
import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import PlantLibrary from '@/components/Garden/PlantLibrary';
import GardenCanvas from '@/components/Garden/GardenCanvas';
import ControlPanel from '@/components/Garden/ControlPanel';
import DraggablePlant from '@/components/Garden/DraggablePlant';
import SaveGardenModel from '@/components/Garden/SaveGardenModel';
import LoadGardenModel from '@/components/Garden/LoadGardenModel';
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';
import { snapToGrid, checkPlantOverlap, isWithinBounds } from '@/components/Garden/Utils/GardenUtils';
import { GardenService } from '@/components/Garden/Services/GardenService';

export default function GardenPlannerPage() {
  const [dimensions, setDimensions] = useState({ width: 20, height: 12 });
  const [gridSize, setGridSize] = useState(50);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [placedPlants, setPlacedPlants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Garden state management
  const [currentGarden, setCurrentGarden] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Mock user ID - replace with actual auth
  const userId = 'user-123';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Track changes for unsaved indicator
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [dimensions, gridSize, placedPlants]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over, delta } = event;
    setActiveId(null);

    if (!over || over.id !== 'garden-canvas') return;

    const draggedData = active.data.current;

    // Get the canvas element to calculate proper coordinates
    const canvasElement = document.querySelector('[data-canvas="true"]');
    if (!canvasElement) return;

    const canvasRect = canvasElement.getBoundingClientRect();
    
    if (draggedData?.isFromLibrary) {
      // For new plants from library - get the current mouse/touch position
      const currentEvent = event.activatorEvent;
      let currentX, currentY;

      // Handle both mouse and touch events
      if (currentEvent.type === 'mousedown') {
        // For mouse events, we need to get the final position from the drag end
        // Use the activator position plus the delta to get the final position
        currentX = currentEvent.clientX + delta.x;
        currentY = currentEvent.clientY + delta.y;
      } else if (currentEvent.type === 'touchstart') {
        // For touch events, similar approach
        currentX = currentEvent.touches[0].clientX + delta.x;
        currentY = currentEvent.touches[0].clientY + delta.y;
      } else {
        // Fallback - use the activator position
        currentX = currentEvent.clientX + delta.x;
        currentY = currentEvent.clientY + delta.y;
      }
      
      // Get scroll offsets from the scroll container
      const scrollContainer = canvasElement.closest('.overflow-auto');
      const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      // Calculate position relative to canvas accounting for scroll
      const relativeX = (currentX - canvasRect.left) + scrollLeft;
      const relativeY = (currentY - canvasRect.top) + scrollTop;
      
      // Adjust for plant size to center the plant on the mouse cursor
      const plantSize = (draggedData.size || 1) * gridSize;
      const adjustedX = relativeX - (plantSize / 2);
      const adjustedY = relativeY - (plantSize / 2);
      
      // Snap to grid and ensure it's not negative
      const x = snapToGrid(Math.max(0, adjustedX), gridSize);
      const y = snapToGrid(Math.max(0, adjustedY), gridSize);

      const newPlant = {
        ...draggedData,
        id: `plant-${Date.now()}`,
        plantId: draggedData.id,
        x: x,
        y: y,
        isFromLibrary: false,
        plantedDate: new Date()
      };

      // Check bounds and overlaps
      if (isWithinBounds(newPlant, dimensions, gridSize) && 
          !checkPlantOverlap(newPlant, placedPlants, gridSize)) {
        setPlacedPlants(prev => [...prev, newPlant]);
        // Close sidebar on mobile after placing
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      }
    } else if (!draggedData?.isFromLibrary) {
      // For existing plants being moved
      setPlacedPlants(prev => prev.map(plant => {
        if (plant.id === active.id) {
          const newX = snapToGrid(Math.max(0, (plant.x || 0) + delta.x), gridSize);
          const newY = snapToGrid(Math.max(0, (plant.y || 0) + delta.y), gridSize);
          
          const updatedPlant = { ...plant, x: newX, y: newY };
          
          // Check if new position is valid
          const otherPlants = prev.filter(p => p.id !== plant.id);
          if (isWithinBounds(updatedPlant, dimensions, gridSize) && 
              !checkPlantOverlap(updatedPlant, otherPlants, gridSize)) {
            return updatedPlant;
          }
        }
        return plant;
      }));
    }
  };

  const handlePlantRemove = (plantId) => {
    setPlacedPlants(prev => prev.filter(p => p.id !== plantId));
  };

  const handleSaveGarden = async (gardenName) => {
    const gardenData = {
      id: currentGarden?.id,
      name: gardenName,
      width: dimensions.width,
      height: dimensions.height,
      gridSize: gridSize,
      plantedItems: placedPlants
    };

    try {
      const savedGarden = await GardenService.saveGarden(gardenData);
      setCurrentGarden(savedGarden);
      setHasUnsavedChanges(false);
      alert('Garden saved successfully!');
    } catch (error) {
      alert('Failed to save garden. Please try again.');
    }
  };

  const handleLoadGarden = (gardenData) => {
    setCurrentGarden(gardenData);
    setDimensions({ width: gardenData.width, height: gardenData.height });
    setGridSize(gardenData.gridSize);
    setPlacedPlants(gardenData.placedPlants || []);
    setHasUnsavedChanges(false);
  };

  const activePlant = activeId ? 
    placedPlants.find(p => p.id === activeId) || 
    PLANT_LIBRARY.find(p => `library-${p.id}` === activeId) : null;

  return (
    <div className="flex h-full bg-gray-50 min-h-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <PlantLibrary
          plants={PLANT_LIBRARY}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <ControlPanel
            dimensions={dimensions}
            gridSize={gridSize}
            showGrid={showGrid}
            showRuler={showRuler}
            onDimensionChange={setDimensions}
            onGridSizeChange={setGridSize}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleRuler={() => setShowRuler(!showRuler)}
            onSave={() => setShowSaveModal(true)}
            onLoad={() => setShowLoadModal(true)}
            hasUnsavedChanges={hasUnsavedChanges}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <GardenCanvas
            dimensions={dimensions}
            gridSize={gridSize}
            showGrid={showGrid}
            showRuler={showRuler}
            placedPlants={placedPlants}
            onPlantRemove={handlePlantRemove}
          />
        </div>

        <DragOverlay>
          {activePlant ? (
            <DraggablePlant
              plant={activePlant}
              gridSize={gridSize}
              isPlaced={false}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <SaveGardenModel
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveGarden}
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
        userId={userId}
      />
    </div>
  );
}