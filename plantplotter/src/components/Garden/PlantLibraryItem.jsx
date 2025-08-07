'use client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Info, Edit3 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function PlantLibraryItem({ plant, onEdit, showEditButton = true }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: true, left: false });
  const [isDragReady, setIsDragReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const itemRef = useRef(null);
  const tooltipRef = useRef(null);
  const longPressTimer = useRef(null);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${plant.id}`,
    data: { ...plant, isFromLibrary: true }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Calculate optimal tooltip position
  useEffect(() => {
    if (showTooltip && itemRef.current && tooltipRef.current) {
      const itemRect = itemRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Check if tooltip would go below viewport when positioned at item top
      const wouldOverflowBottom = itemRect.top + tooltipRect.height > viewportHeight - 20;
      const wouldOverflowRight = itemRect.left + tooltipRect.width > viewportWidth - 20;
      
      setTooltipPosition({
        top: !wouldOverflowBottom,
        left: !wouldOverflowRight
      });
    }
  }, [showTooltip]);

  // Enhanced touch handlers for mobile drag support
  const handleTouchStart = (e) => {
    // Clear any existing timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    // Start long press timer for mobile drag
    longPressTimer.current = setTimeout(() => {
      setIsDragReady(true);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Visual feedback
      const target = e.currentTarget;
      target.style.transform = 'scale(1.05)';
      target.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
      
      // Reset after a moment
      setTimeout(() => {
        if (target) {
          target.style.transform = '';
          target.style.boxShadow = '';
        }
      }, 200);
    }, 500); // 500ms for long press

    // Call original touch start if it exists
    if (listeners.onTouchStart) {
      listeners.onTouchStart(e);
    }
  };

  const handleTouchEnd = (e) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    setIsDragReady(false);

    // Call original touch end if it exists
    if (listeners.onTouchEnd) {
      listeners.onTouchEnd(e);
    }
  };

  const handleTouchMove = (e) => {
    // Cancel long press if user moves finger
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Call original touch move if it exists
    if (listeners.onTouchMove) {
      listeners.onTouchMove(e);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Get category-based colors for better visual distinction
  const getCategoryColors = (category) => {
    switch (category) {
      case 'vegetables':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-emerald-100',
          border: 'border-green-200',
          hover: 'hover:bg-green-100 active:bg-green-200',
          emoji: 'bg-green-100'
        };
      case 'herbs':
        return {
          bg: 'bg-gradient-to-r from-lime-50 to-green-100',
          border: 'border-lime-200',
          hover: 'hover:bg-lime-100 active:bg-lime-200',
          emoji: 'bg-lime-100'
        };
      case 'fruits':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-pink-100',
          border: 'border-red-200',
          hover: 'hover:bg-red-100 active:bg-red-200',
          emoji: 'bg-red-100'
        };
      case 'flowers':
        return {
          bg: 'bg-gradient-to-r from-purple-50 to-pink-100',
          border: 'border-purple-200',
          hover: 'hover:bg-purple-100 active:bg-purple-200',
          emoji: 'bg-purple-100'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          border: 'border-gray-200',
          hover: 'hover:bg-gray-100 active:bg-gray-200',
          emoji: 'bg-gray-100'
        };
    }
  };

  const colors = getCategoryColors(plant.category);

  // Get tooltip styles with responsive positioning
  const getTooltipStyles = () => {
    const baseClasses = 'absolute z-50 w-full max-w-xs sm:max-w-sm';
    
    if (tooltipPosition.top) {
      return `${baseClasses} bottom-full mb-2`;
    } else {
      return `${baseClasses} top-full mt-2`;
    }
  };

  // Enhanced edit button click handling
  const handleEditClick = (e) => {    
    e.preventDefault();
    e.stopPropagation();
    
    // Close tooltip if open
    setShowTooltip(false);
    
    if (onEdit) {
      onEdit(plant);
    } else {
      console.error('onEdit function is not available');
    }
  };

  // Enhanced listeners for touch devices
  const enhancedListeners = isTouchDevice ? {
    ...listeners,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  } : listeners;

  return (
    <div className="relative" ref={itemRef}>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg 
          cursor-grab active:cursor-grabbing
          ${colors.bg} ${colors.border} border-2 
          ${colors.hover} transition-all duration-200 ease-in-out
          hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5
          active:scale-[1.05] sm:active:scale-[1.02]
          ${isDragging ? 'z-50 shadow-xl scale-105' : ''}
          ${isDragReady ? 'ring-2 ring-green-400 ring-opacity-75' : ''}
          group select-none touch-manipulation
          min-h-[3rem] sm:min-h-[3.5rem]
        `}
        {...enhancedListeners}
        {...attributes}
      >
        {/* Long press indicator for mobile */}
        {isTouchDevice && isDragReady && (
          <div className="absolute inset-0 bg-green-200/30 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-xs font-medium text-green-700 bg-white px-2 py-1 rounded shadow-sm">
              Ready to drag
            </div>
          </div>
        )}

        {/* Plant emoji with enhanced mobile sizing */}
        <div className={`
          w-8 h-8 sm:w-10 sm:h-10 ${colors.emoji} rounded-full 
          flex items-center justify-center flex-shrink-0
          group-hover:scale-110 transition-transform duration-200
          shadow-sm
          pointer-events-none
        `}>
          <span className="text-lg sm:text-xl filter drop-shadow-sm">{plant.emoji}</span>
        </div>
        
        {/* Plant details with responsive sizing */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-semibold text-gray-800 truncate">
              {plant.name}
            </span>
            <span className="text-xs text-gray-500 bg-white/70 px-1.5 sm:px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
              {plant.size}×{plant.size}
            </span>
          </div>
          
          {/* Category and action buttons with enhanced mobile layout */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs sm:text-sm text-gray-600 capitalize font-medium">
              {plant.category}
            </span>
            
            {/* Action buttons with enhanced touch targets */}
            <div className="flex items-center gap-1 pointer-events-auto">
              {/* Edit button with larger touch target */}
              {showEditButton && onEdit && (
                <button 
                  className="
                    w-6 h-6 sm:w-7 sm:h-7 bg-orange-100 hover:bg-orange-200 active:bg-orange-300
                    rounded-full flex items-center justify-center transition-colors 
                    cursor-pointer z-10 touch-manipulation
                    hover:scale-110 active:scale-95
                  "
                  onClick={handleEditClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    // Clear any long press timer when touching edit button
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                  }}
                  title="Edit plant"
                  type="button"
                >
                  <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600" />
                </button>
              )}
              
              {/* Info icon with enhanced mobile behavior */}
              <div 
                className="relative"
                onMouseEnter={() => !isTouchDevice && setShowTooltip(true)}
                onMouseLeave={() => !isTouchDevice && setShowTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (isTouchDevice) {
                    setShowTooltip(!showTooltip);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  // Clear any long press timer when touching info button
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
              >
                <div className="
                  w-6 h-6 sm:w-7 sm:h-7 bg-blue-100 hover:bg-blue-200 active:bg-blue-300
                  rounded-full flex items-center justify-center transition-colors 
                  cursor-help touch-manipulation
                  hover:scale-110 active:scale-95
                ">
                  <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced tooltip with responsive design */}
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className={`
            ${getTooltipStyles()}
            bg-white border border-gray-200 rounded-lg shadow-2xl 
            p-3 sm:p-4 text-xs sm:text-sm pointer-events-none
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
        >
          {/* Arrow indicator */}
          <div 
            className={`
              absolute w-3 h-3 bg-white border transform rotate-45 left-4 sm:left-6
              ${tooltipPosition.top 
                ? '-bottom-1.5 border-t-0 border-l-0' 
                : '-top-1.5 border-b-0 border-r-0'
              }
            `}
          />
          
          {/* Tooltip content with responsive layout */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="text-lg sm:text-xl">{plant.emoji}</span>
            <span className="font-semibold text-gray-800 text-sm sm:text-base">{plant.name}</span>
          </div>
          
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
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
                <div className="mt-1 text-green-700 text-xs">
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
                <div className="mt-1 text-red-700 text-xs">
                  {plant.avoidPlants.slice(0, 3).map(id => {
                    return `${id.charAt(0).toUpperCase() + id.slice(1)}`;
                  }).join(', ')}
                  {plant.avoidPlants.length > 3 && ` +${plant.avoidPlants.length - 3} more`}
                </div>
              </div>
            )}
            
            {plant.description && (
              <div className="pt-1.5 sm:pt-2 border-t border-gray-100">
                <p className="text-gray-700 italic text-xs sm:text-sm">{plant.description}</p>
              </div>
            )}
          </div>
          
          <div className="mt-2 sm:mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span className="hidden sm:inline">💡 Drag this plant to your garden to add it</span>
            <span className="sm:hidden">💡 Long press & drag to garden</span>
          </div>
        </div>
      )}
      
      {/* Touch dismiss overlay for mobile tooltips */}
      {isTouchDevice && showTooltip && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowTooltip(false)}
        />
      )}
    </div>
  );
}