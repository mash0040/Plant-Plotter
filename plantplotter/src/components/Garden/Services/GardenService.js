export class GardenService {
  static async saveGarden(gardenData) {
    try {
      const url = gardenData.id ? `/api/gardens/${gardenData.id}` : '/api/gardens';
      const method = gardenData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: gardenData.name,
          width: gardenData.width,
          height: gardenData.height,
          gridSize: gardenData.gridSize,
          soilType: gardenData.soilType || 'Loamy',
          location: gardenData.location || 'Garden',
          status: gardenData.status || 'Active',
          plantedItems: gardenData.plantedItems.map(plant => ({
            plantId: plant.plantId || plant.id.replace('plant-', ''),
            plantName: plant.name,
            plantEmoji: plant.emoji,
            plantSize: plant.size,
            plantCategory: plant.category || 'other',
            xPosition: Math.round(plant.x / gardenData.gridSize), // Convert px to grid units
            yPosition: Math.round(plant.y / gardenData.gridSize), // Convert px to grid units
            plantedDate: plant.plantedDate || new Date(),
            notes: plant.notes || ''
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${gardenData.id ? 'update' : 'save'} garden`);
      }

      const savedGarden = await response.json();
      
      // Return the saved garden in a consistent format
      return {
        id: savedGarden.id,
        name: savedGarden.name,
        soilType: savedGarden.soilType,
        dimensions: {
          width: savedGarden.width,
          height: savedGarden.height
        },
        location: savedGarden.location,
        status: savedGarden.status,
        plantCount: savedGarden.plantedItems?.length || 0,
        createdAt: savedGarden.createdAt,
        updatedAt: savedGarden.updatedAt,
        plantedItems: savedGarden.plantedItems || []
      };
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
          category: item.plantCategory,
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

      const gardens = await response.json();
      
      // Convert to consistent format for the gardens list
      return gardens.map(garden => ({
        id: garden.id,
        name: garden.name,
        soilType: garden.soilType,
        dimensions: {
          width: garden.width,
          height: garden.height
        },
        location: garden.location,
        status: garden.status,
        plantCount: garden.plantedItems?.length || 0,
        createdAt: garden.createdAt,
        updatedAt: garden.updatedAt,
        plantedItems: garden.plantedItems || []
      }));
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

  // Mock implementation for development (remove when you have real backend)
  static async saveGardenMock(gardenData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const savedGarden = {
      id: gardenData.id || Date.now(),
      name: gardenData.name,
      width: gardenData.width,
      height: gardenData.height,
      gridSize: gardenData.gridSize,
      soilType: gardenData.soilType || 'Loamy',
      location: gardenData.location || 'Garden',
      status: gardenData.status || 'Active',
      plantCount: gardenData.plantedItems?.length || 0,
      createdAt: gardenData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plantedItems: gardenData.plantedItems || []
    };

    // Store in localStorage for demo purposes
    const existingGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
    const gardenIndex = existingGardens.findIndex(g => g.id === savedGarden.id);
    
    if (gardenIndex >= 0) {
      existingGardens[gardenIndex] = savedGarden;
    } else {
      existingGardens.push(savedGarden);
    }
    
    localStorage.setItem('gardens', JSON.stringify(existingGardens));
    
    return {
      id: savedGarden.id,
      name: savedGarden.name,
      soilType: savedGarden.soilType,
      dimensions: {
        width: savedGarden.width,
        height: savedGarden.height
      },
      location: savedGarden.location,
      status: savedGarden.status,
      plantCount: savedGarden.plantCount,
      createdAt: savedGarden.createdAt,
      updatedAt: savedGarden.updatedAt,
      plantedItems: savedGarden.plantedItems
    };
  }
}