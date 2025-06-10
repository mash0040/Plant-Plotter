'use client';
import { useState, useRef } from 'react';

export default function FreeCanvas() {
  const [plants, setPlants] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const canvasRef = useRef(null);

  const handleMouseDown = (e, id) => {
    setDraggingId(id);
  };

  const handleMouseMove = (e) => {
    if (!draggingId) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - 20;
    const y = e.clientY - canvasRect.top - 20;
    setPlants((prev) =>
      prev.map((plant) =>
        plant.id === draggingId ? { ...plant, x, y } : plant
      )
    );
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-[500px] border border-black bg-green-50 rounded overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {plants.map((plant) => (
        <div
          key={plant.id}
          onMouseDown={(e) => handleMouseDown(e, plant.id)}
          className="absolute w-10 h-10 bg-green-600 text-white text-xs rounded-full flex items-center justify-center cursor-move"
          style={{ left: plant.x, top: plant.y }}
        >
          {plant.type[0]}
        </div>
      ))}
    </div>
  );
}

export function useAddPlantToCanvas(setPlants) {
  return function addPlant(type) {
    setPlants((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type,
        x: 50 + Math.random() * 300,
        y: 50 + Math.random() * 300,
      },
    ]);
  };
}