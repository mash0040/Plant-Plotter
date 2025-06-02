// 'use client';
// import CanvasGrid from '@/components/CanvasGrid';
// import PlantSelector from '@/components/PlantSelector';

// export default function GardenPage() {
//   return (
//     <div className="p-4 flex gap-4">
//       <div className="w-1/4">
//         <PlantSelector />
//       </div>
//       <div className="w-3/4">
//         <h1 className="text-xl font-bold mb-2">Garden Planner</h1>
//         <CanvasGrid />
//       </div>
//     </div>
//   );
// }

'use client';
import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import EmojiPlantSelector from '@/components/EmojiPlantSelector';
import EmojiGardenCanvas from '@/components/EmojiGardenCanvas';

export default function GardenPage() {
  const [plants, setPlants] = useState([]);
  const [draggedPlant, setDraggedPlant] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragStart(event) {
    const { active } = event;
    if (!active || !active.id) return;

    const plant = plants.find(p => p.id === active.id);
    if (plant) {
      setDraggedPlant(plant); // existing plant
    } else {
      setDraggedPlant({ emoji: active.id }); // new from sidebar
    }
  }

  function handleDragEnd(event) {
    const { active, activatorEvent } = event;
    const canvas = document.getElementById('emoji-canvas');
    const rect = canvas.getBoundingClientRect();

    const x = activatorEvent.clientX - rect.left - 20;
    const y = activatorEvent.clientY - rect.top - 20;

    let updated;
    if (plants.find(p => p.id === active.id)) {
      updated = plants.map(p => p.id === active.id ? { ...p, x, y } : p);
    } else {
      updated = [...plants, { id: Date.now().toString(), emoji: active.id, x, y }];
    }

    setPlants(updated);
    localStorage.setItem('gardenLayout', JSON.stringify(updated));
    setDraggedPlant(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 flex gap-6">
        <div className="w-1/4">
          <EmojiPlantSelector />
        </div>
        <div className="w-3/4">
          <EmojiGardenCanvas
            plants={plants}
            setPlants={setPlants}
            draggedPlant={draggedPlant}
          />
        </div>
      </div>

      <DragOverlay>
        {draggedPlant && (
          <div className="w-10 h-10 text-2xl flex items-center justify-center">
            {draggedPlant.emoji}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}