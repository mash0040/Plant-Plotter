const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const dataInstanceSql = fs.readFileSync(
  path.join(repoRoot, 'plantplotter_db', 'data_instance.sql'),
  'utf8'
);

const userFacingAndDemoFiles = [
  'README.md',
  'plantplotter/src/components/Garden/Constants/PlantData.js',
  'plantplotter/src/components/Garden/LoadGardenModel.jsx',
  'plantplotter/src/components/Garden/PlantEditModal.jsx',
  'plantplotter/src/components/Garden/PlantLibrary.jsx',
  'plantplotter/src/components/Tracker/Constants/ActivitiesData.js',
  'plantplotter/src/components/Tracker/Constants/TrackerData.js',
  'plantplotter/src/components/Tracker/DetailedWeatherModal.jsx',
  'plantplotter/src/components/Tracker/WeatherWidget.jsx',
  'plantplotter/src/hooks/useWeather.js',
  'plantplotter/src/lib/gardenDataService.js',
  'plantplotter_db/data_instance.sql'
];

const findEncodingArtifacts = (contents) => {
  return [...contents].filter((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint === 0xfffd || (codePoint >= 0x80 && codePoint <= 0x9f);
  });
};

test('user-facing and demo files do not contain replacement or control-character encoding artifacts', () => {
  for (const relativePath of userFacingAndDemoFiles) {
    const contents = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert.deepEqual(findEncodingArtifacts(contents), [], relativePath);
  }
});

test('demo user seed insert is a single valid INSERT statement', () => {
  const userInsertStatements = dataInstanceSql.match(/^INSERT INTO users \(/gm) ?? [];

  assert.equal(userInsertStatements.length, 1);
  assert.doesNotMatch(dataInstanceSql, /\)\s+VALUES\s+INSERT INTO users/);
});

test('demo user preferences use the documented garden reminders key', () => {
  assert.match(dataInstanceSql, /"gardenReminders":true/);
  assert.doesNotMatch(dataInstanceSql, /gardenRemainders/);
});

test('seeded planted items reference matching plant library ids where available', () => {
  assert.match(dataInstanceSql, /\(20, 2, 'raspberry', 'Raspberry'/);
  assert.match(dataInstanceSql, /\(21, 2, 'raspberry', 'Raspberry'/);
  assert.match(dataInstanceSql, /\(44, 4, 'cherry', 'Cherry Tree'/);
  assert.match(dataInstanceSql, /\(45, 4, 'peach', 'Peach Tree'/);
  assert.match(dataInstanceSql, /\(46, 4, 'fig', 'Fig Tree'/);
  assert.doesNotMatch(dataInstanceSql, /NOTE: Using/);
});
