'use client';
import { useDraggable } from '@dnd-kit/core';

function DraggablePlantSource({ type }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: type });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="w-full px-4 py-2 bg-green-100 rounded hover:bg-green-200 cursor-move"
    >
      🌱 {type}
    </div>
  );
}

export default function PlantSelector() {
  const plants = ['Tomato', 'Carrot', 'Lettuce'];

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-2">Select a Plant</h2>
      {plants.map((plant, idx) => (
        <DraggablePlantSource key={idx} type={plant} />
      ))}
    </div>
  );
}
