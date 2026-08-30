const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { validateGardenPayload } = require("../utils/gardenValidation");
const { sendDatabaseAwareErrorResponse } = require("../utils/databaseAvailability");
const { sendErrorResponse } = require("../utils/apiErrorResponse");
const gardenService = require("../services/gardenService");

// GET /api/gardens - Fetch all gardens for authenticated user with summaries
router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const gardens = await gardenService.getGardensForUser(userId);
    res.json(gardens);
  } catch (err) {
    console.error(`Error fetching gardens for user ${userId}:`, err);
    sendDatabaseAwareErrorResponse(res, err, {
      message: "Failed to fetch gardens"
    });
  }
});

// GET /api/gardens/summary - Fetch lightweight garden cards/selectors for authenticated user
router.get('/summary', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const gardens = await gardenService.getGardenSummariesForUser(userId);
    res.json(gardens);
  } catch (err) {
    console.error(`Error fetching garden summaries for user ${userId}:`, err);
    sendDatabaseAwareErrorResponse(res, err, {
      message: 'Failed to fetch garden summaries'
    });
  }
});

// GET /api/gardens/:id - Get specific garden with detailed summary
router.get('/:id', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;

  try {
    const garden = await gardenService.getDetailedGardenForUser(gardenId, userId);

    if (!garden) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    res.json(garden);
  } catch (error) {
    console.error(`Error fetching garden ${gardenId} for user ${userId}:`, error);
    sendDatabaseAwareErrorResponse(res, error, {
      message: 'Failed to fetch garden'
    });
  }
});

// GET /api/gardens/:id/plants - Get just planted items for a garden
router.get('/:id/plants', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;

  try {
    const plantedItems = await gardenService.getTransformedPlantedItemsForGarden(gardenId, userId);

    if (!plantedItems) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    res.json(plantedItems);
  } catch (error) {
    console.error(`Error fetching plants for garden ${gardenId}:`, error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to fetch planted items' });
  }
});

