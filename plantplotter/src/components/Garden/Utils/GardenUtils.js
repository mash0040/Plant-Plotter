export const getPlantFootprint = (plant = {}) => {
  if (!plant || typeof plant !== 'object') {
    return 1;
  }

  const footprint = Number(plant.size ?? plant.plant_size);
  return Number.isFinite(footprint) && footprint > 0 ? Math.max(1, Math.round(footprint)) : 1;
};

export const snapToGrid = (value, gridSize) => {
  return Math.round(value / gridSize) * gridSize;
};

export const isWithinBounds = (plant, dimensions, gridSize) => {
  const plantSize = getPlantFootprint(plant) * gridSize;
  const maxX = (dimensions.width * gridSize) - plantSize;
  const maxY = (dimensions.height * gridSize) - plantSize;
  
  return plant.x >= 0 && 
         plant.y >= 0 && 
         plant.x <= maxX && 
         plant.y <= maxY;
};

export const checkPlantOverlap = (newPlant, existingPlants, gridSize) => {
  const newSize = getPlantFootprint(newPlant) * gridSize;
  
  return existingPlants.some(existing => {
    const existingSize = getPlantFootprint(existing) * gridSize;
    
    // Check if rectangles overlap
    return !(newPlant.x >= existing.x + existingSize ||
             existing.x >= newPlant.x + newSize ||
             newPlant.y >= existing.y + existingSize ||
             existing.y >= newPlant.y + newSize);
  });
};
