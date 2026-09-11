import React, { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggablePlant from './DraggablePlant';
import { getRowRevealScroll } from './Utils/RowPlantingUtils';

export default function GardenCanvas({
  dimensions,
  gridSize,
  showGrid,
  showRuler,
  placedPlants,
  onPlantRemove,
  placementPreview,
  rowReveal,
  isPlantLibraryOpen = false,
  disablePlantDragging = false
}) {
  const { setNodeRef } = useDroppable({
    id: 'garden-canvas',
  });
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const [highlightedRow, setHighlightedRow] = useState(null);

  useEffect(() => {
    if (!rowReveal?.plants.length) {
      setHighlightedRow(null);
      return;
    }
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const revealGridSize = rowReveal.gridSize;
    const bounds = {
      x: Math.min(...rowReveal.plants.map(plant => plant.x)) * revealGridSize,
      y: Math.min(...rowReveal.plants.map(plant => plant.y)) * revealGridSize,
      right: Math.max(...rowReveal.plants.map(plant => plant.x + plant.size)) * revealGridSize,
      bottom: Math.max(...rowReveal.plants.map(plant => plant.y + plant.size)) * revealGridSize
    };
    const viewportRect = viewport.getBoundingClientRect();
    viewport.scrollTo(getRowRevealScroll(
      { left: viewportRect.left, top: viewportRect.top, width: viewport.clientWidth, height: viewport.clientHeight },
      canvas.getBoundingClientRect(), bounds, viewport.scrollLeft, viewport.scrollTop
    ));
    setHighlightedRow(rowReveal);
    const timer = window.setTimeout(() => setHighlightedRow(null), 2400);
    return () => window.clearTimeout(timer);
  }, [rowReveal]);

  const canvasWidth = dimensions.width * gridSize;
  const canvasHeight = dimensions.height * gridSize;

  // Convert grid units to meters (assuming 40px = 1m)
  const gridUnitsToMeters = (gridUnits) => {
    return gridUnits;
  };

  return (
    <div ref={viewportRef} data-garden-viewport className="relative h-full min-h-0 overflow-auto bg-emerald-100/50 p-3 sm:p-5 lg:p-6">
      <span className="sr-only" role="status">{highlightedRow ? `${highlightedRow.plants.length} plants added. The canvas shows the new row starting position.` : ''}</span>
      <div className={`mb-2 w-fit rounded-full border border-green-200 bg-white/95 px-3 py-1 text-xs font-medium text-green-800 shadow-sm sm:hidden ${isPlantLibraryOpen ? 'hidden' : 'block'}`}>
        Scroll to pan garden
      </div>
      <div className="inline-block min-w-full py-1 sm:py-2">
        {/* Top Ruler */}
        {showRuler && (
          <div className="flex">
            <div className="h-10 w-12 border border-green-200 border-b-2 border-r-2 border-b-green-700/60 border-r-green-700/60 bg-white" />
            <div 
              className="relative h-10 border border-green-200 border-b-2 border-b-green-700/60 bg-white"
              style={{ width: canvasWidth }}
            >
              {Array.from({ length: dimensions.width }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex h-full items-center justify-center border-l border-green-200 text-xs font-medium text-green-950"
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
              className="relative w-12 border border-green-200 border-r-2 border-r-green-700/60 bg-white"
              style={{ height: canvasHeight }}
            >
              {Array.from({ length: dimensions.height }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 flex w-full items-center justify-center border-t border-green-200 text-xs font-medium text-green-950"
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
            ref={node => {
              canvasRef.current = node;
              setNodeRef(node);
            }}
            className="relative border-2 border-green-700/60 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 shadow-[0_18px_36px_-28px_rgba(20,83,45,0.9)]"
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
                    className="absolute h-full border-l border-green-200/80"
                    style={{ left: i * gridSize }}
                  />
                ))}
                {/* Horizontal grid lines */}
                {Array.from({ length: dimensions.height + 1 }, (_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full border-t border-green-200/80"
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
                disableDrag={disablePlantDragging}
              />
            ))}

            {highlightedRow?.plants.filter(plant => placedPlants.some(existing => existing.id === plant.id)).map(plant => (
              <div
                key={`row-highlight-${plant.id}`}
                data-row-highlight
                aria-hidden="true"
                className="pointer-events-none absolute z-20 rounded border-2 border-green-900 bg-green-100/25"
                style={{ left: plant.x * gridSize, top: plant.y * gridSize, width: plant.size * gridSize, height: plant.size * gridSize }}
              >
                {plant.id === highlightedRow.plants[0].id && <span className="absolute left-0 top-0 whitespace-nowrap rounded bg-green-900 px-1.5 py-0.5 text-xs font-medium text-white">New row</span>}
              </div>
            ))}

            {placementPreview && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute z-20 rounded-lg border-2 border-dashed transition-colors duration-100 motion-reduce:transition-none ${
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
