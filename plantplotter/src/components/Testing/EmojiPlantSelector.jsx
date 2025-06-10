'use client';
import { useDraggable } from '@dnd-kit/core';

function DraggableEmoji({ emoji, label }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: emoji });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="w-full py-2 text-lg bg-white border rounded text-center cursor-pointer hover:bg-green-100"
    >
      <span>{emoji}</span> <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

export default function EmojiPlantSelector() {
  const plants = [
    { label: 'Tomato', emoji: '🍅' },
    { label: 'Strawberry', emoji: '🍓' },
    { label: 'Carrot', emoji: '🥕' },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">🌱 Plants</h3>
      {plants.map((plant) => (
        <DraggableEmoji key={plant.emoji} emoji={plant.emoji} label={plant.label} />
      ))}
    </div>
  );
}