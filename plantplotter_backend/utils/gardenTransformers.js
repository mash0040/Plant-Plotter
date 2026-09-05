const DEFAULT_SOIL_TYPE = 'Loamy';
const DEFAULT_STATUS = 'Active';

const normalizeOptionalLocation = (location) => (
  typeof location === 'string' && location.trim() ? location.trim() : null
);

const buildCompletePlantData = (gardenId, plant) => ({
  garden_id: parseInt(gardenId),
  plant_id: String(plant.plant_id || 'unknown').substring(0, 100),
  plant_name: String(plant.plant_name || 'Unknown Plant').substring(0, 255),
  plant_emoji: String(plant.plant_emoji || '🌱').substring(0, 10),
  plant_size: Math.max(1, parseInt(plant.plant_size) || 1),
  plant_category: String(plant.plant_category || 'other').substring(0, 100),
  x_position: Math.max(0, parseInt(plant.x_position) || 0),
  y_position: Math.max(0, parseInt(plant.y_position) || 0),
  planted_date: plant.planted_date || new Date().toISOString().split('T')[0],
  notes: String(plant.notes || '').substring(0, 1000)
});

const buildSinglePlantData = (gardenId, plantData) => ({
  garden_id: parseInt(gardenId),
  plant_id: plantData.plant_id || 'unknown',
  plant_name: plantData.plant_name.trim(),
  plant_emoji: plantData.plant_emoji || '🌱',
  plant_size: parseInt(plantData.plant_size) || 1,
  plant_category: plantData.plant_category || 'other',
  x_position: parseInt(plantData.x_position) || 0,
  y_position: parseInt(plantData.y_position) || 0,
  notes: (plantData.notes || '').trim(),
  planted_date: new Date().toISOString().split('T')[0]
});

const transformPlantedItem = (plant) => ({
  id: plant.id,
  plantId: plant.plant_id,
  name: plant.plant_name,
  emoji: plant.plant_emoji,
  size: plant.plant_size || 1,
  category: plant.plant_category,
  xPosition: plant.x_position,
  yPosition: plant.y_position,
  plantedDate: plant.planted_date || plant.created_at,
  notes: plant.notes,
  created_at: plant.created_at,
  updated_at: plant.updated_at
});

const generateGardenSummary = (garden, plantedItems = []) => {
  const summary = {
    totalPlants: plantedItems.length,
    plantCategories: {},
    totalArea: garden.width * garden.height,
    usedSpace: 0,
    plantsByCategory: {},
    lastPlantedDate: null,
    averagePlantSize: 0
  };

  if (plantedItems.length > 0) {
    let totalSize = 0;
    let latestDate = null;

    plantedItems.forEach((plant) => {
      const category = plant.plant_category || 'other';
      const size = plant.plant_size || 1;

      summary.plantCategories[category] = (summary.plantCategories[category] || 0) + 1;

      if (!summary.plantsByCategory[category]) {
        summary.plantsByCategory[category] = [];
      }
      summary.plantsByCategory[category].push({
        name: plant.plant_name,
        emoji: plant.plant_emoji,
        size
      });

      summary.usedSpace += size * size;
      totalSize += size;

      const plantDate = new Date(plant.planted_date || plant.created_at);
      if (!latestDate || plantDate > latestDate) {
        latestDate = plantDate;
      }
    });

    summary.averagePlantSize = Math.round((totalSize / plantedItems.length) * 10) / 10;
    summary.lastPlantedDate = latestDate;
    summary.spaceUtilization = Math.round((summary.usedSpace / summary.totalArea) * 100);
  } else {
    summary.spaceUtilization = 0;
  }

  return summary;
};

const generateRecommendations = (garden, plantedItems = []) => {
  const recommendations = [];
  const totalArea = garden.width * garden.height;
  const usedSpace = plantedItems.reduce((sum, plant) => {
    const size = plant.plant_size || 1;
    return sum + (size * size);
  }, 0);
  const utilizationPercentage = totalArea > 0 ? (usedSpace / totalArea) * 100 : 0;

  if (utilizationPercentage < 30) {
    recommendations.push({
      type: 'space',
      priority: 'medium',
      message: 'Your garden has plenty of space! Consider adding more plants.',
      suggestion: 'Add companion plants or try vertical gardening techniques.'
    });
  } else if (utilizationPercentage > 80) {
    recommendations.push({
      type: 'space',
      priority: 'high',
      message: 'Your garden is getting crowded. Consider spacing or pruning.',
      suggestion: 'Remove some plants or expand your garden area.'
    });
  }

  const categories = new Set(plantedItems.map((plant) => plant.plant_category));
  if (categories.size < 2 && plantedItems.length > 0) {
    recommendations.push({
      type: 'diversity',
      priority: 'low',
      message: 'Consider adding variety to your garden.',
      suggestion: 'Try planting different categories like herbs, vegetables, or flowers.'
    });
  }

  if (plantedItems.length > 10) {
    recommendations.push({
      type: 'maintenance',
      priority: 'medium',
      message: 'With many plants, regular maintenance is important.',
      suggestion: 'Create a watering and fertilizing schedule.'
    });
  }

  return recommendations;
};

