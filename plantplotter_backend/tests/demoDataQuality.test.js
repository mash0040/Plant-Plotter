const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');

const repoRoot = path.resolve(__dirname, '..', '..');
const dataInstanceSql = fs.readFileSync(
  path.join(repoRoot, 'plantplotter_db', 'data_instance.sql'),
  'utf8'
);

// Read the seed's literal INSERT rows for fast CI checks. The Docker validator
// separately executes the actual SQL with MySQL's parser and foreign keys.
const seedRows = (table) => {
  const sql = dataInstanceSql.replace(/^\s*--[^\n]*/gm, '');
  const inserts = [...sql.matchAll(new RegExp(`INSERT INTO ${table}\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'gi'))];
  assert.ok(inserts.length, `Missing seed for ${table}`);
  return inserts.flatMap(([, columnList, values]) => {
    const columns = columnList.split(',').map(column => column.trim());
    const rowPattern = /\((?:[^'()]|'(?:''|\\.|[^'])*')*\)/g;
    const rows = [...values.matchAll(rowPattern)];
    assert.ok(rows.length, `No literal rows for ${table}`);
    assert.match(values.replace(rowPattern, ''), /^[\s,]*$/, `Unsupported row syntax for ${table}`);
    return rows.map(([row]) => {
      const fields = [];
      const contents = row.slice(1, -1);
      const literal = /\s*('(?:''|\\.|[^'])*'|NULL|TRUE|FALSE|-?\d+(?:\.\d+)?)\s*(?:,|$)/giy;
      let offset = 0;
      while (offset < contents.length) {
        literal.lastIndex = offset;
        const match = literal.exec(contents);
        assert.ok(match, `Unsupported value in ${table} at ${offset}`);
        const value = match[1];
        fields.push(value.startsWith("'") ? value.slice(1, -1).replace(/''/g, "'").replace(/\\(.)/g, '$1')
          : /^null$/i.test(value) ? null : /^true$/i.test(value) ? true : /^false$/i.test(value) ? false : Number(value));
        offset = literal.lastIndex;
      }
      assert.equal(fields.length, columns.length, `Column/value mismatch for ${table}`);
      return Object.fromEntries(columns.map((column, index) => [column, fields[index]]));
    });
  });
};

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

test('seed creates only the required demo user with an explicit ID and documented credentials', async () => {
  const users = seedRows('users');
  assert.equal(users.length, 1);
  const [user] = users;
  assert.equal(user.id, 1);
  assert.equal(user.role, 'user');
  assert.equal(user.is_active, true);
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const demoSection = readme.split('## Demo')[1]?.split('## ')[0];
  assert.ok(demoSection);
  const email = demoSection.match(/- Email:\s*(\S+)/)?.[1];
  const password = demoSection.match(/- Password:\s*(\S+)/)?.[1];
  assert.ok(email);
  assert.ok(password);
  assert.equal(user.email, email);
  assert.equal(await bcrypt.compare(password, user.password_hash), true);
});

test('seed leaves account preferences unset and never updates undeclared users', () => {
  for (const user of seedRows('users')) {
    assert.ok(user.preferences == null, 'No account-wide preference payload should be seeded');
  }
  assert.doesNotMatch(dataInstanceSql, /\bUPDATE\s+users\b/i);
});

test('every demo owner and garden reference resolves to an explicitly seeded record', () => {
  const users = new Set(seedRows('users').map(user => user.id));
  const gardens = new Map(seedRows('gardens').map(garden => [garden.id, garden]));
  for (const table of ['gardens', 'garden_tasks', 'garden_activities']) {
    for (const row of seedRows(table)) {
      assert.ok(users.has(row.user_id), `${table} ${row.id}: unknown user ${row.user_id}`);
      if (table !== 'gardens') {
        assert.ok(gardens.has(row.garden_id), `${table} ${row.id}: unknown garden ${row.garden_id}`);
        assert.equal(row.user_id, gardens.get(row.garden_id).user_id, `${table} ${row.id}: owner mismatch`);
      }
    }
  }
  for (const plant of seedRows('planted_items')) {
    assert.ok(gardens.has(plant.garden_id), `Plant ${plant.id}: unknown garden ${plant.garden_id}`);
  }
});

test('each showcase garden retains planted items, tasks, and activities', () => {
  const gardens = seedRows('gardens');
  assert.ok(gardens.length >= 5, 'Preserve the five showcase gardens');
  for (const [table, minimum] of [['planted_items', 65], ['garden_tasks', 23], ['garden_activities', 40]]) {
    const rows = seedRows(table);
    assert.ok(rows.length >= minimum, `Preserve the populated ${table} dataset`);
    for (const garden of gardens) {
      assert.ok(rows.some(row => row.garden_id === garden.id), `${garden.name}: missing ${table}`);
    }
  }
});

test('seeded planted items reference matching plant library ids where available', () => {
  assert.match(dataInstanceSql, /\(20, 2, 'raspberry', 'Raspberry'/);
  assert.match(dataInstanceSql, /\(21, 2, 'raspberry', 'Raspberry'/);
  assert.match(dataInstanceSql, /\(44, 4, 'cherry', 'Cherry Tree'/);
  assert.match(dataInstanceSql, /\(45, 4, 'peach', 'Peach Tree'/);
  assert.match(dataInstanceSql, /\(46, 4, 'fig', 'Fig Tree'/);
  assert.doesNotMatch(dataInstanceSql, /NOTE: Using/);
});