// POST /api/gardens - Create new garden for user
router.post('/', verifyToken, async (req, res) => {
  const rawData = req.body;
  const userId = req.user.id;

  try {
    const validation = validateGardenPayload(rawData);

    if (!validation.isValid) {
      return sendErrorResponse(res, 400, 'Invalid garden data', {
        code: 'VALIDATION_ERROR',
        errors: validation.errors
      });
    }

    const transformedGarden = await gardenService.createGardenForUser(userId, validation.data);
    res.status(201).json(transformedGarden);
  } catch (error) {
    console.error('Error creating garden:', error);

    if (error.code === 'ER_DATA_TOO_LONG') {
      return sendErrorResponse(res, 400, 'One or more garden fields are too long', {
        code: 'VALIDATION_ERROR'
      });
    }

    sendDatabaseAwareErrorResponse(res, error, {
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
      return sendErrorResponse(res, 400, 'Invalid garden data', {
        code: 'VALIDATION_ERROR',
        errors: validation.errors
      });
    }

    const garden = await gardenService.updateGardenForUser(gardenId, userId, validation.data);

    if (!garden) {
      return sendErrorResponse(res, 404, 'Garden not found', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    res.json({
      message: 'Garden updated successfully',
      garden
    });
  } catch (error) {
    console.error('Update error:', error);

    if (error.code === 'ER_DATA_TOO_LONG') {
      return sendErrorResponse(res, 400, 'One or more garden fields are too long', {
        code: 'VALIDATION_ERROR'
      });
    }

    sendDatabaseAwareErrorResponse(res, error, {
      message: 'Failed to update garden'
    });
  }
});

// PUT /api/gardens/:id/complete - Replace planted items for a garden
router.put('/:id/complete', verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;
  const { plantedItems = [] } = req.body;

  try {
    const result = await gardenService.replacePlantedItemsForGarden(gardenId, userId, plantedItems);

    if (!result) {
      return sendErrorResponse(res, 404, 'Garden not found', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Plant saving failed:', error);
    sendDatabaseAwareErrorResponse(res, error, {
      message: 'Failed to save plants'
    });
  }
});

// DELETE /api/gardens/:id/plants - Clear all plants from a garden
router.delete('/:id/plants', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;

  try {
    const result = await gardenService.clearPlantedItemsForGarden(gardenId, userId);

    if (!result) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    res.json(result);
  } catch (error) {
    console.error(`Error clearing plants from garden ${gardenId}:`, error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to clear plants' });
  }
});

// DELETE /api/gardens/:id - Delete garden for user
router.delete("/:id", verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;

  try {
    const result = await gardenService.deleteGardenForUser(gardenId, userId);

    if (!result) {
      return sendErrorResponse(res, 404, "Garden not found or unauthorized", {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    res.json(result);
  } catch (err) {
    console.error(`Error deleting garden ${gardenId} for user ${userId}:`, err);
    sendDatabaseAwareErrorResponse(res, err, { message: "Failed to delete garden" });
  }
});

// POST /api/gardens/:id/plants - Add plant to user's garden
router.post('/:id/plants', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;
  const plantData = req.body;

  try {
    if (!plantData.plant_name) {
      return sendErrorResponse(res, 400, 'Plant name is required', {
        code: 'VALIDATION_ERROR',
        errors: {
          plant_name: 'Plant name is required'
        }
      });
    }

    const transformedPlant = await gardenService.addPlantToGarden(gardenId, userId, plantData);

    if (!transformedPlant) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    if (transformedPlant.createdButMissing) {
      return sendErrorResponse(res, 500, 'Plant created but could not be retrieved');
    }

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

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.log('Foreign key constraint failed');
      return sendErrorResponse(res, 400, 'Invalid garden or plant reference', {
        code: 'VALIDATION_ERROR'
      });
    }

    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Bad field error - column does not exist');
      return sendErrorResponse(res, 500, 'Failed to add plant');
    }

    if (error.code === 'ER_DATA_TOO_LONG') {
      console.log('Data too long for field');
      return sendErrorResponse(res, 400, 'One or more plant fields are too long', {
        code: 'VALIDATION_ERROR'
      });
    }

    if (error.code === 'ER_BAD_NULL_ERROR') {
      console.log('Required field is null');
      return sendErrorResponse(res, 400, 'Required field is missing', {
        code: 'VALIDATION_ERROR'
      });
    }

    sendDatabaseAwareErrorResponse(res, error, {
      error: 'Failed to add plant'
    });
  }
});

// PUT /api/gardens/:id/plants/:plantId - Update plant in user's garden
router.put('/:id/plants/:plantId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;
  const plantId = req.params.plantId;

  try {
    const result = await gardenService.updatePlantInGarden(gardenId, plantId, userId, req.body);

    if (!result.gardenFound) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    if (!result.plant) {
      return sendErrorResponse(res, 404, 'Plant not found in this garden', {
        code: 'PLANT_NOT_FOUND'
      });
    }

    res.json(result.plant);
  } catch (error) {
    console.error(`Error updating plant ${plantId} for user ${userId}:`, error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to update plant' });
  }
});

// DELETE /api/gardens/:id/plants/:plantId - Remove plant from user's garden
router.delete('/:id/plants/:plantId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const gardenId = req.params.id;
  const plantId = req.params.plantId;

  try {
    const result = await gardenService.removePlantFromGarden(gardenId, plantId, userId);

    if (!result.gardenFound) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    if (!result.removed) {
      return sendErrorResponse(res, 404, 'Plant not found in this garden', {
        code: 'PLANT_NOT_FOUND'
      });
    }

    res.json({ message: 'Plant removed successfully' });
  } catch (error) {
    console.error(`Error removing plant ${plantId} for user ${userId}:`, error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to remove plant' });
  }
});

module.exports = router;
