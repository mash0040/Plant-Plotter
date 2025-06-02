'use client';
import { useDraggable } from '@dnd-kit/core';

function DraggableEmoji({ emoji }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: emoji });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="w-full py-2 text-lg bg-white border rounded text-center cursor-pointer hover:bg-green-100"
    >
      {emoji}
    </div>
  );
}

export default function EmojiPlantSelector() {
  const plants = ['🍅 Tomato', '🍓Strawberry', '🥕Carrot'];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">🌱 Plants</h3>
      {plants.map((emoji) => (
        <DraggableEmoji key={emoji} emoji={emoji} />
      ))}
    </div>
  );
}