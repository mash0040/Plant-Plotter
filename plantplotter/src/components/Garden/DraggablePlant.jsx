import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import { getPlantFootprint } from './Utils/GardenUtils';

export default function DraggablePlant({ 
  plant, 
  gridSize, 
  isPlaced = false, 
  onRemove,
  isDragging = false,
  disableDrag = false
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
    disabled: disableDrag,
  });

  const plantFootprint = getPlantFootprint(plant);
  const plantSize = plantFootprint * gridSize;
  
  // Calculate transform for dragging
  const dragTransform = !disableDrag && transform ? {
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

  const emojiSize = isSmall ? 'text-lg' : isMedium ? 'text-2xl' : 'text-4xl';
  const textSize = isSmall ? 'text-[10px]' : isMedium ? 'text-sm' : 'text-base';
  const padding = isSmall ? 'p-1' : isMedium ? 'p-2' : 'p-2';

  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      className={`
        flex flex-col items-center justify-center
        ${colors.bg} ${colors.border} border-2 rounded-xl
        ${padding} ${disableDrag ? 'cursor-default touch-pan-x touch-pan-y' : 'cursor-move'} select-none relative
        shadow-lg ${colors.shadow}
        hover:shadow-xl hover:scale-105
        transition-all duration-200 ease-in-out
        ${!disableDrag && isCurrentlyDragging ? 'opacity-50 scale-110 rotate-3' : ''}
        ${isDragging ? 'opacity-80' : ''}
        backdrop-blur-sm group
      `}
      tabIndex={isPlaced ? 0 : undefined}
      {...(!disableDrag ? listeners : {})}
      {...(!disableDrag ? attributes : {})}
    >
      {/* Remove button for placed plants */}
      {isPlaced && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 z-10 shadow-lg hover:scale-110 transition-all duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus:opacity-100 group-focus:pointer-events-auto"
          title="Remove plant"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {/* Plant emoji - larger and centered */}
      <div className={`${emojiSize} ${isSmall ? '' : 'mb-1'} filter drop-shadow-sm`}>
        {plant.emoji}
      </div>
      
      {/* Plant name - responsive text size */}
      <div className={`${textSize} text-center font-semibold text-gray-700 leading-tight px-1 max-w-full truncate`}>
        {plant.name}
      </div>
      
      {/* Size indicator for medium/large plants */}
      {!isPlaced && !isSmall && (
        <div className="text-xs text-gray-500 mt-1 bg-white/70 px-2 py-0.5 rounded-full">
          {plantFootprint}x{plantFootprint}
        </div>
      )}
      
      {/* Planted date indicator for placed plants */}
      {isPlaced && plant.plantedDate && !isSmall && (
        <div className="absolute bottom-1 left-1 text-xs bg-white/80 text-gray-600 px-1 py-0.5 rounded text-center leading-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100">
          {new Date(plant.plantedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {isPlaced && !isSmall && (
        <div className="absolute bottom-1 right-1 text-[10px] text-gray-600 bg-white/85 px-1.5 py-0.5 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100">
          {plantFootprint}x{plantFootprint}
        </div>
      )}
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
    </div>
  );
}
