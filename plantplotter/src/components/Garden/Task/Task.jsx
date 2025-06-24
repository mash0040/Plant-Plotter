'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Task({ id, name, emoji }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border px-4 py-2 rounded mb-2 shadow-sm flex items-center gap-2 text-lg"
    >
      <span className="text-2xl">{emoji}</span>
      {name}
    </div>
  );
}