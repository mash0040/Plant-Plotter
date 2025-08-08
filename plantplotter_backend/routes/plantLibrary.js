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

// Helper function to safely stringify arrays for database storage
const safeStringifyField = (field) => {
  if (!field) return JSON.stringify([]);
  if (Array.isArray(field)) return JSON.stringify(field);
  if (typeof field === 'string') {
    // If it looks like JSON, return as is, otherwise treat as comma-separated
    if (field.trim().startsWith('[')) {
      return field;
    } else {
      // Convert comma-separated to JSON array
      const array = field.split(',').map(item => item.trim()).filter(item => item.length > 0);
      return JSON.stringify(array);
    }
  }
  return JSON.stringify([]);
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

// POST /api/plants - Add new plant to library
router.post('/', verifyToken, async (req, res) => {
  try {  
    const {
      id,
      name,
      emoji,
      size,
      category,
      description,
      spacing,
      sunlight,
      water_needs,
      days_to_maturity,
      companion_plants,
      avoid_plants,
      soil_types,
      difficulty,
      planting_depth
    } = req.body;

    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({ 
        error: 'Plant name and category are required',
        received: { name, category }
      });
    }

    // Generate ID if not provided
    const plantId = id || name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Check if plant with this ID already exists
    const [existing] = await db.execute(
      'SELECT id FROM plant_library WHERE id = ?',
      [plantId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Plant with this ID already exists',
        existingId: plantId
      });
    }

    // Prepare data for insertion
    const plantData = {
      id: plantId,
      name: name.trim(),
      emoji: emoji || '🌱',
      size: parseInt(size) || 1,
      category: category,
      description: description || '',
      spacing: spacing || null,
      sunlight: sunlight || 'Full Sun',
      water_needs: water_needs || 'Moderate',
      days_to_maturity: days_to_maturity ? parseInt(days_to_maturity) : null,
      companion_plants: safeStringifyField(companion_plants),
      avoid_plants: safeStringifyField(avoid_plants),
      soil_types: safeStringifyField(soil_types),
      difficulty: difficulty || 'Medium',
      planting_depth: planting_depth || null
    };

    // Insert into database
    const [result] = await db.execute(`
      INSERT INTO plant_library (
        id, name, emoji, size, category, description, spacing, sunlight, 
        water_needs, days_to_maturity, companion_plants, avoid_plants, 
        soil_types, difficulty, planting_depth
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      plantData.id,
      plantData.name,
      plantData.emoji,
      plantData.size,
      plantData.category,
      plantData.description,
      plantData.spacing,
      plantData.sunlight,
      plantData.water_needs,
      plantData.days_to_maturity,
      plantData.companion_plants,
      plantData.avoid_plants,
      plantData.soil_types,
      plantData.difficulty,
      plantData.planting_depth
    ]);

    // Fetch the created plant to return
    const [newPlant] = await db.execute(
      'SELECT * FROM plant_library WHERE id = ?',
      [plantData.id]
    );

    const transformedPlant = {
      ...newPlant[0],
      companion_plants: safeParseField(newPlant[0].companion_plants),
      avoid_plants: safeParseField(newPlant[0].avoid_plants),
      soil_types: safeParseField(newPlant[0].soil_types)
    };

    res.status(201).json(transformedPlant);

  } catch (error) {
    console.error('Error creating plant:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Plant with this ID already exists',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create plant',
      message: error.message
    });
  }
});

// PUT /api/plants/:id - Update plant in library
router.put('/:id', verifyToken, async (req, res) => {
  try {    
    const plantId = req.params.id;
    const {
      name,
      emoji,
      size,
      category,
      description,
      spacing,
      sunlight,
      water_needs,
      days_to_maturity,
      companion_plants,
      avoid_plants,
      soil_types,
      difficulty,
      planting_depth
    } = req.body;

    // Check if plant exists
    const [existing] = await db.execute(
      'SELECT id FROM plant_library WHERE id = ?',
      [plantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({ 
        error: 'Plant name and category are required',
        received: { name, category }
      });
    }

    // Prepare data for update
    const plantData = {
      name: name.trim(),
      emoji: emoji || '🌱',
      size: parseInt(size) || 1,
      category: category,
      description: description || '',
      spacing: spacing || null,
      sunlight: sunlight || 'Full Sun',
      water_needs: water_needs || 'Moderate',
      days_to_maturity: days_to_maturity ? parseInt(days_to_maturity) : null,
      companion_plants: safeStringifyField(companion_plants),
      avoid_plants: safeStringifyField(avoid_plants),
      soil_types: safeStringifyField(soil_types),
      difficulty: difficulty || 'Medium',
      planting_depth: planting_depth || null
    };

    // Update in database
    const [result] = await db.execute(`
      UPDATE plant_library SET 
        name = ?, emoji = ?, size = ?, category = ?, description = ?, 
        spacing = ?, sunlight = ?, water_needs = ?, days_to_maturity = ?, 
        companion_plants = ?, avoid_plants = ?, soil_types = ?, 
        difficulty = ?, planting_depth = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      plantData.name,
      plantData.emoji,
      plantData.size,
      plantData.category,
      plantData.description,
      plantData.spacing,
      plantData.sunlight,
      plantData.water_needs,
      plantData.days_to_maturity,
      plantData.companion_plants,
      plantData.avoid_plants,
      plantData.soil_types,
      plantData.difficulty,
      plantData.planting_depth,
      plantId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found or no changes made' });
    }

    // Fetch the updated plant to return
    const [updatedPlant] = await db.execute(
      'SELECT * FROM plant_library WHERE id = ?',
      [plantId]
    );

    const transformedPlant = {
      ...updatedPlant[0],
      companion_plants: safeParseField(updatedPlant[0].companion_plants),
      avoid_plants: safeParseField(updatedPlant[0].avoid_plants),
      soil_types: safeParseField(updatedPlant[0].soil_types)
    };

    res.json(transformedPlant);

  } catch (error) {
    console.error('Error updating plant:', error);
    res.status(500).json({ 
      error: 'Failed to update plant',
      message: error.message
    });
  }
});

