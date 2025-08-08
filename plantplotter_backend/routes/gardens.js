const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const db = require("../config/db.js");

// Helper function to generate garden summary
const generateGardenSummary = (garden, plantedItems) => {
  const summary = {
    totalPlants: plantedItems.length,
    plantCategories: {},
    totalArea: garden.width * garden.height,
    usedSpace: 0,
    plantsByCategory: {},
    lastPlantedDate: null,
    averagePlantSize: 0
  };

  // Calculate plant statistics
  if (plantedItems.length > 0) {
    let totalSize = 0;
    let latestDate = null;

    plantedItems.forEach(plant => {
      const category = plant.plant_category || 'other';
      const size = plant.plant_size || 1;
      
      // Count by category
      summary.plantCategories[category] = (summary.plantCategories[category] || 0) + 1;
      
      // Track plants by category for detailed breakdown
      if (!summary.plantsByCategory[category]) {
        summary.plantsByCategory[category] = [];
      }
      summary.plantsByCategory[category].push({
        name: plant.plant_name,
        emoji: plant.plant_emoji,
        size: size
      });

      // Calculate used space (assuming square plants)
      summary.usedSpace += size * size;
      
      // Track total size for average
      totalSize += size;
      
      // Find latest planted date
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

// Helper function to transform garden data with summary
const transformGardenWithSummary = (garden, plantedItems) => {
  const summary = generateGardenSummary(garden, plantedItems);
  
  return {
    id: garden.id,
    name: garden.name,
    description: garden.description || '',
    width: garden.width,
    height: garden.height,
    soil_type: garden.soil_type || 'Loamy',
    location: garden.location || 'Backyard',
    status: garden.status || 'Active',
    plant_count: plantedItems.length,
    created_at: garden.created_at,
    updated_at: garden.updated_at,
    
    // Planted items with proper transformation
    plantedItems: plantedItems.map(plant => ({
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
    })),
    
    // Garden summary
    summary: summary
  };
};

// Data sanitization helpers
const sanitizeForDatabase = {
  string: (value, maxLength = 255, fieldName = 'field') => {
    if (value === null || value === undefined) {
      return '';
    }
    
    let cleanValue;
    
    if (typeof value === 'string') {
      if (value === '[object Object]') {
        cleanValue = fieldName === 'Garden name' ? 'My Garden' : 'Default';
      } else {
        cleanValue = value.trim();
      }
    } else if (typeof value === 'object' && value !== null) {
      if (value.name) cleanValue = String(value.name);
      else if (value.value) cleanValue = String(value.value);
      else if (value.title) cleanValue = String(value.title);
      else if (value.label) cleanValue = String(value.label);
      else {
        cleanValue = fieldName === 'Garden name' ? 'My Garden' : 'Default';
      }
    } else {
      cleanValue = String(value).trim();
    }
    
    if (cleanValue === '[object Object]' || cleanValue === 'undefined' || cleanValue === 'null') {
      cleanValue = fieldName === 'Garden name' ? 'My Garden' : 'Default';
    }
    
    if (cleanValue.length > maxLength) {
      cleanValue = cleanValue.substring(0, maxLength).trim();
    }
    
    if (!cleanValue) {
      cleanValue = fieldName === 'Garden name' ? 'My Garden' : 'Default';
    }
    
    return cleanValue;
  },
  
  number: (value, fieldName = 'number', min = 1) => {
    const num = parseInt(value);
    if (isNaN(num) || num < min) {
      throw new Error(`${fieldName} must be a number >= ${min}, received: ${value}`);
    }
    return num;
  },
  
  shortString: (value, fieldName = 'field') => {
    return sanitizeForDatabase.string(value, 50, fieldName);
  },
  
  mediumString: (value, fieldName = 'field') => {
    return sanitizeForDatabase.string(value, 100, fieldName);
  },
  
  longString: (value, fieldName = 'field') => {
    return sanitizeForDatabase.string(value, 255, fieldName);
  }
};

// GET /api/gardens - Fetch all gardens for authenticated user with summaries
router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {    
    // Get all gardens for this specific user
    const [gardens] = await db.execute(
      `SELECT 
        g.id,
        g.name,
        g.description,
        g.width,
        g.height,
        g.soil_type,
        g.location,
        g.status,
        g.created_at,
        g.updated_at
       FROM gardens g 
       WHERE g.user_id = ? 
       ORDER BY g.updated_at DESC`,
      [userId]
    );

    if (gardens.length === 0) {
      return res.json([]);
    }

    // Get all planted items for all user's gardens in one query
    const gardenIds = gardens.map(g => g.id);
    const placeholders = gardenIds.map(() => '?').join(',');
    
    const [allPlantedItems] = await db.execute(
      `SELECT 
        pi.id,
        pi.garden_id,
        pi.plant_id,
        pi.plant_name,
        pi.plant_emoji,
        pi.plant_size,
        pi.plant_category,
        pi.x_position,
        pi.y_position,
        pi.planted_date,
        pi.notes,
        pi.created_at,
        pi.updated_at
       FROM planted_items pi 
       WHERE pi.garden_id IN (${placeholders})
       ORDER BY pi.garden_id, pi.created_at DESC`,
      gardenIds
    );

    // Group planted items by garden_id
    const plantsByGarden = {};
    allPlantedItems.forEach(plant => {
      if (!plantsByGarden[plant.garden_id]) {
        plantsByGarden[plant.garden_id] = [];
      }
      plantsByGarden[plant.garden_id].push(plant);
    });

    // Transform each garden with its planted items
    const gardensWithPlants = gardens.map(garden => {
      const gardenPlants = plantsByGarden[garden.id] || [];
      
      return {
        id: garden.id,
        name: garden.name,
        description: garden.description || '',
        width: garden.width,
        height: garden.height,
        dimensions: {
          width: garden.width,
          height: garden.height
        },
        soil_type: garden.soil_type || 'Loamy',
        soilType: garden.soil_type || 'Loamy',
        location: garden.location || 'Backyard',
        status: garden.status || 'Active',
        plant_count: gardenPlants.length,
        plantCount: gardenPlants.length,
        created_at: garden.created_at,
        createdAt: garden.created_at,
        updated_at: garden.updated_at,
        updatedAt: garden.updated_at,
        
        // Planted items with proper transformation for frontend
        plantedItems: gardenPlants.map(plant => ({
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
        }))
      };
    });

    res.json(gardensWithPlants);

  } catch (err) {
    console.error(`Error fetching gardens for user ${userId}:`, err);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message,
      userId: userId 
    });
  }
});

