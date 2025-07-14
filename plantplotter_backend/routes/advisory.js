const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// GET /api/gardens/:gardenId/advice
router.get('/gardens/:gardenId/advice', verifyToken, async (req, res) => {
  const { gardenId } = req.params;

  try {
    // 1. Get all plant names (codes) from the garden
    const [plants] = await pool.query(
      'SELECT name FROM plants WHERE garden_id = ?',
      [gardenId]
    );

    const gardenPlantCodes = plants.map(p => p.name.trim().toLowerCase());

    // 2. Load companion data
    const dataPath = path.join(__dirname, '../data/companion_plants.json');
    const rawData = fs.readFileSync(dataPath);
    const companionDataRaw = JSON.parse(rawData);

    // 3. Create a lookup by code
    const companionLookup = {};
    for (const plant of companionDataRaw) {
      companionLookup[plant.code.toLowerCase()] = plant;
    }

    const tips = [];
    const warnings = [];
    const pests = [];

    for (const code of gardenPlantCodes) {
      const plant = companionLookup[code];
      if (!plant) continue;

      // TIPS
      const helpedPlants = [...plant.helps, ...plant.helped_by];
      helpedPlants.forEach(companion => {
        if (gardenPlantCodes.includes(companion.toLowerCase())) {
          tips.push({
            plant: capitalize(code),
            companion: capitalize(companion)
          });
        }
      });

      // WARNINGS
      plant.avoid.forEach(badCompanion => {
        if (gardenPlantCodes.includes(badCompanion.toLowerCase())) {
          warnings.push({
            plant: capitalize(code),
            incompatible: capitalize(badCompanion)
          });
        }
      });

      // PESTS
      const attracts = (plant.attracts && plant.attracts !== 'character(0)')
        ? [plant.attracts]
        : ['None'];

      const repels = (plant.repels_distracts && plant.repels_distracts.length > 0)
        ? plant.repels_distracts
        : ['None'];

      pests.push({
        plant: capitalize(code),
        attracts,
        repels
      });
    }

    res.json({ tips, warnings, pests });

  } catch (err) {
    console.error('Error generating advisory:', err);
    res.status(500).json({ error: 'Failed to generate planting advice' });
  }
});

// Capitalize helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = router;
