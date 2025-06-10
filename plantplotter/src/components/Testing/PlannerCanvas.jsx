'use client';
import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

export default function PlannerCanvas({ gardenId }) {
  const canvasRef = useRef(null);
  const canvasInstance = useRef(null);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 500,
      backgroundColor: '#f0fdf4',
      selection: true
    });
    canvasInstance.current = canvas;

    // Draw grid
    const gridSize = 20;
    for (let i = 0; i < (canvas.width / gridSize); i++) {
      canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, canvas.height], {
        stroke: '#ccc', selectable: false }));
    }
    for (let i = 0; i < (canvas.height / gridSize); i++) {
      canvas.add(new fabric.Line([0, i * gridSize, canvas.width, i * gridSize], {
        stroke: '#ccc', selectable: false }));
    }

    // Load saved layout if available
    const saved = localStorage.getItem(`garden-${gardenId}`);
    if (saved) {
      canvas.loadFromJSON(saved, canvas.renderAll.bind(canvas));
    }

    // Listen for 'plant-add' events
    const handleAdd = (e) => {
      const plant = e.detail.plant;
      const shape = new fabric.Circle({
        radius: 20,
        fill: 'green',
        left: 100 + Math.random() * 400,
        top: 50 + Math.random() * 300,
        label: plant
      });
      shape.set({
        hasControls: true,
        lockScalingFlip: true,
        lockUniScaling: true
      });
      canvas.add(shape);
    };
    document.addEventListener('plant-add', handleAdd);

    return () => {
      document.removeEventListener('plant-add', handleAdd);
    };
  }, [gardenId]);

  const handleSave = () => {
    const layout = canvasInstance.current.toJSON();
    localStorage.setItem(`garden-${gardenId}`, JSON.stringify(layout));
    alert('Garden layout saved!');
  };

  return (
    <div>
      <canvas ref={canvasRef} className="border" />
      <button
        onClick={handleSave}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Save Garden
      </button>
    </div>
  );
}