// DELETE /api/plants/:id - Delete plant from library
router.delete('/:id', verifyToken, async (req, res) => {
  try {    
    const plantId = req.params.id;

    // Check if plant exists
    const [existing] = await db.execute(
      'SELECT id, name FROM plant_library WHERE id = ?',
      [plantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const plantName = existing[0].name;

    // Check if plant is used in any gardens (optional - warn user)
    const [usage] = await db.execute(
      'SELECT COUNT(*) as count FROM planted_items WHERE plant_id = ?',
      [plantId]
    );

    const usageCount = usage[0].count;

    // Delete the plant
    const [result] = await db.execute(
      'DELETE FROM plant_library WHERE id = ?',
      [plantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    res.json({ 
      message: 'Plant deleted successfully',
      deletedPlant: plantName,
      wasUsedInGardens: usageCount > 0,
      affectedGardenPlants: usageCount
    });

  } catch (error) {
    console.error('Error deleting plant:', error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ 
        error: 'Cannot delete plant - it is being used in gardens',
        message: 'Remove this plant from all gardens before deleting it from the library'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete plant',
      message: error.message
    });
  }
});

// GET /api/plants/search/:query - Search plants by name or category
router.get('/search/:query', verifyToken, async (req, res) => {
  try {   
    const query = req.params.query;
    const [plants] = await db.execute(`
      SELECT * FROM plant_library 
      WHERE name LIKE ? OR category LIKE ? OR description LIKE ?
      ORDER BY name
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    const transformedPlants = plants.map(plant => ({
      ...plant,
      companion_plants: safeParseField(plant.companion_plants),
      avoid_plants: safeParseField(plant.avoid_plants),
      soil_types: safeParseField(plant.soil_types)
    }));

    res.json(transformedPlants);

  } catch (error) {
    console.error('Error searching plants:', error);
    res.status(500).json({ error: 'Failed to search plants' });
  }
});

module.exports = router;