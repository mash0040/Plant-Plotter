'use client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Info, Edit3, Grid } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function PlantLibraryItem({ plant, onEdit, onPlantRow, onInfo, showEditButton = true }) {
  const [isDragReady, setIsDragReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const longPressTimer = useRef(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${plant.id}`,
    data: { ...plant, isFromLibrary: true }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      setIsDragReady(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      const target = e.currentTarget;
      target.style.transform = 'scale(1.05)';
      target.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';

      setTimeout(() => {
        if (target) {
          target.style.transform = '';
          target.style.boxShadow = '';
        }
      }, 200);
    }, 500);

    if (listeners.onTouchStart) {
      listeners.onTouchStart(e);
    }
  };

  const handleTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setIsDragReady(false);

    if (listeners.onTouchEnd) {
      listeners.onTouchEnd(e);
    }
  };

  const handleTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (listeners.onTouchMove) {
      listeners.onTouchMove(e);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

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

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onEdit) {
      onEdit(plant);
    } else {
      console.error('onEdit function is not available');
    }
  };

  const handleRowPlantClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onPlantRow) {
      onPlantRow(plant);
    } else {
      console.error('onPlantRow function is not available');
    }
  };

  const handleInfoClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onInfo) {
      onInfo(plant);
    }
  };

  const handleActionTouchStart = (e) => {
    e.stopPropagation();
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const enhancedListeners = isTouchDevice ? {
    ...listeners,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  } : listeners;

  return (
    <div className="relative">
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
        {isTouchDevice && isDragReady && (
          <div className="absolute inset-0 bg-green-200/30 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-xs font-medium text-green-700 bg-white px-2 py-1 rounded shadow-sm">
              Ready to drag
            </div>
          </div>
        )}

        <div className={`
          w-8 h-8 sm:w-10 sm:h-10 ${colors.emoji} rounded-full
          flex items-center justify-center flex-shrink-0
          group-hover:scale-110 transition-transform duration-200
          shadow-sm pointer-events-none
        `}>
          <span className="text-lg sm:text-xl filter drop-shadow-sm">{plant.emoji}</span>
        </div>

        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base font-semibold text-gray-800 truncate">
              {plant.name}
            </span>
            <span className="text-xs text-gray-500 bg-white/70 px-1.5 sm:px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
              {plant.size}x{plant.size}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-xs sm:text-sm text-gray-600 capitalize font-medium">
              {plant.category}
            </span>

            <div className="flex items-center gap-1 pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
              {onPlantRow && (
                <button
                  className="
                    w-6 h-6 bg-blue-100 hover:bg-blue-200 active:bg-blue-300
                    rounded-full flex items-center justify-center transition-all duration-200
                    cursor-pointer z-10 touch-manipulation
                    hover:scale-110 active:scale-95 flex-shrink-0
                  "
                  onClick={handleRowPlantClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={handleActionTouchStart}
                  title="Plant in row"
                  type="button"
                >
                  <Grid className="w-3 h-3 text-blue-600" />
                </button>
              )}

              {showEditButton && onEdit && (
                <button
                  className="
                    w-6 h-6 bg-orange-100 hover:bg-orange-200 active:bg-orange-300
                    rounded-full flex items-center justify-center transition-all duration-200
                    cursor-pointer z-10 touch-manipulation
                    hover:scale-110 active:scale-95 flex-shrink-0
                  "
                  onClick={handleEditClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={handleActionTouchStart}
                  title="Edit plant"
                  type="button"
                >
                  <Edit3 className="w-3 h-3 text-orange-600" />
                </button>
              )}

              <button
                className="
                  w-6 h-6 bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                  rounded-full flex items-center justify-center transition-all duration-200
                  cursor-pointer z-10 touch-manipulation
                  hover:scale-110 active:scale-95 flex-shrink-0
                "
                onClick={handleInfoClick}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={handleActionTouchStart}
                title="View plant info"
                type="button"
              >
                <Info className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
