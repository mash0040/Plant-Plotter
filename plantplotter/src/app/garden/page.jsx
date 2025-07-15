'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { ArrowLeft } from 'lucide-react';
import PlantLibrary from '@/components/Garden/PlantLibrary';
import GardenCanvas from '@/components/Garden/GardenCanvas';
import ControlPanel from '@/components/Garden/ControlPanel';
import DraggablePlant from '@/components/Garden/DraggablePlant';
import SaveGardenModel from '@/components/Garden/SaveGardenModel';
import LoadGardenModel from '@/components/Garden/LoadGardenModel';
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';
import { snapToGrid, checkPlantOverlap, isWithinBounds } from '@/components/Garden/Utils/GardenUtils';
import { GardenService } from '@/components/Garden/Services/GardenService';
import { getGardenById } from '@/lib/api';

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

  // Mock user ID - replace with actual auth
  const userId = 'user-123';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Function to calculate minimum required dimensions based on placed plants
  const calculateMinimumDimensions = () => {
    if (placedPlants.length === 0) {
      return { width: 1, height: 1 };
    }

    let maxX = 0;
    let maxY = 0;

    placedPlants.forEach(plant => {
      const plantSize = plant.size || 1;
      
      if (showGrid) {
        // Grid-based calculation
        const plantGridX = Math.floor(plant.x / gridSize);
        const plantGridY = Math.floor(plant.y / gridSize);
        const plantMaxX = plantGridX + plantSize;
        const plantMaxY = plantGridY + plantSize;
        maxX = Math.max(maxX, plantMaxX);
        maxY = Math.max(maxY, plantMaxY);
      } else {
        // Free-form calculation - use actual pixel positions
        const plantSizePixels = plantSize * gridSize;
        const plantMaxX = Math.ceil((plant.x + plantSizePixels) / gridSize);
        const plantMaxY = Math.ceil((plant.y + plantSizePixels) / gridSize);
        maxX = Math.max(maxX, plantMaxX);
        maxY = Math.max(maxY, plantMaxY);
      }
    });

    return { width: Math.max(1, maxX), height: Math.max(1, maxY) };
  };

  // Enhanced bounds checking for both grid and free-form modes
  const isWithinBoundsFlexible = (plant, dimensions, gridSize, useGrid = true) => {
    const plantSize = (plant.size || 1) * gridSize;
    const maxX = dimensions.width * gridSize;
    const maxY = dimensions.height * gridSize;
    
    if (useGrid) {
      // Grid mode - use original logic
      return isWithinBounds(plant, dimensions, gridSize);
    } else {
      // Free-form mode - check pixel boundaries
      return plant.x >= 0 && 
             plant.y >= 0 && 
             plant.x + plantSize <= maxX && 
             plant.y + plantSize <= maxY;
    }
  };

  // Enhanced overlap checking for both grid and free-form modes  
  const checkPlantOverlapFlexible = (newPlant, existingPlants, gridSize, useGrid = true) => {
    if (useGrid) {
      // Grid mode - use original logic
      return checkPlantOverlap(newPlant, existingPlants, gridSize);
    } else {
      // Free-form mode - pixel-perfect overlap detection
      const newSize = (newPlant.size || 1) * gridSize;
      
      return existingPlants.some(existing => {
        const existingSize = (existing.size || 1) * gridSize;
        
        // Check if rectangles overlap (pixel perfect)
        return !(newPlant.x >= existing.x + existingSize ||
                 existing.x >= newPlant.x + newSize ||
                 newPlant.y >= existing.y + existingSize ||
                 existing.y >= newPlant.y + newSize);
      });
    }
  };

  // Validation function for dimension changes
  const validateDimensionChange = (newDimensions) => {
    const minRequired = calculateMinimumDimensions();
    
    if (newDimensions.width < minRequired.width || newDimensions.height < minRequired.height) {
      return {
        valid: false,
        message: `Cannot resize garden smaller than ${minRequired.width}×${minRequired.height} due to existing plants. Please remove or relocate plants first.`,
        minRequired
      };
    }
    
    return { valid: true };
  };

  // Enhanced dimension change handler with validation
  const handleDimensionChange = (newDimensions) => {
    const validation = validateDimensionChange(newDimensions);
    
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    
    setDimensions(newDimensions);
  };

  // Close sidebar when clicking outside on mobile
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Track drag overlay position during drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (activeId && dragOverlayRef.current) {
        // Get the actual position of the drag overlay element
        const overlayRect = dragOverlayRef.current.getBoundingClientRect();
        setDragOverlayPosition({
          x: overlayRect.left + overlayRect.width / 2, // Center of the overlay
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

  // Load garden data if ID is provided
  useEffect(() => {
    const loadGarden = async () => {
      if (!gardenId) return;
      
      setLoading(true);
      try {
        const garden = await getGardenById(gardenId);
        
        // Set garden data
        setCurrentGarden(garden);
        setDimensions({
        width: garden.dimensions?.width ?? 20,
        height: garden.dimensions?.height ?? 12
  });
        
        // Convert planted items to the planner format
        if (garden.plantedItems && garden.plantedItems.length > 0) {
          const convertedPlants = garden.plantedItems.map(item => ({
          id: `plant-${item.id ?? crypto.randomUUID()}`,
            plantId: item.plantId,
            name: item.name,
            emoji: item.emoji,
            size: item.size,
            category: item.category,
            x: typeof item.xPosition === 'number' ? item.xPosition * gridSize : 0, 
            y: typeof item.yPosition === 'number' ? item.yPosition * gridSize : 0,
            plantedDate: item.plantedDate ? new Date(item.plantedDate) : null,
            notes: item.notes,
            isFromLibrary: false
          }));
          setPlacedPlants(convertedPlants);
        }
        
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to load garden:', error);
        alert('Failed to load garden. It may have been deleted or you may not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };

    loadGarden();
  }, [gardenId, gridSize]);

  // Track changes for unsaved indicator
  useEffect(() => {
    if (currentGarden) {
      setHasUnsavedChanges(true);
    }
  }, [dimensions, gridSize, placedPlants]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // ENHANCED: Support both grid-snapped and free-form positioning
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || over.id !== 'garden-canvas') return;

    const draggedData = active.data.current;
    
    if (draggedData?.isFromLibrary) {
      const canvasElement = document.querySelector('[data-canvas="true"]');
      if (!canvasElement) return;

      const canvasRect = canvasElement.getBoundingClientRect();
      
      // Get scroll offsets
      const scrollContainer = canvasElement.closest('.overflow-auto');
      const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      // Use the drag overlay position instead of mouse cursor position
      const overlayX = dragOverlayPosition.x;
      const overlayY = dragOverlayPosition.y;
      
      // Convert overlay position to canvas coordinates
      const canvasX = (overlayX - canvasRect.left) + scrollLeft;
      const canvasY = (overlayY - canvasRect.top) + scrollTop;
      
      // The overlay center represents where the plant center should be
      // So we need to offset by half the plant size to get the top-left corner
      const plantSize = (draggedData.size || 1) * gridSize;
      const plantX = canvasX - (plantSize / 2);
      const plantY = canvasY - (plantSize / 2);
      
      // Apply positioning logic based on grid mode
      let finalX, finalY;
      if (showGrid) {
        // Grid mode - snap to grid
        finalX = snapToGrid(Math.max(0, plantX), gridSize);
        finalY = snapToGrid(Math.max(0, plantY), gridSize);
      } else {
        // Free-form mode - use exact position (but keep within bounds)
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

      // Check bounds and overlaps using flexible methods
      if (isWithinBoundsFlexible(newPlant, dimensions, gridSize, showGrid) && 
          !checkPlantOverlapFlexible(newPlant, placedPlants, gridSize, showGrid)) {
        setPlacedPlants(prev => [...prev, newPlant]);
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      } else {
        // Show specific error message
        if (!isWithinBoundsFlexible(newPlant, dimensions, gridSize, showGrid)) {
          alert('Cannot place plant outside garden boundaries. Please place within the garden area.');
        } else {
          alert('Cannot place plant here - it overlaps with another plant. Please choose a different location.');
        }
      }
      
    } else if (!draggedData?.isFromLibrary) {
      // For existing plants being moved
      setPlacedPlants(prev => prev.map(plant => {
        if (plant.id === active.id) {
          let newX, newY;
          
          if (showGrid) {
            // Grid mode - snap to grid
            newX = snapToGrid(Math.max(0, (plant.x || 0) + event.delta.x), gridSize);
            newY = snapToGrid(Math.max(0, (plant.y || 0) + event.delta.y), gridSize);
          } else {
            // Free-form mode - use exact delta position
            newX = Math.max(0, (plant.x || 0) + event.delta.x);
            newY = Math.max(0, (plant.y || 0) + event.delta.y);
          }
          
          const updatedPlant = { ...plant, x: newX, y: newY };
          
          const otherPlants = prev.filter(p => p.id !== plant.id);
          if (isWithinBoundsFlexible(updatedPlant, dimensions, gridSize, showGrid) && 
              !checkPlantOverlapFlexible(updatedPlant, otherPlants, gridSize, showGrid)) {
            return updatedPlant;
          } else {
            // Show specific error message for moving plants
            if (!isWithinBoundsFlexible(updatedPlant, dimensions, gridSize, showGrid)) {
              alert('Cannot move plant outside garden boundaries.');
            } else {
              alert('Cannot move plant to this location - it would overlap with another plant.');
            }
          }
        }
        return plant;
      }));
    }
    
    // Reset drag overlay position
    setDragOverlayPosition({ x: 0, y: 0 });
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
      soilType: currentGarden?.soilType || 'Loamy',
      location: currentGarden?.location || 'Garden',
      status: currentGarden?.status || 'Active',
      plantedItems: placedPlants.map(plant => ({
        plantId: plant.plantId || plant.id.replace('plant-', ''),
        name: plant.name,
        emoji: plant.emoji,
        size: plant.size,
        category: plant.category,
        xPosition: showGrid ? Math.round(plant.x / gridSize) : plant.x / gridSize, // Handle both modes
        yPosition: showGrid ? Math.round(plant.y / gridSize) : plant.y / gridSize,
        plantedDate: plant.plantedDate || new Date(),
        notes: plant.notes || ''
      }))
    };

    try {
      // Use mock service for development (replace with real service when backend is ready)
      const savedGarden = await GardenService.saveGardenMock(gardenData);
      
      setCurrentGarden(savedGarden);
      setHasUnsavedChanges(false);
      
      return savedGarden;
    } catch (error) {
      console.error('Failed to save garden:', error);
      throw error;
    }
  };

  const handleNavigateToGardens = (savedGarden) => {
    // Navigate to gardens page with a success message
    router.push('/gardens?saved=true&gardenId=' + savedGarden.id);
  };

  const handleLoadGarden = (gardenData) => {
   if(!gardenData){
    alert("Garden not found. Fill your data here");
    return;
   }
    setCurrentGarden(gardenData);
    setDimensions({ width: gardenData.width, height: gardenData.height });
    setGridSize(gardenData.gridSize);
    
    // Convert loaded plants to planner format
    const convertedPlants = (gardenData.plantedItems || []).map(item => ({
      id: `plant-${item.id || Date.now()}`,
      plantId: item.plantId,
      name: item.name,
      emoji: item.emoji,
      size: item.size,
      category: item.category,
      x: item.xPosition * gardenData.gridSize,
      y: item.yPosition * gardenData.gridSize,
      plantedDate: item.plantedDate ? new Date(item.plantedDate) : null,
      notes: item.notes,
      isFromLibrary: false
    }));
    
    setPlacedPlants(convertedPlants);
    setHasUnsavedChanges(false);
  };

  const handleBackToGarden = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        if (gardenId) {
          router.push(`/gardens`);
        } else {
          router.push('/gardens');
        }
      }
    } else {
      if (gardenId) {
        router.push(`/gardens/${gardenId}`);
      } else {
        router.push('/gardens');
      }
    }
  };

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
            onDimensionChange={handleDimensionChange} // Using the validated version
            onGridSizeChange={setGridSize}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToggleRuler={() => setShowRuler(!showRuler)}
            onSave={() => setShowSaveModal(true)}
            onLoad={() => setShowLoadModal(true)}
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

        {/* FIXED: DragOverlay with position tracking */}
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
        userId={userId}
      />
    </div>
  );
}