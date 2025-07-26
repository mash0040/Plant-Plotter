'use client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Info } from 'lucide-react';
import { useState } from 'react';

export default function PlantLibraryItem({ plant }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${plant.id}`,
    data: { ...plant, isFromLibrary: true }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  // Get category-based colors for better visual distinction
  const getCategoryColors = (category) => {
    switch (category) {
      case 'vegetables':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-emerald-100',
          border: 'border-green-200',
          hover: 'hover:bg-green-100',
          emoji: 'bg-green-100'
        };
      case 'herbs':
        return {
          bg: 'bg-gradient-to-r from-lime-50 to-green-100',
          border: 'border-lime-200',
          hover: 'hover:bg-lime-100',
          emoji: 'bg-lime-100'
        };
      case 'fruits':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-pink-100',
          border: 'border-red-200',
          hover: 'hover:bg-red-100',
          emoji: 'bg-red-100'
        };
      case 'flowers':
        return {
          bg: 'bg-gradient-to-r from-purple-50 to-pink-100',
          border: 'border-purple-200',
          hover: 'hover:bg-purple-100',
          emoji: 'bg-purple-100'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          border: 'border-gray-200',
          hover: 'hover:bg-gray-100',
          emoji: 'bg-gray-100'
        };
    }
  };

  const colors = getCategoryColors(plant.category);

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`
          flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing
          ${colors.bg} ${colors.border} border-2 
          ${colors.hover} transition-all duration-200 ease-in-out
          hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5
          ${isDragging ? 'z-50 shadow-xl scale-105' : ''}
          group
          select-none
        `}
        // FIXED: Add proper drag isolation
        onMouseDown={(e) => {
          // Prevent event bubbling to parent containers
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          // Prevent event bubbling on touch devices
          e.stopPropagation();
        }}
      >
        {/* Plant emoji with background circle */}
        <div className={`
          w-10 h-10 ${colors.emoji} rounded-full 
          flex items-center justify-center
          group-hover:scale-110 transition-transform duration-200
          shadow-sm
          pointer-events-none
        `}>
          <span className="text-xl filter drop-shadow-sm">{plant.emoji}</span>
        </div>
        
        {/* Plant details */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 truncate">
              {plant.name}
            </span>
            <span className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
              {plant.size}×{plant.size}
            </span>
          </div>
          
          {/* Category badge */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-600 capitalize font-medium">
              {plant.category}
            </span>
            
            {/* Info icon */}
            <div 
              className="relative pointer-events-auto"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(!showTooltip);
              }}
            >
              <div className="w-5 h-5 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors cursor-help">
                <Info className="w-3 h-3 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FIXED: Tooltip with proper positioning and z-index */}
      {showTooltip && (
        <div 
          className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs pointer-events-none z-[9999]"
          style={{
            right: '100%',
            top: '0',
            marginRight: '8px',
            width: '200px'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{plant.emoji}</span>
            <span className="font-semibold text-gray-800">{plant.name}</span>
          </div>
          
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Category:</span>
              <span className="capitalize font-medium">{plant.category}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-medium">{plant.size}×{plant.size} grid units</span>
            </div>
            
            {plant.sunlight && (
              <div className="flex justify-between">
                <span>Sunlight:</span>
                <span className="font-medium">{plant.sunlight}</span>
              </div>
            )}
            
            {plant.waterNeeds && (
              <div className="flex justify-between">
                <span>Water:</span>
                <span className="font-medium">{plant.waterNeeds}</span>
              </div>
            )}
            
            {plant.spacing && (
              <div className="flex justify-between">
                <span>Spacing:</span>
                <span className="font-medium">{plant.spacing}</span>
              </div>
            )}
            
            {plant.plantingDepth && (
              <div className="flex justify-between">
                <span>Planting Depth:</span>
                <span className="font-medium">{plant.plantingDepth}</span>
              </div>
            )}
            
            {plant.companionPlants && plant.companionPlants.length > 0 && (
              <div>
                <span className="text-green-600 font-medium">Good Companions:</span>
                <div className="mt-1 text-green-700">
                  {plant.companionPlants.slice(0, 3).map(id => {
                    return `${id.charAt(0).toUpperCase() + id.slice(1)}`;
                  }).join(', ')}
                  {plant.companionPlants.length > 3 && ` +${plant.companionPlants.length - 3} more`}
                </div>
              </div>
            )}
            
            {plant.avoidPlants && plant.avoidPlants.length > 0 && (
              <div>
                <span className="text-red-600 font-medium">Avoid Near:</span>
                <div className="mt-1 text-red-700">
                  {plant.avoidPlants.slice(0, 3).map(id => {
                    return `${id.charAt(0).toUpperCase() + id.slice(1)}`;
                  }).join(', ')}
                  {plant.avoidPlants.length > 3 && ` +${plant.avoidPlants.length - 3} more`}
                </div>
              </div>
            )}
            
            {plant.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-700 italic">{plant.description}</p>
              </div>
            )}
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            💡 Drag this plant to your garden to add it
          </div>
        </div>
      )}
    </div>
  );
}