'use client';
import React, { useState } from 'react';
import GridWrapper from '@/components/GridWrapper';
import Info from '@/components/Info';
import SortableItem from '@/components/SortableItem';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import DraggablePlant from '@/components/DraggablePlant';

export default function $Page() {
  const [plants, setPlants] = useState([]); // start empty
  const [plantInput, setPlantInput] = useState('');

  const canvasWidth = 1000;
  const canvasHeight = 600;
  const scale = 50;

  const sensors = useSensors(useSensor(PointerSensor));

  // const handleDragEnd = (event) => {
  //   const { active, over } = event;
  //   if (active.id !== over?.id) {
  //     setPlants((items) => {
  //       const oldIndex = items.findIndex((p) => p.id === active.id);
  //       const newIndex = items.findIndex((p) => p.id === over?.id);
  //       return arrayMove(items, oldIndex, newIndex);
  //     });
  //   }
  // };

  const handleDragEnd = (event) => {
    const { active, delta } = event;

    setPlants((prev) =>
      prev.map((plant) => {
        if (plant.id === active.id) {
          const newX = (plant.x || 0) + delta.x;
          const newY = (plant.y || 0) + delta.y;
          return { ...plant, x: newX, y: newY };
        }
        return plant;
      })
    );
  };

  const handleAddPlant = () => {
    if (!plantInput.trim()) return;
    const emojiMap = {
      tomato: '🍅',
      carrot: '🥕',
      strawberry: '🍓'
    };
    const name = plantInput.trim();
    const emoji = emojiMap[name.toLowerCase()] || '🌿';
    setPlants([...plants, { id: Date.now().toString(), name, emoji }]);
    setPlantInput('');
  };

  return (
    <div className="flex h-screen p-6 gap-6">
      <div className="w-80 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">PlantPlotter Masonry Grid</h1>
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Add plant name (e.g. Tomato)"
            value={plantInput}
            onChange={(e) => setPlantInput(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          <button onClick={handleAddPlant} className="bg-green-600 text-white px-4 py-2 rounded">
            Add
          </button>
        </div>
      </div>

      <div  className="flex-1 flex flex-col gap-4">
        <Info>
          Drag and drop your plants! This grid allows custom size styling and sorting.
        </Info>

        <div
          className="relative border bg-green-50 rounded"
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
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

          <GridWrapper $variablesizes>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={plants.map((p) => p.id)} strategy={rectSortingStrategy}>
                {/* {plants.map((plant) => (
                  <SortableItem key={plant.id} id={plant.id} label={`${plant.emoji} ${plant.name}`} />
                ))} */}
                {plants.map((plant) => (
                  <DraggablePlant
                    key={plant.id}
                    id={plant.id}
                    emoji={plant.emoji}
                    name={plant.name}
                    x={plant.x || 0}
                    y={plant.y || 0}
                    onMove={(id, newX, newY) => {
                      setPlants((prev) =>
                        prev.map((p) =>
                          p.id === id ? { ...p, x: newX, y: newY } : p
                        )
                      );
                    }}
                  />
                ))}

              </SortableContext>
            </DndContext>
          </GridWrapper>
        </div>
      </div>
    </div>
  );
}
