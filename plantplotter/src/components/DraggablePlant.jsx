'use client';
import { useDraggable } from '@dnd-kit/core';

export default function DraggablePlant({ id, emoji, name, x, y, onMove }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = {
    position: 'absolute',
    left: x,
    top: y,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : 'none',
    transition: transform ? 'none' : 'transform 0.2s ease',
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="cursor-move px-2 py-1 bg-white border rounded shadow text-sm"
    >
      {emoji} {name}
    </div>
  );
}
