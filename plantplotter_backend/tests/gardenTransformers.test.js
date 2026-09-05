const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCompletePlantData,
  buildSinglePlantData,
  generateGardenSummary,
  generateRecommendations,
  transformCreatedGarden,
  transformDetailedGarden,
  transformGardenForList,
  transformGardenSummary,
  transformPlantedItem,
  transformUpdatedGarden
} = require('../utils/gardenTransformers');

const createdAt = new Date('2026-04-01T10:00:00.000Z');
const updatedAt = new Date('2026-04-05T10:00:00.000Z');

const garden = {
  id: 7,
  name: 'Kitchen Garden',
  description: null,
  width: 10,
  height: 5,
  soil_type: null,
  location: null,
  status: null,
  plant_count: 3,
  created_at: createdAt,
  updated_at: updatedAt
};

const plantedItems = [
  {
    id: 11,
    garden_id: 7,
    plant_id: 'tomato',
    plant_name: 'Tomato',
    plant_emoji: 'T',
    plant_size: 2,
    plant_category: 'vegetable',
    x_position: 1,
    y_position: 2,
    planted_date: '2026-04-03',
    notes: 'Needs stakes',
    created_at: new Date('2026-04-03T10:00:00.000Z'),
    updated_at: updatedAt
  },
  {
    id: 12,
    garden_id: 7,
    plant_id: 'basil',
    plant_name: 'Basil',
    plant_emoji: 'B',
    plant_size: 1,
    plant_category: 'herb',
    x_position: 3,
    y_position: 4,
    planted_date: '2026-04-04',
    notes: '',
    created_at: new Date('2026-04-04T10:00:00.000Z'),
    updated_at: updatedAt
  }
];

test('transforms planted item rows into the frontend response shape', () => {
  assert.deepEqual(transformPlantedItem(plantedItems[0]), {
    id: 11,
    plantId: 'tomato',
    name: 'Tomato',
    emoji: 'T',
    size: 2,
    category: 'vegetable',
    xPosition: 1,
    yPosition: 2,
    plantedDate: '2026-04-03',
    notes: 'Needs stakes',
    created_at: plantedItems[0].created_at,
    updated_at: updatedAt
  });
});

test('builds garden summaries from planted item rows', () => {
  const summary = generateGardenSummary(garden, plantedItems);

  assert.equal(summary.totalPlants, 2);
  assert.equal(summary.totalArea, 50);
  assert.equal(summary.usedSpace, 5);
  assert.deepEqual(summary.plantCategories, {
    vegetable: 1,
    herb: 1
  });
  assert.equal(summary.averagePlantSize, 1.5);
  assert.equal(summary.spaceUtilization, 10);
});

test('transforms full garden list rows with legacy aliases intact', () => {
  const transformedGarden = transformGardenForList(garden, plantedItems);

  assert.equal(transformedGarden.description, '');
  assert.deepEqual(transformedGarden.dimensions, { width: 10, height: 5 });
  assert.equal(transformedGarden.soil_type, 'Loamy');
  assert.equal(transformedGarden.soilType, 'Loamy');
  assert.equal(transformedGarden.location, null);
  assert.equal(transformedGarden.status, 'Active');
  assert.equal(transformedGarden.plant_count, 2);
  assert.equal(transformedGarden.plantCount, 2);
  assert.equal(transformedGarden.createdAt, createdAt);
  assert.equal(transformedGarden.updatedAt, updatedAt);
  assert.equal(transformedGarden.plantedItems.length, 2);
});

test('preserves a missing location in lightweight garden summaries', () => {
  const transformedGarden = transformGardenSummary({
    ...garden,
    plant_count: '4'
  });

  assert.equal(transformedGarden.location, null);
  assert.equal(transformedGarden.plant_count, 4);
  assert.equal(transformedGarden.plantCount, 4);
  assert.deepEqual(transformedGarden.dimensions, { width: 10, height: 5 });
});

