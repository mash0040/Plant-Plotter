import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggablePlant from './DraggablePlant';

export default function GardenCanvas({
  dimensions,
  gridSize,
  showGrid,
  showRuler,
  placedPlants,
  onPlantRemove,
  placementPreview,
  isPlantLibraryOpen = false
}) {
  const { setNodeRef } = useDroppable({
    id: 'garden-canvas',
  });

  const canvasWidth = dimensions.width * gridSize;
  const canvasHeight = dimensions.height * gridSize;

  // Convert grid units to meters (assuming 40px = 1m)
  const gridUnitsToMeters = (gridUnits) => {
    return gridUnits;
  };

  return (
    <div className="relative h-full min-h-0 overflow-auto bg-white p-2 sm:p-4">
      <div className={`sm:hidden sticky top-2 left-2 z-20 mb-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm border border-gray-200 ${isPlantLibraryOpen ? 'hidden' : 'inline-flex'}`}>
        Scroll to pan garden
      </div>
      <div className="inline-block min-w-full">
        {/* Top Ruler */}
        {showRuler && (
          <div className="flex">
            <div className="w-12 h-10 bg-white border border-gray-300 border-r-2 border-r-gray-400 border-b-2 border-b-gray-400" />
            <div 
              className="h-10 bg-white border border-gray-300 border-b-2 border-b-gray-400 relative"
              style={{ width: canvasWidth }}
            >
              {Array.from({ length: dimensions.width }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-gray-300 flex items-center justify-center text-xs font-medium text-gray-700"
                  style={{ 
                    left: i * gridSize, 
                    width: gridSize,
                    fontSize: gridSize < 40 ? '10px' : '12px'
                  }}
                >
                  {gridUnitsToMeters(i + 1)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex">
          {/* Left Ruler */}
          {showRuler && (
            <div 
              className="w-12 bg-white border border-gray-300 border-r-2 border-r-gray-400 relative"
              style={{ height: canvasHeight }}
            >
              {Array.from({ length: dimensions.height }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 w-full border-t border-gray-300 flex items-center justify-center text-xs font-medium text-gray-700"
                  style={{ 
                    top: i * gridSize, 
                    height: gridSize,
                    fontSize: gridSize < 40 ? '10px' : '12px'
                  }}
                >
                  {gridUnitsToMeters(i + 1)}
                </div>
              ))}
            </div>
          )}

          {/* Garden Canvas */}
          <div
            ref={setNodeRef}
            className="relative border-2 border-gray-400 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              minWidth: canvasWidth,
              minHeight: canvasHeight,
            }}
            data-canvas="true"
          >
            {/* Grid */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Vertical grid lines */}
                {Array.from({ length: dimensions.width + 1 }, (_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute h-full border-l border-gray-300"
                    style={{ left: i * gridSize }}
                  />
                ))}
                {/* Horizontal grid lines */}
                {Array.from({ length: dimensions.height + 1 }, (_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full border-t border-gray-300"
                    style={{ top: i * gridSize }}
                  />
                ))}
              </div>
            )}

            {/* Placed Plants */}
            {placedPlants.map((plant) => (
              <DraggablePlant
                key={plant.id}
                plant={plant}
                gridSize={gridSize}
                isPlaced={true}
                onRemove={() => onPlantRemove(plant.id)}
              />
            ))}

            {placementPreview && (
              <div
                className={`absolute pointer-events-none rounded-xl border-2 border-dashed z-20 ${
                  placementPreview.isValid
                    ? 'border-green-500 bg-green-200/35'
                    : 'border-red-500 bg-red-200/35'
                }`}
                style={{
                  left: placementPreview.x,
                  top: placementPreview.y,
                  width: placementPreview.size * gridSize,
                  height: placementPreview.size * gridSize
                }}
              >
                <div className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  placementPreview.isValid
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  {placementPreview.size}x{placementPreview.size}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
