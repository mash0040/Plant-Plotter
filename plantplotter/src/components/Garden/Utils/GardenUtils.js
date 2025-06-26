export const snapToGrid = (value, gridSize) => {
  return Math.round(value / gridSize) * gridSize;
};

export const isWithinBounds = (plant, dimensions, gridSize) => {
  const plantSize = (plant.size || 1) * gridSize;
  const maxX = (dimensions.width * gridSize) - plantSize;
  const maxY = (dimensions.height * gridSize) - plantSize;
  
  return plant.x >= 0 && 
         plant.y >= 0 && 
         plant.x <= maxX && 
         plant.y <= maxY;
};

export const checkPlantOverlap = (newPlant, existingPlants, gridSize) => {
  const newSize = (newPlant.size || 1) * gridSize;
  
  return existingPlants.some(existing => {
    const existingSize = (existing.size || 1) * gridSize;
    
    // Check if rectangles overlap
    return !(newPlant.x >= existing.x + existingSize ||
             existing.x >= newPlant.x + newSize ||
             newPlant.y >= existing.y + existingSize ||
             existing.y >= newPlant.y + newSize);
  });
};