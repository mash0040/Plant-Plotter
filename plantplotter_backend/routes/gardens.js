const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const db = require("../config/db.js");
const { validateGardenPayload } = require("../utils/gardenValidation");

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
      message: "Failed to fetch gardens"
    });
  }
});

// GET /api/gardens/summary - Fetch lightweight garden cards/selectors for authenticated user
router.get('/summary', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [gardens] = await db.execute(
      `SELECT
        g.id,
        g.name,
        g.width,
        g.height,
        g.soil_type,
        g.location,
        g.status,
        g.created_at,
        g.updated_at,
        COUNT(pi.id) AS plant_count
       FROM gardens g
       LEFT JOIN planted_items pi ON pi.garden_id = g.id
       WHERE g.user_id = ?
       GROUP BY
        g.id,
        g.name,
        g.width,
        g.height,
        g.soil_type,
        g.location,
        g.status,
        g.created_at,
        g.updated_at
       ORDER BY g.updated_at DESC`,
      [userId]
    );

    res.json(gardens.map(garden => ({
      id: garden.id,
      name: garden.name,
      width: garden.width,
      height: garden.height,
      dimensions: {
        width: garden.width,
        height: garden.height
      },
      soil_type: garden.soil_type || 'Loamy',
      soilType: garden.soil_type || 'Loamy',
      location: garden.location || 'Garden',
      status: garden.status || 'Active',
      plant_count: Number(garden.plant_count) || 0,
      plantCount: Number(garden.plant_count) || 0,
      created_at: garden.created_at,
      createdAt: garden.created_at,
      updated_at: garden.updated_at,
      updatedAt: garden.updated_at
    })));
  } catch (err) {
    console.error(`Error fetching garden summaries for user ${userId}:`, err);
    res.status(500).json({
      message: 'Failed to fetch garden summaries'
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
      message: 'Failed to fetch garden'
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

// GET /api/gardens/:id/plants - Get just planted items for a garden
router.get('/:id/plants', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;

  try {   
    // Verify garden belongs to user
    const [gardenCheck] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (gardenCheck.length === 0) {
      return res.status(404).json({ error: 'Garden not found or access denied' });
    }

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

    const transformedPlants = plantedItems.map(plant => ({
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
    }));

    res.json(transformedPlants);

  } catch (error) {
    console.error(`Error fetching plants for garden ${gardenId}:`, error);
    res.status(500).json({ error: 'Failed to fetch planted items' });
  }
});

// POST /api/gardens - Create new garden for user
router.post('/', verifyToken, async (req, res) => {
  const rawData = req.body;
  const userId = req.user.id;

  try {
    const validation = validateGardenPayload(rawData);

    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Invalid garden data',
        errors: validation.errors
      });
    }

    const sanitizedData = validation.data;

    // Insert into database
    const [result] = await db.execute(
      `INSERT INTO gardens 
       (user_id, name, description, width, height, grid_size, soil_type, location, status, plant_count, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        sanitizedData.name,
        sanitizedData.description,
        sanitizedData.width,
        sanitizedData.height,
        40, // Default grid size
        sanitizedData.soil_type,
        sanitizedData.location,
        sanitizedData.status,
        0 // Initial plant count
      ]
    );

    // Fetch and return created garden
    const [newGarden] = await db.execute(
      'SELECT * FROM gardens WHERE id = ? AND user_id = ?',
      [result.insertId, userId]
    );

    const garden = newGarden[0];
    const transformedGarden = {
      id: garden.id,
      name: garden.name,
      description: garden.description || '',
      width: garden.width,
      height: garden.height,
      dimensions: { width: garden.width, height: garden.height },
      soil_type: garden.soil_type,
      soilType: garden.soil_type,
      location: garden.location,
      status: garden.status,
      plant_count: 0,
      plantCount: 0,
      plantedItems: [],
      created_at: garden.created_at,
      createdAt: garden.created_at,
      updated_at: garden.updated_at,
      updatedAt: garden.updated_at
    };

    res.status(201).json(transformedGarden);

  } catch (error) {
    console.error('Error creating garden:', error);
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        message: 'One or more garden fields are too long'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create garden'
    });
  }
});

// PUT /api/gardens/:id - Update garden
router.put('/:id', verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;
  const rawData = req.body;

  try {
    const validation = validateGardenPayload(rawData);

    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Invalid garden data',
        errors: validation.errors
      });
    }

    const sanitizedData = validation.data;

    // Verify garden ownership
    const [existing] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Garden not found' });
    }

    // Update with sanitized data
    const [updateResult] = await db.execute(
      `UPDATE gardens 
       SET name = ?, description = ?, width = ?, height = ?, 
           soil_type = ?, location = ?, status = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        sanitizedData.name,
        sanitizedData.description,
        sanitizedData.width,
        sanitizedData.height,
        sanitizedData.soil_type,
        sanitizedData.location,
        sanitizedData.status,
        gardenId,
        userId
      ]
    );

    // Fetch updated garden to verify
    const [updatedGarden] = await db.execute(
      'SELECT * FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    const garden = updatedGarden[0];

    const response = {
      message: 'Garden updated successfully',
      garden: {
        id: garden.id,
        name: garden.name,
        description: garden.description || '',
        width: garden.width,
        height: garden.height,
        dimensions: { width: garden.width, height: garden.height },
        soil_type: garden.soil_type,
        soilType: garden.soil_type,
        location: garden.location,
        status: garden.status,
        plant_count: garden.plant_count || 0,
        plantCount: garden.plant_count || 0,
        created_at: garden.created_at,
        createdAt: garden.created_at,
        updated_at: garden.updated_at,
        updatedAt: garden.updated_at
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Update error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        message: 'One or more garden fields are too long'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to update garden'
    });
  }
});