test('transforms detailed gardens with analytics and recommendations', () => {
  const transformedGarden = transformDetailedGarden(garden, plantedItems);

  assert.equal(transformedGarden.summary.totalPlants, 2);
  assert.deepEqual(transformedGarden.analytics.categoryBreakdown, {
    vegetable: 1,
    herb: 1
  });
  assert.equal(transformedGarden.analytics.spaceAnalysis.availableSpace, 45);
  assert.deepEqual(
    transformedGarden.analytics.plantingHistory.map((plant) => plant.plantName),
    ['Basil', 'Tomato']
  );
  assert.ok(transformedGarden.analytics.recommendations.some((recommendation) => (
    recommendation.type === 'space'
  )));
});

test('returns create and update response shapes used by garden routes', () => {
  const createdGarden = transformCreatedGarden({
    ...garden,
    description: 'Sunny bed',
    soil_type: 'Clay',
    location: 'Patio',
    status: 'Planning'
  });
  const updatedGarden = transformUpdatedGarden({
    ...garden,
    description: 'Updated bed',
    soil_type: 'Sandy',
    location: 'Balcony',
    status: 'Dormant',
    plant_count: 5
  });

  assert.equal(createdGarden.description, 'Sunny bed');
  assert.equal(createdGarden.plant_count, 0);
  assert.equal(createdGarden.plantCount, 0);
  assert.deepEqual(createdGarden.plantedItems, []);
  assert.equal(updatedGarden.description, 'Updated bed');
  assert.equal(updatedGarden.plant_count, 5);
  assert.equal(updatedGarden.plantCount, 5);
});

test('generates high-utilization and maintenance recommendations', () => {
  const crowdedPlants = Array.from({ length: 11 }, (_, index) => ({
    plant_name: `Plant ${index}`,
    plant_category: 'vegetable',
    plant_size: 3
  }));

  const recommendations = generateRecommendations({ width: 5, height: 5 }, crowdedPlants);

  assert.ok(recommendations.some((recommendation) => recommendation.priority === 'high'));
  assert.ok(recommendations.some((recommendation) => recommendation.type === 'maintenance'));
});

test('builds sanitized plant data for complete garden saves', () => {
  const plantData = buildCompletePlantData('9', {
    plant_id: 'x'.repeat(120),
    plant_name: 'y'.repeat(300),
    plant_emoji: 'seedling',
    plant_size: '0',
    plant_category: 'vegetable'.repeat(20),
    x_position: '-5',
    y_position: '4',
    planted_date: '2026-04-10',
    notes: 'z'.repeat(1200)
  });

  assert.equal(plantData.garden_id, 9);
  assert.equal(plantData.plant_id.length, 100);
  assert.equal(plantData.plant_name.length, 255);
  assert.equal(plantData.plant_emoji, 'seedling');
  assert.equal(plantData.plant_size, 1);
  assert.equal(plantData.plant_category.length, 100);
  assert.equal(plantData.x_position, 0);
  assert.equal(plantData.y_position, 4);
  assert.equal(plantData.planted_date, '2026-04-10');
  assert.equal(plantData.notes.length, 1000);
});

test('builds plant data for single plant creates with legacy defaults', () => {
  const plantData = buildSinglePlantData('9', {
    plant_name: '  Tomato  ',
    plant_size: '2',
    x_position: '3',
    y_position: '',
    notes: '  Needs water  '
  });

  assert.equal(plantData.garden_id, 9);
  assert.equal(plantData.plant_id, 'unknown');
  assert.equal(plantData.plant_name, 'Tomato');
  assert.equal(plantData.plant_size, 2);
  assert.equal(plantData.plant_category, 'other');
  assert.equal(plantData.x_position, 3);
  assert.equal(plantData.y_position, 0);
  assert.equal(plantData.notes, 'Needs water');
  assert.match(plantData.planted_date, /^\d{4}-\d{2}-\d{2}$/);
});
