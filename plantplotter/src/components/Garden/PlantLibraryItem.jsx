'use client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export default function PlantLibraryItem({ plant }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${plant.id}`,
    data: { ...plant, isFromLibrary: true }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 border border-gray-200
        ${isDragging ? 'z-50' : ''}
      `}
    >
      <span className="text-xl">{plant.emoji}</span>
      <span className="text-sm font-medium">{plant.name}</span>
      <span className="ml-auto text-xs text-gray-500">
        {plant.size}x{plant.size}
      </span>
    </div>
  );
}