// This handles the plant saving that happens after garden update
router.put('/:id/complete', verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;
  const { plantedItems = [] } = req.body;

  try {
    // Verify garden ownership
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (garden.length === 0) {
      return res.status(404).json({ message: 'Garden not found' });
    }

    // Clear existing plants first
    const [deleteResult] = await db.execute(
      'DELETE FROM planted_items WHERE garden_id = ?',
      [gardenId]
    );

    // Add new plants
    let plantsAdded = 0;
    for (const plant of plantedItems) {
      try {
        const safePlant = {
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
        };

        await db.execute(
          `INSERT INTO planted_items 
           (garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, planted_date, notes, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            safePlant.garden_id,
            safePlant.plant_id,
            safePlant.plant_name,
            safePlant.plant_emoji,
            safePlant.plant_size,
            safePlant.plant_category,
            safePlant.x_position,
            safePlant.y_position,
            safePlant.planted_date,
            safePlant.notes
          ]
        );

        plantsAdded++;

      } catch (plantError) {
        console.error(`Failed to add plant ${plant.plant_name}:`, plantError.message);
        // Continue with other plants
      }
    }

    res.json({
      message: 'Plants saved successfully',
      plantsAdded: plantsAdded,
      totalPlants: plantedItems.length
    });

  } catch (error) {
    console.error('Plant saving failed:', error);
    res.status(500).json({ 
      message: 'Failed to save plants'
    });
  }
});

// DELETE /api/gardens/:id/plants - Clear all plants from a garden
router.delete('/:id/plants', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;

  try {    
    // Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (garden.length === 0) {
      return res.status(404).json({ error: 'Garden not found or access denied' });
    }

    // Delete all planted items for this garden
    const [result] = await db.execute(
      'DELETE FROM planted_items WHERE garden_id = ?',
      [gardenId]
    );

    res.json({ 
      message: 'Plants cleared successfully', 
      deletedCount: result.affectedRows 
    });

  } catch (error) {
    console.error(`Error clearing plants from garden ${gardenId}:`, error);
    res.status(500).json({ error: 'Failed to clear plants' });
  }
});

// DELETE /api/gardens/:id - Delete garden for user
router.delete("/:id", verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;

  try {
    // Verify garden ownership before touching any data
    const [owned] = await db.execute(
      "SELECT id FROM gardens WHERE id = ? AND user_id = ?",
      [gardenId, userId]
    );

    if (owned.length === 0) {
      return res.status(404).json({ message: "Garden not found or unauthorized" });
    }

    // Ownership confirmed — safe to delete planted items
    const [plantDeleteResult] = await db.execute(
      "DELETE FROM planted_items WHERE garden_id = ?",
      [gardenId]
    );

    const [gardenDeleteResult] = await db.execute(
      "DELETE FROM gardens WHERE id = ? AND user_id = ?",
      [gardenId, userId]
    );

    if (gardenDeleteResult.affectedRows === 0) {
      return res.status(404).json({ message: "Garden not found or unauthorized" });
    }

    res.json({
      message: "Garden deleted successfully",
      deletedPlants: plantDeleteResult.affectedRows
    });

  } catch (err) {
    console.error(`Error deleting garden ${gardenId} for user ${userId}:`, err);
    res.status(500).json({ message: "Failed to delete garden" });
  }
});

// POST /api/gardens/:id/plants - Add plant to user's garden
router.post('/:id/plants', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;
  const { plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, notes } = req.body;

  try {   
    // Step 1: Validate required fields
    if (!plant_name) {
      return res.status(400).json({ 
        error: 'Plant name is required',
        field: 'plant_name',
        received: plant_name
      });
    }

    // Step 2: Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id, name FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (garden.length === 0) {
      return res.status(404).json({ 
        error: 'Garden not found or access denied'
      });
    }

    // Step 3: Prepare plant data with defaults
    const plantData = {
      garden_id: parseInt(gardenId),
      plant_id: plant_id || 'unknown',
      plant_name: plant_name.trim(),
      plant_emoji: plant_emoji || '🌱',
      plant_size: parseInt(plant_size) || 1,
      plant_category: plant_category || 'other',
      x_position: parseInt(x_position) || 0,
      y_position: parseInt(y_position) || 0,
      notes: (notes || '').trim(),
      planted_date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    };


    // Step 4: Insert plant into database   
    const insertSQL = `
      INSERT INTO planted_items 
      (garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, notes, planted_date, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const insertParams = [
      plantData.garden_id,
      plantData.plant_id,
      plantData.plant_name,
      plantData.plant_emoji,
      plantData.plant_size,
      plantData.plant_category,
      plantData.x_position,
      plantData.y_position,
      plantData.notes,
      plantData.planted_date
    ];

    const [result] = await db.execute(insertSQL, insertParams);

    // Step 5: Fetch the newly created plant
    const [newPlant] = await db.execute(
      'SELECT * FROM planted_items WHERE id = ? AND garden_id = ?',
      [result.insertId, gardenId]
    );

    if (newPlant.length === 0) {
      return res.status(500).json({ 
        error: 'Plant created but could not be retrieved'
      });
    }

    // Step 6: Transform for frontend
    const plant = newPlant[0];
    const transformedPlant = {
      id: plant.id,
      plantId: plant.plant_id,
      name: plant.plant_name,
      emoji: plant.plant_emoji,
      size: plant.plant_size,
      category: plant.plant_category,
      xPosition: plant.x_position,
      yPosition: plant.y_position,
      plantedDate: plant.planted_date,
      notes: plant.notes,
      created_at: plant.created_at,
      updated_at: plant.updated_at
    };

    res.status(201).json(transformedPlant);

  } catch (error) {
    console.error('===== PLANT ADDITION ERROR =====');
    console.error(`Error adding plant to garden ${gardenId} for user ${userId}`);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    console.error('Full error object:', error);
    console.error('Stack trace:', error.stack);
    
    // Handle specific database errors
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.log('Foreign key constraint failed');
      return res.status(400).json({ 
        error: 'Invalid garden or plant reference'
      });
    }
    
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Bad field error - column does not exist');
      return res.status(500).json({ 
        error: 'Failed to add plant'
      });
    }
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      console.log('Data too long for field');
      return res.status(400).json({ 
        error: 'One or more plant fields are too long'
      });
    }

    if (error.code === 'ER_BAD_NULL_ERROR') {
      console.log('Required field is null');
      return res.status(400).json({ 
        error: 'Required field is missing'
      });
    }

    if (error.code === 'ECONNREFUSED') {
      console.log('Database connection refused');
      return res.status(503).json({ 
        error: 'Service temporarily unavailable'
      });
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'Failed to add plant'
    });
  }
});

