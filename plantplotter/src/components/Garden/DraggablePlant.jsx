import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { X } from 'lucide-react';

export default function DraggablePlant({ 
  plant, 
  gridSize, 
  isPlaced = false, 
  onRemove,
  isDragging = false 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: isPlaced ? plant.id : `library-${plant.id}`,
    data: {
      ...plant,
      isFromLibrary: !isPlaced,
    },
  });

  const plantSize = (plant.size || 1) * gridSize;
  
  // Calculate transform for dragging
  const dragTransform = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Position for placed plants
  const placedStyle = isPlaced ? {
    position: 'absolute',
    left: plant.x || 0,
    top: plant.y || 0,
    zIndex: isCurrentlyDragging ? 1000 : 1,
  } : {};

  const combinedStyle = {
    width: plantSize,
    height: plantSize,
    ...placedStyle,
    ...dragTransform,
  };

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={`
        flex flex-col items-center justify-center
        border-2 border-green-400 rounded-lg
        bg-white cursor-move select-none
        hover:shadow-md transition-shadow
        ${isCurrentlyDragging ? 'opacity-50' : ''}
        ${isDragging ? 'opacity-80' : ''}
      `}
      {...listeners}
      {...attributes}
    >
      {/* Remove button for placed plants */}
      {isPlaced && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      <div className="text-2xl mb-1">{plant.emoji}</div>
      <div className="text-xs text-center font-medium text-gray-700">
        {plant.name}
      </div>
    </div>
  );
}