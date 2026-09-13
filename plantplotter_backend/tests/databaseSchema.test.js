const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const databaseDir = path.resolve(__dirname, '../../plantplotter_db');
const readSql = (file) => readFileSync(path.join(databaseDir, file), 'utf8').replace(/--[^\n]*/g, '');
const schema = readSql('plantPlotterSchema.sql');
const normalize = (sql) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
const table = (name) => {
  const definition = schema.match(new RegExp(`CREATE TABLE ${name} \\(([\\s\\S]*?)\\n\\)`));
  assert.ok(definition, `Missing table ${name}`);
  return definition[1];
};

test('fresh schema contains the columns used by current backend flows', () => {
  // A contract inventory, not a SQL parser. The Docker check executes the real SQL.
  const required = {
    users: 'id username email password_hash session_version role avatar preferences is_active created_at updated_at reset_password_token_hash reset_password_expires',
    gardens: 'id user_id name description width height grid_size soil_type location status plant_count created_at updated_at',
    planted_items: 'id garden_id plant_id plant_name plant_emoji plant_size plant_category x_position y_position planted_date notes created_at updated_at',
    garden_activities: 'id garden_id user_id activity_type plant_name activity_date activity_time notes created_at updated_at',
    garden_tasks: 'id garden_id user_id title description notes plant_name task_type status priority due_date completed_at estimated_duration is_recurring recurring_pattern created_at updated_at',
    plant_library: 'id name emoji size category description spacing sunlight water_needs days_to_maturity soil_types companion_plants avoid_plants difficulty planting_depth created_at updated_at'
  };
  for (const [name, columns] of Object.entries(required)) {
    for (const column of columns.split(' ')) {
      assert.match(table(name), new RegExp(`^\\s*${column}\\s+`, 'm'), `${name}.${column}`);
    }
  }
  assert.doesNotMatch(table('users'), /\bpassword_reset_(?:token|expires)\b/);
});

test('fresh reset, session, and notes columns match established upgrade definitions', () => {
  for (const [file, name] of [
    ['password_reset_migration.sql', 'users'],
    ['session_version_migration.sql', 'users'],
    ['task_notes_migration.sql', 'garden_tasks']
  ]) {
    const additions = [...readSql(file).matchAll(/ADD COLUMN ([^;'\r\n]+)/g)];
    assert.ok(additions.length, `No column additions found in ${file}`);
    for (const [, addition] of additions) {
      const definition = addition.replace(/\s+AFTER\s+\w+$/i, '');
      assert.ok(normalize(table(name)).includes(normalize(definition)), `${file}: ${definition}`);
    }
  }
});

test('fresh schema includes each established reset and performance index', () => {
  const indexes = [...(readSql('password_reset_migration.sql') + readSql('performance_indexes.sql'))
    .matchAll(/CREATE INDEX (\w+) ON (\w+) \(([^)]+)\)/g)];
  assert.equal(indexes.length, 7);
  for (const [, index, name, columns] of indexes) {
    assert.ok(normalize(table(name)).includes(normalize(`INDEX ${index} (${columns})`)), index);
  }
});

test('fresh task types and recurrence constraint match upgrade contracts', () => {
  const types = readSql('task_type_options_migration.sql').match(/MODIFY (task_type ENUM\([\s\S]+?\) NOT NULL)/);
  const constraint = readSql('task_recurrence_migration.sql').match(/ADD (CONSTRAINT[\s\S]+?);/);
  assert.ok(types);
  assert.ok(constraint);
  // Ignore whitespace around enum punctuation as well as indentation.
  const compact = (value) => normalize(value).replace(/\s*([(),])\s*/g, '$1');
  assert.ok(compact(table('garden_tasks')).includes(compact(types[1])));
  assert.ok(compact(table('garden_tasks')).includes(compact(constraint[1])));
  assert.match(table('garden_tasks'), /is_recurring BOOLEAN NOT NULL DEFAULT FALSE/);
});

test('setup docs distinguish fresh installation from every retained upgrade file', () => {
  const docs = readFileSync(path.join(databaseDir, 'README.md'), 'utf8');
  const fresh = docs.split('## Fresh Installation')[1]?.split('## Migrations')[0];
  assert.ok(fresh);
  assert.match(fresh, /Fresh installations must skip all upgrade migrations/);
  assert.match(fresh, /< plantPlotterSchema\.sql/);
  assert.match(fresh, /< data_instance\.sql/);
  assert.doesNotMatch(fresh, /< \w*migration\.sql|< performance_indexes\.sql/);
  for (const file of readdirSync(databaseDir).filter(name => name.endsWith('.sql'))) {
    assert.ok(docs.includes(`\`${file}\``), `Undocumented SQL file: ${file}`);
  }
  const rootDocs = readFileSync(path.resolve(databaseDir, '../README.md'), 'utf8');
  assert.match(rootDocs, /Fresh installations must skip all upgrade migrations/);
  assert.doesNotMatch(rootDocs, /Apply the relevant migrations after the base schema/);
});
