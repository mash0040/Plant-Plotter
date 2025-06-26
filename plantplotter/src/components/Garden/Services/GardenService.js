export class GardenService {
  static async saveGarden(gardenData) {
    try {
      const response = await fetch('/api/gardens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: gardenData.name,
          width: gardenData.width,
          height: gardenData.height,
          gridSize: gardenData.gridSize,
          plantedItems: gardenData.plantedItems.map(plant => ({
            plantId: plant.plantId || plant.id.replace('plant-', ''),
            plantName: plant.name,
            plantEmoji: plant.emoji,
            plantSize: plant.size,
            xPosition: Math.round(plant.x / gardenData.gridSize), // Convert px to grid units
            yPosition: Math.round(plant.y / gardenData.gridSize), // Convert px to grid units
            plantedDate: plant.plantedDate || new Date(),
            notes: plant.notes || ''
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save garden');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving garden:', error);
      throw error;
    }
  }

  static async loadGarden(gardenId) {
    try {
      const response = await fetch(`/api/gardens/${gardenId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load garden');
      }

      const gardenData = await response.json();
      
      // Convert database format back to component format
      return {
        ...gardenData,
        placedPlants: gardenData.plantedItems.map(item => ({
          id: `plant-${item.id}`,
          plantId: item.plantId,
          name: item.plantName,
          emoji: item.plantEmoji,
          size: item.plantSize,
          x: item.xPosition * gardenData.gridSize, // Convert grid units back to pixels
          y: item.yPosition * gardenData.gridSize,
          plantedDate: new Date(item.plantedDate),
          notes: item.notes
        }))
      };
    } catch (error) {
      console.error('Error loading garden:', error);
      throw error;
    }
  }

  static async getUserGardens(userId) {
    try {
      const response = await fetch(`/api/gardens?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load gardens');
      }

      return await response.json();
    } catch (error) {
      console.error('Error loading gardens:', error);
      throw error;
    }
  }

  static async deleteGarden(gardenId) {
    try {
      const response = await fetch(`/api/gardens/${gardenId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete garden');
      }

      return true;
    } catch (error) {
      console.error('Error deleting garden:', error);
      throw error;
    }
  }
}