// PUT /api/gardens/:id/plants/:plantId - Update plant in user's garden
router.put('/:id/plants/:plantId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;
  const plantId = req.params.plantId;
  const { plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, notes } = req.body;

  try {    
    // Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (garden.length === 0) {
      return res.status(404).json({ error: 'Garden not found or access denied' });
    }

    const [result] = await db.execute(
      `UPDATE planted_items 
       SET plant_name = ?, plant_emoji = ?, plant_size = ?, plant_category = ?, x_position = ?, y_position = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND garden_id = ?`,
      [plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, notes, plantId, gardenId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found in this garden' });
    }

    const [updatedPlant] = await db.execute(
      'SELECT * FROM planted_items WHERE id = ? AND garden_id = ?',
      [plantId, gardenId]
    );

    const transformedPlant = {
      id: updatedPlant[0].id,
      plantId: updatedPlant[0].plant_id,
      name: updatedPlant[0].plant_name,
      emoji: updatedPlant[0].plant_emoji,
      size: updatedPlant[0].plant_size,
      category: updatedPlant[0].plant_category,
      xPosition: updatedPlant[0].x_position,
      yPosition: updatedPlant[0].y_position,
      plantedDate: updatedPlant[0].planted_date,
      notes: updatedPlant[0].notes,
      created_at: updatedPlant[0].created_at,
      updated_at: updatedPlant[0].updated_at
    };

    res.json(transformedPlant);

  } catch (error) {
    console.error(`Error updating plant ${plantId} for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update plant' });
  }
});

// DELETE /api/gardens/:id/plants/:plantId - Remove plant from user's garden
router.delete('/:id/plants/:plantId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;
  const plantId = req.params.plantId;

  try {    
    // Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (garden.length === 0) {
      return res.status(404).json({ error: 'Garden not found or access denied' });
    }

    const [result] = await db.execute(
      'DELETE FROM planted_items WHERE id = ? AND garden_id = ?',
      [plantId, gardenId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plant not found in this garden' });
    }

    res.json({ message: 'Plant removed successfully' });

  } catch (error) {
    console.error(`Error removing plant ${plantId} for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to remove plant' });
  }
});

module.exports = router;
