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

  // Get category-based colors for better visual distinction
  const getCategoryColors = (category) => {
    switch (category) {
      case 'vegetables':
        return {
          bg: 'bg-gradient-to-br from-green-100 to-emerald-200',
          border: 'border-green-400',
          shadow: 'shadow-green-200/50'
        };
      case 'herbs':
        return {
          bg: 'bg-gradient-to-br from-lime-100 to-green-200',
          border: 'border-lime-500',
          shadow: 'shadow-lime-200/50'
        };
      case 'fruits':
        return {
          bg: 'bg-gradient-to-br from-red-100 to-pink-200',
          border: 'border-red-400',
          shadow: 'shadow-red-200/50'
        };
      case 'flowers':
        return {
          bg: 'bg-gradient-to-br from-purple-100 to-pink-200',
          border: 'border-purple-400',
          shadow: 'shadow-purple-200/50'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-100 to-gray-200',
          border: 'border-gray-400',
          shadow: 'shadow-gray-200/50'
        };
    }
  };

  const colors = getCategoryColors(plant.category);
  
  // Calculate sizes based on plant size for better scaling
  const isSmall = plantSize < 50;
  const isMedium = plantSize >= 50 && plantSize < 80;
  const isLarge = plantSize >= 80;

  const emojiSize = isSmall ? 'text-lg' : isMedium ? 'text-2xl' : 'text-4xl';
  const textSize = isSmall ? 'text-xs' : isMedium ? 'text-sm' : 'text-base';
  const padding = isSmall ? 'p-1' : isMedium ? 'p-2' : 'p-3';

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={`
        flex flex-col items-center justify-center
        ${colors.bg} ${colors.border} border-2 rounded-xl
        ${padding} cursor-move select-none relative
        shadow-lg ${colors.shadow}
        hover:shadow-xl hover:scale-105
        transition-all duration-200 ease-in-out
        ${isCurrentlyDragging ? 'opacity-50 scale-110 rotate-3' : ''}
        ${isDragging ? 'opacity-80' : ''}
        backdrop-blur-sm
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
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-10 shadow-lg hover:scale-110 transition-all duration-200"
          style={{ pointerEvents: 'auto' }}
          title="Remove plant"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {/* Plant emoji - larger and centered */}
      <div className={`${emojiSize} mb-1 filter drop-shadow-sm`}>
        {plant.emoji}
      </div>
      
      {/* Plant name - responsive text size */}
      <div className={`${textSize} text-center font-semibold text-gray-700 leading-tight px-1`}>
        {plant.name}
      </div>
      
      {/* Size indicator for medium/large plants */}
      {!isSmall && (
        <div className="text-xs text-gray-500 mt-1 bg-white/70 px-2 py-0.5 rounded-full">
          {plant.size}×{plant.size}
        </div>
      )}
      
      {/* Planted date indicator for placed plants */}
      {isPlaced && plant.plantedDate && !isSmall && (
        <div className="absolute bottom-1 left-1 text-xs bg-white/80 text-gray-600 px-1 py-0.5 rounded text-center leading-none">
          {new Date(plant.plantedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
    </div>
  );
}