// GET /api/gardens/:id - Get specific garden with detailed summary
router.get('/:id', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;

  try {
    // Get specific garden for this user
    const [gardens] = await db.execute(
      `SELECT 
        g.id,
        g.name,
        g.description,
        g.width,
        g.height,
        g.soil_type,
        g.location,
        g.status,
        g.created_at,
        g.updated_at
       FROM gardens g 
       WHERE g.id = ? AND g.user_id = ?`,
      [gardenId, userId]
    );

    if (gardens.length === 0) {
      return res.status(404).json({ error: 'Garden not found or access denied' });
    }

    const garden = gardens[0];

    // Get all planted items for this garden
    const [plantedItems] = await db.execute(
      `SELECT 
        pi.id,
        pi.garden_id,
        pi.plant_id,
        pi.plant_name,
        pi.plant_emoji,
        pi.plant_size,
        pi.plant_category,
        pi.x_position,
        pi.y_position,
        pi.planted_date,
        pi.notes,
        pi.created_at,
        pi.updated_at
       FROM planted_items pi 
       WHERE pi.garden_id = ?
       ORDER BY pi.created_at DESC`,
      [gardenId]
    );

    // Transform garden with detailed summary
    const gardenWithSummary = transformGardenWithSummary(garden, plantedItems);

    // Add detailed analytics for single garden view
    gardenWithSummary.analytics = {
      plantingHistory: plantedItems.map(plant => ({
        date: plant.planted_date || plant.created_at,
        plantName: plant.plant_name,
        category: plant.plant_category
      })).sort((a, b) => new Date(b.date) - new Date(a.date)),
      
      categoryBreakdown: gardenWithSummary.summary.plantCategories,
      
      spaceAnalysis: {
        totalArea: garden.width * garden.height,
        usedSpace: gardenWithSummary.summary.usedSpace,
        availableSpace: (garden.width * garden.height) - gardenWithSummary.summary.usedSpace,
        utilizationPercentage: gardenWithSummary.summary.spaceUtilization
      },
      
      recommendations: generateRecommendations(garden, plantedItems)
    };

    res.json(gardenWithSummary);

  } catch (error) {
    console.error(`Error fetching garden ${gardenId} for user ${userId}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch garden', 
      message: error.message,
      gardenId: gardenId,
      userId: userId
    });
  }
});

// Helper function to generate recommendations
const generateRecommendations = (garden, plantedItems) => {
  const recommendations = [];
  
  const totalArea = garden.width * garden.height;
  const usedSpace = plantedItems.reduce((sum, plant) => {
    const size = plant.plant_size || 1;
    return sum + (size * size);
  }, 0);
  
  const utilizationPercentage = totalArea > 0 ? (usedSpace / totalArea) * 100 : 0;
  
  // Space utilization recommendations
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
  
  // Category diversity recommendations
  const categories = new Set(plantedItems.map(p => p.plant_category));
  if (categories.size < 2 && plantedItems.length > 0) {
    recommendations.push({
      type: 'diversity',
      priority: 'low',
      message: 'Consider adding variety to your garden.',
      suggestion: 'Try planting different categories like herbs, vegetables, or flowers.'
    });
  }
  
  // Maintenance recommendations
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

module.exports = router;