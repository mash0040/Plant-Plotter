const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// GET /api/advice/garden/:gardenId - Get advice for a specific garden
router.get('/advice/garden/:gardenId', verifyToken, async (req, res) => {
  const { gardenId } = req.params;

  try {
    // Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, req.user.id]
    );

    if (garden.length === 0) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Get all plants in the garden with their details from plant_library
    const [gardenPlants] = await db.execute(`
      SELECT 
        pi.plant_name,
        pi.plant_category,
        pl.companion_plants,
        pl.avoid_plants,
        pl.name as library_name
      FROM planted_items pi
      LEFT JOIN plant_library pl ON pi.plant_name = pl.name
      WHERE pi.garden_id = ?
    `, [gardenId]);

    if (gardenPlants.length === 0) {
      return res.json({
        message: 'No plants found in this garden',
        tips: [],
        warnings: [],
        relationships: []
      });
    }

    const tips = [];
    const warnings = [];
    const relationships = [];

    // Process each plant in the garden
    for (const plant of gardenPlants) {
      const plantName = plant.plant_name || plant.library_name;
      
      if (!plantName) continue;

      // Parse companion plants (assuming they're stored as comma-separated strings)
      const companions = plant.companion_plants 
        ? plant.companion_plants.split(',').map(c => c.trim())
        : [];
      
      const avoidPlants = plant.avoid_plants 
        ? plant.avoid_plants.split(',').map(a => a.trim())
        : [];

      // Get list of all plant names in this garden for comparison
      const gardenPlantNames = gardenPlants.map(p => 
        (p.plant_name || p.library_name).toLowerCase()
      );

      // Find companion matches in the garden
      companions.forEach(companion => {
        const companionLower = companion.toLowerCase();
        if (gardenPlantNames.includes(companionLower)) {
          tips.push({
            plant: capitalize(plantName),
            companion: capitalize(companion),
            relationship: 'beneficial'
          });
        }
      });

      // Find incompatible matches in the garden
      avoidPlants.forEach(avoid => {
        const avoidLower = avoid.toLowerCase();
        if (gardenPlantNames.includes(avoidLower)) {
          warnings.push({
            plant: capitalize(plantName),
            incompatible: capitalize(avoid),
            reason: 'These plants should not be grown together'
          });
        }
      });

      // Build relationship data
      relationships.push({
        plant: capitalize(plantName),
        companions: companions.map(capitalize),
        avoid: avoidPlants.map(capitalize),
        category: plant.plant_category
      });
    }

    res.json({
      plantCount: gardenPlants.length,
      tips,
      warnings,
      relationships
    });

  } catch (err) {
    console.error('Error generating advisory:', err);
    res.status(500).json({
      error: 'Failed to generate planting advice'
    });
  }
});

// GET /api/advice/plant/:plantId - Get companion info for a specific plant
router.get('/advice/plant/:plantId', verifyToken, async (req, res) => {
  try {
    const [plant] = await db.execute(`
      SELECT 
        name,
        companion_plants,
        avoid_plants,
        category,
        description
      FROM plant_library 
      WHERE id = ?
    `, [req.params.plantId]);

    if (plant.length === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const plantData = plant[0];
    
    const companions = plantData.companion_plants 
      ? plantData.companion_plants.split(',').map(c => c.trim())
      : [];
    
    const avoidPlants = plantData.avoid_plants 
      ? plantData.avoid_plants.split(',').map(a => a.trim())
      : [];

    res.json({
      plant: plantData.name,
      category: plantData.category,
      description: plantData.description,
      companions: companions,
      avoid: avoidPlants
    });

  } catch (error) {
    console.error('Error fetching plant companions:', error);
    res.status(500).json({ error: 'Failed to fetch companion data' });
  }
});

// GET /api/advice/suggestions/:plantName - Get planting suggestions for a plant
router.get('/advice/suggestions/:plantName', verifyToken, async (req, res) => {
  const plantName = req.params.plantName;

  try {
    // Get the plant's companion data
    const [plant] = await db.execute(`
      SELECT 
        name,
        companion_plants,
        avoid_plants,
        category
      FROM plant_library 
      WHERE name LIKE ? OR name = ?
    `, [`%${plantName}%`, plantName]);

    if (plant.length === 0) {
      return res.json({
        message: 'Plant not found in library',
        suggestions: []
      });
    }

    const plantData = plant[0];
    const companions = plantData.companion_plants 
      ? plantData.companion_plants.split(',').map(c => c.trim())
      : [];

    // Get details for each companion plant
    const suggestions = [];
    
    for (const companion of companions) {
      const [companionData] = await db.execute(`
        SELECT name, category, description, emoji
        FROM plant_library 
        WHERE name LIKE ?
        LIMIT 1
      `, [`%${companion}%`]);

      if (companionData.length > 0) {
        suggestions.push({
          name: companionData[0].name,
          category: companionData[0].category,
          description: companionData[0].description,
          emoji: companionData[0].emoji,
          relationship: 'beneficial companion'
        });
      } else {
        // If not found in library, still include the name
        suggestions.push({
          name: companion,
          category: 'Unknown',
          description: 'Beneficial companion plant',
          emoji: '🌱',
          relationship: 'beneficial companion'
        });
      }
    }

    res.json({
      plant: plantData.name,
      category: plantData.category,
      suggestions
    });

  } catch (error) {
    console.error('Error fetching companion suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Capitalize helper function
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = router;
