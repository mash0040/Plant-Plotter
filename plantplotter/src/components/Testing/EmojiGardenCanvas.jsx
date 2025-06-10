'use client';
import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const scale = 50;
const canvasWidth = 1200;
const canvasHeight = 600;

const PLANT_LIST = [
  { id: 'tomato', emoji: '🍅' },
  { id: 'strawberry', emoji: '🍓' },
  { id: 'carrot', emoji: '🥕' },
];

export default function GardenPlannerPage() {
  const [plants, setPlants] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [plantToAdd, setPlantToAdd] = useState(null);
  const canvasRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const saved = localStorage.getItem('gardenLayout');
    if (saved) setPlants(JSON.parse(saved));
  }, []);

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    const found = PLANT_LIST.find((p) => p.id === active.id);
    if (found) setPlantToAdd(found);
  };

  const handleDragEnd = (event) => {
    const { over, activatorEvent } = event;
    if (!over || over.id !== 'garden-canvas') {
      setActiveId(null);
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = activatorEvent.clientX - canvasRect.left;
    const y = activatorEvent.clientY - canvasRect.top;

    const snappedX = Math.round(x / scale) * scale;
    const snappedY = Math.round(y / scale) * scale;

    const newPlant = {
      id: `plant-${Date.now()}`,
      emoji: plantToAdd.emoji,
      x: snappedX,
      y: snappedY,
    };

    const updated = [...plants, newPlant];
    setPlants(updated);
    localStorage.setItem('gardenLayout', JSON.stringify(updated));

    setActiveId(null);
    setPlantToAdd(null);
  };

  const handleClear = () => {
    setPlants([]);
    localStorage.removeItem('gardenLayout');
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <h3 className="text-lg font-semibold font-[\'Playfair Display SC\']">🌿 Plants</h3>
          {PLANT_LIST.map((plant) => (
            <PlantPaletteItem key={plant.id} plant={plant} />
          ))}
          <button
            onClick={handleClear}
            className="mt-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 w-full"
          >
            Clear Garden
          </button>
        </div>

        {/* Canvas Area */}
        <div
          id="garden-canvas"
          ref={canvasRef}
          className="relative bg-green-50 border w-full max-w-[1200px] h-[600px]"
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

          {/* Render placed plants */}
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="absolute text-2xl cursor-move select-none"
              style={{ left: plant.x, top: plant.y }}
              title="Double click to remove"
              onDoubleClick={() => {
                const updated = plants.filter((p) => p.id !== plant.id);
                setPlants(updated);
                localStorage.setItem('gardenLayout', JSON.stringify(updated));
              }}
            >
              {plant.emoji}
            </div>
          ))}
        </div>

        <DragOverlay>
          {plantToAdd && (
            <div className="text-3xl pointer-events-none">{plantToAdd.emoji}</div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

function PlantPaletteItem({ plant }) {
  const { attributes, listeners, setNodeRef } = useSortable({ id: plant.id });

  const style = {
    transform: CSS.Transform.toString(attributes.transform),
    transition: attributes.transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="cursor-pointer text-center bg-white border rounded px-3 py-2 hover:bg-green-100"
    >
      {plant.emoji} {plant.id.charAt(0).toUpperCase() + plant.id.slice(1)}
    </div>
  );
}
