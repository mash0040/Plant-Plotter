'use client';
import { useState } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter
} from '@dnd-kit/core';

const GRID_SIZE = 10; // 10x10 grid

function GridCell({ x, y, plant }) {
  const id = `${x}-${y}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`aspect-square w-full border border-gray-400 flex items-center justify-center ${
        isOver ? 'bg-green-100' : 'bg-white'
      }`}
      data-x={x}
      data-y={y}
    >
      {plant && <DraggablePlant type={plant.type} id={plant.id} />}
    </div>
  );
}

function DraggablePlant({ type, id }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="w-10 h-10 bg-green-600 text-white text-xs rounded-full flex items-center justify-center cursor-move"
      style={style}
    >
      {type[0]}
    </div>
  );
}

export default function CanvasGrid() {
  const [plants, setPlants] = useState([]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const [x, y] = over.id.split('-').map(Number);
    const existing = plants.find(p => p.id === active.id);

    if (existing) {
      setPlants(plants.map(p => (p.id === active.id ? { ...p, x, y } : p)));
    } else {
      setPlants([...plants, { id: `${Date.now()}`, type: active.id, x, y }]);
    }
  }

  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const plant = plants.find(p => p.x === x && p.y === y);
      grid.push(<GridCell key={`${x}-${y}`} x={x} y={y} plant={plant} />);
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        {grid}
      </div>
    </DndContext>
  );
}