const db = require('../config/db.js');
const { isTemporaryDatabaseUnavailableError } = require('../utils/databaseAvailability');
const {
  buildCompletePlantData,
  buildSinglePlantData,
  transformCreatedGarden,
  transformDetailedGarden,
  transformGardenForList,
  transformGardenSummary,
  transformPlantedItem,
  transformUpdatedGarden
} = require('../utils/gardenTransformers');

const GARDEN_FIELDS = `
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
`;

const PLANTED_ITEM_FIELDS = `
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
`;

const groupPlantsByGardenId = (plantedItems = []) => {
  const plantsByGarden = {};

  plantedItems.forEach((plant) => {
    if (!plantsByGarden[plant.garden_id]) {
      plantsByGarden[plant.garden_id] = [];
    }
    plantsByGarden[plant.garden_id].push(plant);
  });

  return plantsByGarden;
};

const getGardensForUser = async (userId) => {
  const [gardens] = await db.execute(
    `SELECT ${GARDEN_FIELDS}
     FROM gardens g
     WHERE g.user_id = ?
     ORDER BY g.updated_at DESC`,
    [userId]
  );

  if (gardens.length === 0) {
    return [];
  }

  const gardenIds = gardens.map((garden) => garden.id);
  const placeholders = gardenIds.map(() => '?').join(',');
  const [allPlantedItems] = await db.execute(
    `SELECT ${PLANTED_ITEM_FIELDS}
     FROM planted_items pi
     WHERE pi.garden_id IN (${placeholders})
     ORDER BY pi.garden_id, pi.created_at DESC`,
    gardenIds
  );

  const plantsByGarden = groupPlantsByGardenId(allPlantedItems);
  return gardens.map((garden) => transformGardenForList(garden, plantsByGarden[garden.id] || []));
};

const getGardenSummariesForUser = async (userId) => {
  const [gardens] = await db.execute(
    `SELECT
      ${GARDEN_FIELDS},
      COUNT(pi.id) AS plant_count
     FROM gardens g
     LEFT JOIN planted_items pi ON pi.garden_id = g.id
     WHERE g.user_id = ?
     GROUP BY
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
     ORDER BY g.updated_at DESC`,
    [userId]
  );

  return gardens.map(transformGardenSummary);
};

const findGardenForUser = async (gardenId, userId) => {
  const [gardens] = await db.execute(
    `SELECT ${GARDEN_FIELDS}
     FROM gardens g
     WHERE g.id = ? AND g.user_id = ?`,
    [gardenId, userId]
  );

  return gardens[0] || null;
};

const getPlantedItemsForGarden = async (gardenId) => {
  const [plantedItems] = await db.execute(
    `SELECT ${PLANTED_ITEM_FIELDS}
     FROM planted_items pi
     WHERE pi.garden_id = ?
     ORDER BY pi.created_at DESC`,
    [gardenId]
  );

  return plantedItems;
};

const getDetailedGardenForUser = async (gardenId, userId) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return null;

  const plantedItems = await getPlantedItemsForGarden(gardenId);
  return transformDetailedGarden(garden, plantedItems);
};

const getTransformedPlantedItemsForGarden = async (gardenId, userId) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return null;

  const plantedItems = await getPlantedItemsForGarden(gardenId);
  return plantedItems.map(transformPlantedItem);
};

const createGardenForUser = async (userId, gardenData) => {
  const [result] = await db.execute(
    `INSERT INTO gardens
     (user_id, name, description, width, height, grid_size, soil_type, location, status, plant_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      userId,
      gardenData.name,
      gardenData.description,
      gardenData.width,
      gardenData.height,
      40,
      gardenData.soil_type,
      gardenData.location,
      gardenData.status,
      0
    ]
  );

  const [newGarden] = await db.execute(
    'SELECT * FROM gardens WHERE id = ? AND user_id = ?',
    [result.insertId, userId]
  );

  return transformCreatedGarden(newGarden[0]);
};

const updateGardenForUser = async (gardenId, userId, gardenData) => {
  const existingGarden = await findGardenForUser(gardenId, userId);
  if (!existingGarden) return null;

  await db.execute(
    `UPDATE gardens
     SET name = ?, description = ?, width = ?, height = ?,
         soil_type = ?, location = ?, status = ?, updated_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [
      gardenData.name,
      gardenData.description,
      gardenData.width,
      gardenData.height,
      gardenData.soil_type,
      gardenData.location,
      gardenData.status,
      gardenId,
      userId
    ]
  );

  const [updatedGarden] = await db.execute(
    'SELECT * FROM gardens WHERE id = ? AND user_id = ?',
    [gardenId, userId]
  );

  return transformUpdatedGarden(updatedGarden[0]);
};

