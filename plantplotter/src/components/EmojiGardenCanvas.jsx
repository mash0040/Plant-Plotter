'use client';
import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  useDroppable,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable
} from '@dnd-kit/core';

const scale = 50;
const canvasWidth = 1200;
const canvasHeight = 600;

export default function EmojiGardenCanvas() {
  const [plants, setPlants] = useState([]);
  const [draggedPlant, setDraggedPlant] = useState(null);
  const canvasRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const { setNodeRef } = useDroppable({ id: 'garden-canvas' });

  useEffect(() => {
    const saved = localStorage.getItem('gardenLayout');
    if (saved) {
      setPlants(JSON.parse(saved));
    }
  }, []);

  function handleDragStart(event) {
    const { active } = event;
    if (!active || !active.id) return;

    const plant = plants.find(p => p.id === active.id);
    if (plant) {
      setDraggedPlant(plant);
    } else {
      setDraggedPlant({ emoji: active.id });
    }
  }

  function handleDragEnd(event) {
    const { active, over, activatorEvent } = event;
    if (!over || over.id !== 'garden-canvas' || !draggedPlant) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('Canvas not ready during drop');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = activatorEvent.clientX - rect.left - 20;
    const y = activatorEvent.clientY - rect.top - 20;

    const isExisting = plants.find(p => p.id === active.id);
    const updatedPlants = isExisting
      ? plants.map(p => p.id === active.id ? { ...p, x, y } : p)
      : [...plants, { id: Date.now().toString(), emoji: draggedPlant.emoji, x, y }];

    setPlants(updatedPlants);
    localStorage.setItem('gardenLayout', JSON.stringify(updatedPlants));
    setDraggedPlant(null);
  }

  function handleClear() {
    setPlants([]);
    localStorage.removeItem('gardenLayout');
  }

  function handleDelete(id) {
    const updated = plants.filter(p => p.id !== id);
    setPlants(updated);
    localStorage.setItem('gardenLayout', JSON.stringify(updated));
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mb-4 text-right">
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Garden
        </button>
      </div>

      <div
        id="garden-canvas"
        ref={(el) => {
          canvasRef.current = el;
          setNodeRef(el);
        }}
        className="relative w-full max-w-[1200px] h-[600px] bg-green-50 border"
      >
        {/* Grid lines */}
        {Array.from({ length: canvasWidth / scale }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 h-full border-l border-gray-300"
            style={{ left: `${i * scale}px`, width: '1px' }}
          />
        ))}
        {Array.from({ length: canvasHeight / scale }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 w-full border-t border-gray-300"
            style={{ top: `${i * scale}px`, height: '1px' }}
          />
        ))}

        {plants.map((plant) => (
          <DraggablePlant
            key={plant.id}
            id={plant.id}
            emoji={plant.emoji}
            x={plant.x}
            y={plant.y}
            onDelete={() => handleDelete(plant.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {draggedPlant?.emoji && (
          <div
            className="w-10 h-10 text-2xl flex items-center justify-center"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            {draggedPlant.emoji}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DraggablePlant({ id, emoji, x, y, onDelete }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="absolute text-2xl select-none cursor-move"
      style={{ left: x, top: y }}
      onDoubleClick={onDelete}
      title="Double click to remove"
    >
      {emoji}
    </div>
  );
}