const transformGardenForList = (garden, plantedItems = []) => ({
  id: garden.id,
  name: garden.name,
  description: garden.description || '',
  width: garden.width,
  height: garden.height,
  dimensions: {
    width: garden.width,
    height: garden.height
  },
  soil_type: garden.soil_type || DEFAULT_SOIL_TYPE,
  soilType: garden.soil_type || DEFAULT_SOIL_TYPE,
  location: normalizeOptionalLocation(garden.location),
  status: garden.status || DEFAULT_STATUS,
  plant_count: plantedItems.length,
  plantCount: plantedItems.length,
  created_at: garden.created_at,
  createdAt: garden.created_at,
  updated_at: garden.updated_at,
  updatedAt: garden.updated_at,
  plantedItems: plantedItems.map(transformPlantedItem)
});

const transformGardenSummary = (garden) => ({
  id: garden.id,
  name: garden.name,
  description: garden.description || '',
  width: garden.width,
  height: garden.height,
  dimensions: {
    width: garden.width,
    height: garden.height
  },
  soil_type: garden.soil_type || DEFAULT_SOIL_TYPE,
  soilType: garden.soil_type || DEFAULT_SOIL_TYPE,
  location: normalizeOptionalLocation(garden.location),
  status: garden.status || DEFAULT_STATUS,
  plant_count: Number(garden.plant_count) || 0,
  plantCount: Number(garden.plant_count) || 0,
  created_at: garden.created_at,
  createdAt: garden.created_at,
  updated_at: garden.updated_at,
  updatedAt: garden.updated_at
});

const transformGardenWithSummary = (garden, plantedItems = []) => ({
  id: garden.id,
  name: garden.name,
  description: garden.description || '',
  width: garden.width,
  height: garden.height,
  soil_type: garden.soil_type || DEFAULT_SOIL_TYPE,
  location: normalizeOptionalLocation(garden.location),
  status: garden.status || DEFAULT_STATUS,
  plant_count: plantedItems.length,
  created_at: garden.created_at,
  updated_at: garden.updated_at,
  plantedItems: plantedItems.map(transformPlantedItem),
  summary: generateGardenSummary(garden, plantedItems)
});

const transformDetailedGarden = (garden, plantedItems = []) => {
  const gardenWithSummary = transformGardenWithSummary(garden, plantedItems);

  gardenWithSummary.analytics = {
    plantingHistory: plantedItems.map((plant) => ({
      date: plant.planted_date || plant.created_at,
      plantName: plant.plant_name,
      category: plant.plant_category
    })).sort((firstPlant, secondPlant) => new Date(secondPlant.date) - new Date(firstPlant.date)),
    categoryBreakdown: gardenWithSummary.summary.plantCategories,
    spaceAnalysis: {
      totalArea: garden.width * garden.height,
      usedSpace: gardenWithSummary.summary.usedSpace,
      availableSpace: (garden.width * garden.height) - gardenWithSummary.summary.usedSpace,
      utilizationPercentage: gardenWithSummary.summary.spaceUtilization
    },
    recommendations: generateRecommendations(garden, plantedItems)
  };

  return gardenWithSummary;
};

const transformCreatedGarden = (garden) => ({
  id: garden.id,
  name: garden.name,
  description: garden.description || '',
  width: garden.width,
  height: garden.height,
  dimensions: { width: garden.width, height: garden.height },
  soil_type: garden.soil_type,
  soilType: garden.soil_type,
  location: normalizeOptionalLocation(garden.location),
  status: garden.status,
  plant_count: 0,
  plantCount: 0,
  plantedItems: [],
  created_at: garden.created_at,
  createdAt: garden.created_at,
  updated_at: garden.updated_at,
  updatedAt: garden.updated_at
});

const transformUpdatedGarden = (garden) => ({
  id: garden.id,
  name: garden.name,
  description: garden.description || '',
  width: garden.width,
  height: garden.height,
  dimensions: { width: garden.width, height: garden.height },
  soil_type: garden.soil_type,
  soilType: garden.soil_type,
  location: normalizeOptionalLocation(garden.location),
  status: garden.status,
  plant_count: garden.plant_count || 0,
  plantCount: garden.plant_count || 0,
  created_at: garden.created_at,
  createdAt: garden.created_at,
  updated_at: garden.updated_at,
  updatedAt: garden.updated_at
});

module.exports = {
  buildCompletePlantData,
  buildSinglePlantData,
  generateGardenSummary,
  generateRecommendations,
  transformCreatedGarden,
  transformDetailedGarden,
  transformGardenForList,
  transformGardenSummary,
  transformGardenWithSummary,
  transformPlantedItem,
  transformUpdatedGarden
};
