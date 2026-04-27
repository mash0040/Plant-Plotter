const test = require('node:test');
const assert = require('node:assert/strict');
const { validateGardenPayload } = require('../utils/gardenValidation');

const validGarden = {
  name: 'Kitchen Garden',
  description: 'A compact herb and vegetable bed',
  width: 10,
  height: 8,
  location: 'Backyard',
  soil_type: 'Loamy',
  status: 'Planning'
};

test('accepts a valid garden payload and trims text fields', () => {
  const result = validateGardenPayload({
    ...validGarden,
    name: '  Kitchen Garden  ',
    description: '  Fresh herbs  ',
    location: '  Patio  '
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.data, {
    name: 'Kitchen Garden',
    description: 'Fresh herbs',
    width: 10,
    height: 8,
    location: 'Patio',
    soil_type: 'Loamy',
    status: 'Planning'
  });
});

test('defaults optional garden fields when they are missing or empty', () => {
  const result = validateGardenPayload({
    name: 'Defaulted Garden',
    width: 4,
    height: 5,
    description: '',
    location: '',
    soil_type: '',
    status: ''
  });

  assert.equal(result.isValid, true);
  assert.equal(result.data.description, '');
  assert.equal(result.data.location, 'Garden');
  assert.equal(result.data.soil_type, 'Loamy');
  assert.equal(result.data.status, 'Active');
});

test('rejects missing, empty, invalid, and too-long garden names', () => {
  const cases = [
    { name: undefined, expected: 'Garden name is required' },
    { name: '', expected: 'Garden name is required' },
    { name: '   ', expected: 'Garden name is required' },
    { name: '[object Object]', expected: 'Garden name is invalid' },
    { name: 'x'.repeat(51), expected: 'Garden name must be 50 characters or fewer' }
  ];

  for (const { name, expected } of cases) {
    const result = validateGardenPayload({ ...validGarden, name });
    assert.equal(result.isValid, false);
    assert.equal(result.errors.name, expected);
  }
});

test('rejects invalid width and height values', () => {
  const invalidValues = [
    undefined,
    null,
    '',
    '   ',
    Number.NaN,
    Infinity,
    -1,
    0,
    101,
    1.5,
    true,
    {},
    []
  ];

  for (const value of invalidValues) {
    const widthResult = validateGardenPayload({ ...validGarden, width: value });
    assert.equal(widthResult.isValid, false);
    assert.ok(widthResult.errors.width, `expected width error for ${String(value)}`);

    const heightResult = validateGardenPayload({ ...validGarden, height: value });
    assert.equal(heightResult.isValid, false);
    assert.ok(heightResult.errors.height, `expected height error for ${String(value)}`);
  }
});

test('rejects overlong description and location values', () => {
  const descriptionResult = validateGardenPayload({
    ...validGarden,
    description: 'x'.repeat(1001)
  });
  assert.equal(descriptionResult.isValid, false);
  assert.equal(descriptionResult.errors.description, 'Description must be 1000 characters or fewer');

  const locationResult = validateGardenPayload({
    ...validGarden,
    location: 'x'.repeat(101)
  });
  assert.equal(locationResult.isValid, false);
  assert.equal(locationResult.errors.location, 'Location must be 100 characters or fewer');
});

test('rejects invalid soil type and status values', () => {
  const soilResult = validateGardenPayload({
    ...validGarden,
    soil_type: 'Concrete'
  });
  assert.equal(soilResult.isValid, false);
  assert.equal(soilResult.errors.soil_type, 'Soil type must be one of: Loamy, Clay, Sandy, Silt, Peat, Chalk');

  const statusResult = validateGardenPayload({
    ...validGarden,
    status: 'Archived'
  });
  assert.equal(statusResult.isValid, false);
  assert.equal(statusResult.errors.status, 'Status must be one of: Planning, Active, Dormant');
});
