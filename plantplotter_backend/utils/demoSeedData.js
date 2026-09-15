const { readFileSync } = require('node:fs');
const path = require('node:path');
const { isProtectedDemoAccount } = require('./protectedDemoAccount');

const seedPath = path.resolve(__dirname, '../../plantplotter_db/data_instance.sql');
const TABLE_COLUMNS = {
  gardens: 'demo_showcase_key id user_id name description width height grid_size soil_type location status plant_count',
  planted_items: 'id garden_id plant_id plant_name plant_emoji plant_size plant_category x_position y_position planted_date notes',
  garden_tasks: 'demo_showcase_key id garden_id user_id title description plant_name task_type status priority due_date estimated_duration is_recurring recurring_pattern',
  garden_activities: 'demo_showcase_key id garden_id user_id activity_type plant_name activity_date activity_time notes'
};

// Read literal seed rows; never execute the seed's SQL, user insert, or catalogue updates.
const parseSeedRows = (source, table) => {
  if (!['users', 'plant_library', ...Object.keys(TABLE_COLUMNS)].includes(table)) throw new Error('Unsupported seed table');
  const sql = source.replace(/^\s*--[^\n]*/gm, '');
  const inserts = [...sql.matchAll(new RegExp(`INSERT INTO ${table}\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`, 'gi'))];
  if (inserts.length !== 1) throw new Error(`Expected one seed INSERT for ${table}`);
  const [, columnList, values] = inserts[0];
  const columns = columnList.split(',').map(column => column.trim());
  if (columns.some(column => !/^[a-z_]+$/.test(column)) || new Set(columns).size !== columns.length) {
    throw new Error(`Invalid seed columns for ${table}`);
  }
  const rowPattern = /\((?:[^'()]|'(?:''|\\.|[^'])*')*\)/g;
  const rows = [...values.matchAll(rowPattern)];
  if (!rows.length || !/^[\s,]*$/.test(values.replace(rowPattern, ''))) throw new Error(`Invalid seed rows for ${table}`);
  return rows.map(([row]) => {
    const fields = [];
    const contents = row.slice(1, -1);
    const literal = /\s*('(?:''|\\.|[^'])*'|NULL|TRUE|FALSE|-?\d+(?:\.\d+)?)\s*(?:,|$)/giy;
    let offset = 0;
    while (offset < contents.length) {
      literal.lastIndex = offset;
      const match = literal.exec(contents);
      if (!match) throw new Error(`Non-literal seed value in ${table}`);
      const value = match[1];
      fields.push(value.startsWith("'") ? value.slice(1, -1).replace(/''/g, "'").replace(/\\(.)/g, '$1')
        : /^null$/i.test(value) ? null : /^true$/i.test(value) ? true : /^false$/i.test(value) ? false : Number(value));
      offset = literal.lastIndex;
    }
    if (fields.length !== columns.length) throw new Error(`Column/value mismatch in ${table}`);
    return Object.fromEntries(columns.map((column, index) => [column, fields[index]]));
  });
};

const loadDemoSeed = (source = readFileSync(seedPath, 'utf8')) => {
  const users = parseSeedRows(source, 'users');
  if (users.length !== 1 || !isProtectedDemoAccount(users[0])) throw new Error('Seed must have exactly one protected demo owner');
  const data = Object.fromEntries(Object.keys(TABLE_COLUMNS).map(table => [table, parseSeedRows(source, table)]));
  const gardenIds = new Set(data.gardens.map(row => row.id));
  for (const [table, rows] of Object.entries(data)) {
    const ids = new Set();
    const prefix = { gardens: 'garden', garden_tasks: 'task', garden_activities: 'activity' }[table];
    for (const row of rows) {
      const columns = TABLE_COLUMNS[table].split(' ');
      if (Object.keys(row).length !== columns.length || columns.some(column => !Object.hasOwn(row, column))) {
        throw new Error(`Unexpected canonical columns in ${table}`);
      }
      if (!Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id)) throw new Error(`Invalid or duplicate seed ID in ${table}`);
      ids.add(row.id);
      if (table !== 'planted_items' && row.user_id !== users[0].id) throw new Error(`Unexpected seed owner in ${table}`);
      if (table !== 'gardens' && !gardenIds.has(row.garden_id)) throw new Error(`Missing seed garden in ${table}`);
      if (prefix && row.demo_showcase_key !== `${prefix}-${row.id}`) throw new Error(`Invalid showcase key in ${table}`);
    }
  }
  return data;
};

module.exports = { loadDemoSeed, parseSeedRows };
