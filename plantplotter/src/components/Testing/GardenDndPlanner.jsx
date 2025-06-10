'use client';
import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import Column from './Column/Column';
import Input from './Input/Input';

export default function GardenDndPlanner() {
//   const [plants, setPlants] = useState([
//     { id: 1, name: 'Tomato', emoji: '🍅' },
//     { id: 2, name: 'Carrot', emoji: '🥕' },
//     { id: 3, name: 'Strawberry', emoji: '🍓' },
//   ]);
  const [plants, setPlants] = useState([]);
  

  const addPlant = (name) => {
    const emojiMap = {
      tomato: '🍅',
      carrot: '🥕',
      strawberry: '🍓',
    };
    const id = plants.length + 1;
    const emoji = emojiMap[name.toLowerCase()] || '🌱';
    setPlants((plants) => [...plants, { id, name, emoji }]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getPlantPos = (id) => plants.findIndex((p) => p.id === id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPlants((plants) => {
      const oldIndex = getPlantPos(active.id);
      const newIndex = getPlantPos(over.id);
      return arrayMove(plants, oldIndex, newIndex);
    });
  };

  return (
    <div className="flex p-6">
      <Input onSubmit={addPlant} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <Column id="garden" tasks={plants} />
      </DndContext>
    </div>
  );
}