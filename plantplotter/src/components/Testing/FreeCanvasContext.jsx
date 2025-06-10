'use client';
import { createContext, useState } from 'react';
import FreeCanvas, { useAddPlantToCanvas } from './FreeCanvas';

export const CanvasContext = createContext();

export default function FreeCanvasWithContext() {
  const [plants, setPlants] = useState([]);
  const addPlant = useAddPlantToCanvas(setPlants);

  return (
    <CanvasContext.Provider value={{ plants, setPlants, addPlant }}>
      <FreeCanvas plants={plants} setPlants={setPlants} />
    </CanvasContext.Provider>
  );
}