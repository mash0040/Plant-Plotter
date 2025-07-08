import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggablePlant from './DraggablePlant';

export default function GardenCanvas({
  dimensions,
  gridSize,
  showGrid,
  showRuler,
  placedPlants,
  onPlantRemove
}) {
  const { setNodeRef } = useDroppable({
    id: 'garden-canvas',
  });

  const canvasWidth = dimensions.width * gridSize;
  const canvasHeight = dimensions.height * gridSize;

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-2 sm:p-4">
      <div className="inline-block min-w-full">
        {/* Top Ruler */}
        {showRuler && (
          <div className="flex" style={{ marginLeft: showRuler ? '32px' : '0' }}>
            <div 
              className="h-8 bg-white border border-gray-300 border-b-2 border-b-gray-400 relative"
              style={{ width: canvasWidth }}
            >
              {Array.from({ length: dimensions.width }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-gray-300 flex items-center justify-center text-xs text-gray-600"
                  style={{ 
                    left: i * gridSize, 
                    width: gridSize,
                    fontSize: gridSize < 40 ? '10px' : '12px'
                  }}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex">
          {/* Left Ruler */}
          {showRuler && (
            <div 
              className="w-8 bg-white border border-gray-300 border-r-2 border-r-gray-400 relative"
              style={{ height: canvasHeight }}
            >
              {Array.from({ length: dimensions.height }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 w-full border-t border-gray-300 flex items-center justify-center text-xs text-gray-600"
                  style={{ 
                    top: i * gridSize, 
                    height: gridSize,
                    fontSize: gridSize < 40 ? '10px' : '12px'
                  }}
                >
                  {i}
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
          </div>
        </div>
      </div>
    </div>
  );
}