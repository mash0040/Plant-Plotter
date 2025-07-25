const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// Helper function to safely parse JSON or comma-separated string
const safeParseField = (field) => {
  if (!field) return [];
  
  // If it's already an array, return it
  if (Array.isArray(field)) return field;
  
  // If it's a string
  if (typeof field === 'string') {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // If JSON parsing fails, treat as comma-separated string
      return field.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
  }
  
  return [];
};

// GET /api/plants - Get plant library
router.get('/', verifyToken, async (req, res) => {
  try {
    const [plants] = await db.execute(`
      SELECT 
        id,
        name,
        emoji,
        size,
        category,
        spacing,
        sunlight,
        water_needs,
        days_to_maturity,
        companion_plants,
        avoid_plants,
        soil_types,
        difficulty,
        planting_depth,
        description
      FROM plant_library 
      ORDER BY category, name
    `);

    // Transform the data to ensure proper JSON formatting
    const transformedPlants = plants.map(plant => {
      try {
        return {
          ...plant,
          // Safely parse JSON or comma-separated string fields
          companion_plants: safeParseField(plant.companion_plants),
          avoid_plants: safeParseField(plant.avoid_plants),
          soil_types: safeParseField(plant.soil_types),
          // Ensure other fields have proper defaults
          sunlight: plant.sunlight || 'Full Sun',
          water_needs: plant.water_needs || 'Moderate',
          difficulty: plant.difficulty || 'Medium',
          spacing: plant.spacing || 12,
          size: plant.size || 1,
          emoji: plant.emoji || '🌱'
        };
      } catch (error) {
        console.warn(`Error transforming plant ${plant.id}:`, error);
        // Return plant with safe defaults if transformation fails
        return {
          ...plant,
          companion_plants: [],
          avoid_plants: [],
          soil_types: [],
          sunlight: plant.sunlight || 'Full Sun',
          water_needs: plant.water_needs || 'Moderate',
          difficulty: plant.difficulty || 'Medium',
          spacing: plant.spacing || 12,
          size: plant.size || 1,
          emoji: plant.emoji || '🌱'
        };
      }
    });

    console.log(`Plant library loaded: ${transformedPlants.length} plants`);
    res.json(transformedPlants);
  } catch (error) {
    console.error('Error fetching plant library:', error);
    res.status(500).json({ error: 'Failed to fetch plant library' });
  }
});

// GET /api/plants/:id - Get specific plant
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [plant] = await db.execute(
      'SELECT * FROM plant_library WHERE id = ?',
      [req.params.id]
    );

    if (plant.length === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    // Transform the single plant data
    const transformedPlant = {
      ...plant[0],
      companion_plants: safeParseField(plant[0].companion_plants),
      avoid_plants: safeParseField(plant[0].avoid_plants),
      soil_types: safeParseField(plant[0].soil_types),
      sunlight: plant[0].sunlight || 'Full Sun',
      water_needs: plant[0].water_needs || 'Moderate',
      difficulty: plant[0].difficulty || 'Medium'
    };

    res.json(transformedPlant);
  } catch (error) {
    console.error('Error fetching plant:', error);
    res.status(500).json({ error: 'Failed to fetch plant' });
  }
});

module.exports = router;