const insertPlantedItem = async (plantData) => {
  const [result] = await db.execute(
    `INSERT INTO planted_items
     (garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, planted_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      plantData.garden_id,
      plantData.plant_id,
      plantData.plant_name,
      plantData.plant_emoji,
      plantData.plant_size,
      plantData.plant_category,
      plantData.x_position,
      plantData.y_position,
      plantData.planted_date,
      plantData.notes
    ]
  );

  return result;
};

const replacePlantedItemsForGarden = async (gardenId, userId, plantedItems = []) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return null;

  await db.execute(
    'DELETE FROM planted_items WHERE garden_id = ?',
    [gardenId]
  );

  let plantsAdded = 0;
  for (const plant of plantedItems) {
    try {
      const safePlant = buildCompletePlantData(gardenId, plant);
      await insertPlantedItem(safePlant);
      plantsAdded++;
    } catch (plantError) {
      if (isTemporaryDatabaseUnavailableError(plantError)) {
        throw plantError;
      }

      console.error(`Failed to add plant ${plant.plant_name}:`, plantError.message);
    }
  }

  return {
    message: 'Plants saved successfully',
    plantsAdded,
    totalPlants: plantedItems.length
  };
};

const clearPlantedItemsForGarden = async (gardenId, userId) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return null;

  const [result] = await db.execute(
    'DELETE FROM planted_items WHERE garden_id = ?',
    [gardenId]
  );

  return {
    message: 'Plants cleared successfully',
    deletedCount: result.affectedRows
  };
};

const deleteGardenForUser = async (gardenId, userId) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return null;

  const [plantDeleteResult] = await db.execute(
    'DELETE FROM planted_items WHERE garden_id = ?',
    [gardenId]
  );

  const [gardenDeleteResult] = await db.execute(
    'DELETE FROM gardens WHERE id = ? AND user_id = ?',
    [gardenId, userId]
  );

  if (gardenDeleteResult.affectedRows === 0) {
    return null;
  }

  return {
    message: 'Garden deleted successfully',
    deletedPlants: plantDeleteResult.affectedRows
  };
};

const addPlantToGarden = async (gardenId, userId, plantData) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return null;

  const safePlant = buildSinglePlantData(gardenId, plantData);
  const result = await insertPlantedItem(safePlant);
  const [newPlant] = await db.execute(
    'SELECT * FROM planted_items WHERE id = ? AND garden_id = ?',
    [result.insertId, gardenId]
  );

  if (newPlant.length === 0) {
    return { createdButMissing: true };
  }

  return transformPlantedItem(newPlant[0]);
};

const updatePlantInGarden = async (gardenId, plantId, userId, plantData) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return { gardenFound: false, plant: null };

  const [result] = await db.execute(
    `UPDATE planted_items
     SET plant_name = ?, plant_emoji = ?, plant_size = ?, plant_category = ?, x_position = ?, y_position = ?, notes = ?, updated_at = NOW()
     WHERE id = ? AND garden_id = ?`,
    [
      plantData.plant_name,
      plantData.plant_emoji,
      plantData.plant_size,
      plantData.plant_category,
      plantData.x_position,
      plantData.y_position,
      plantData.notes,
      plantId,
      gardenId
    ]
  );

  if (result.affectedRows === 0) {
    return { gardenFound: true, plant: null };
  }

  const [updatedPlant] = await db.execute(
    'SELECT * FROM planted_items WHERE id = ? AND garden_id = ?',
    [plantId, gardenId]
  );

  return {
    gardenFound: true,
    plant: transformPlantedItem(updatedPlant[0])
  };
};

const removePlantFromGarden = async (gardenId, plantId, userId) => {
  const garden = await findGardenForUser(gardenId, userId);
  if (!garden) return { gardenFound: false, removed: false };

  const [result] = await db.execute(
    'DELETE FROM planted_items WHERE id = ? AND garden_id = ?',
    [plantId, gardenId]
  );

  return {
    gardenFound: true,
    removed: result.affectedRows > 0
  };
};

module.exports = {
  addPlantToGarden,
  clearPlantedItemsForGarden,
  createGardenForUser,
  deleteGardenForUser,
  getDetailedGardenForUser,
  getGardenSummariesForUser,
  getGardensForUser,
  getTransformedPlantedItemsForGarden,
  removePlantFromGarden,
  replacePlantedItemsForGarden,
  updateGardenForUser,
  updatePlantInGarden
};
