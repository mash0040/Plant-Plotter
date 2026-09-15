const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { loadDemoSeed } = require('../utils/demoSeedData');
const { restoreDemoData } = require('../services/demoRestoreService');
const { main } = require('../scripts/restoreDemoData');

test('CLI help and invalid arguments do not connect to a database', async t => {
  const log = t.mock.method(console, 'log', () => {});
  await main(['--help']);
  assert.match(log.mock.calls[0].arguments[0], /Usage:/);
  await assert.rejects(main(['--unknown']), /Unknown restore argument/);
});

const source = readFileSync(path.resolve(__dirname, '../../plantplotter_db/data_instance.sql'), 'utf8');
test('restore dataset comes only from canonical garden/planner/tracker rows', () => {
  const data = loadDemoSeed();
  assert.deepEqual(Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length])), {
    gardens: 5, planted_items: 65, garden_tasks: 23, garden_activities: 40
  });
  assert.ok(!data.users && !data.plant_library);
  assert.equal(data.gardens[0].demo_showcase_key, 'garden-1');
  assert.equal(data.garden_tasks[0].demo_showcase_key, 'task-1');
  assert.equal(data.garden_activities[0].demo_showcase_key, 'activity-1');
});

for (const [description, changed] of [
  ['wrong identity', source.replace('demo@plantplotter.com', 'someone@example.com')],
  ['wrong owner', source.replace("('garden-1', 1, 1,", "('garden-1', 1, 2,")],
  ['missing garden', source.replace("(1, 1, 'tomato'", "(1, 999, 'tomato'")],
  ['wrong key', source.replace("'garden-1'", "'visitor-record'")],
  ['duplicate ID', source.replace("'garden-2', 2,", "'garden-1', 1,")],
  ['expression', source.replace("'garden-1', 1,", "'garden-1', 1 + 0,")],
  ['unexpected column', source.replace('id, user_id, name, description', 'id, user_id, unexpected, description')],
  ['missing table', source.replace('INSERT INTO garden_tasks', 'INSERT INTO unused_tasks')]
]) {
  test(`rejects malformed seed before any restore: ${description}`, () => {
    assert.throws(() => loadDemoSeed(changed));
  });
}

const fakePool = (options = {}) => {
  const events = [];
  const inserts = [];
  let nextId = 1000;
  const connection = {
    execute: async (raw, params) => {
      const sql = raw.replace(/\s+/g, ' ').trim();
      events.push({ sql, params });
      if (options.failAt && sql.startsWith(options.failAt)) throw Object.assign(new Error('Simulated failure'), { code: 'ER_BAD_FIELD_ERROR' });
      if (sql.startsWith('SET SESSION')) return [{}];
      if (sql.startsWith('SELECT @@SESSION')) return [[{ foreignKeys: options.foreignKeys ?? 1 }]];
      if (sql.includes('information_schema.TABLES')) return [['users', 'gardens', 'planted_items', 'garden_tasks', 'garden_activities']
        .map(TABLE_NAME => ({ TABLE_NAME, ENGINE: options.engine || 'InnoDB' }))];
      if (sql.includes('LOWER(TRIM(email))')) return [options.candidates || [{ id: 7 }]];
      if (sql.startsWith('SELECT id, email')) {
        assert.deepEqual(params, [7]);
        assert.match(sql, /FOR UPDATE$/);
        return [options.lockedUsers || [{ id: 7, email: '  DEMO@plantplotter.com  ', is_active: 1 }]];
      }
      if (sql.startsWith('SELECT id FROM gardens')) {
        assert.deepEqual(params, [7]);
        assert.match(sql, /FOR UPDATE$/);
        return [[{ id: 99 }]];
      }
      if (sql.startsWith('SELECT record.user_id')) {
        assert.deepEqual(params, [7, 7]);
        assert.match(sql, /FOR UPDATE$/);
        return [options.ownership || [{ user_id: 7, garden_owner: 7 }]];
      }
      if (sql.startsWith('DELETE')) {
        assert.deepEqual(params, [7], 'Deletion must use the stored demo ID, not seed ID 1');
        assert.match(sql, /(?:garden\.)?user_id = \?$/);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT')) {
        const [, table, fields] = sql.match(/^INSERT INTO (\w+) \(([^)]+)\)/);
        const columns = fields.split(', ');
        assert.ok(!columns.includes('id'), 'Never reuse global seed IDs');
        const row = Object.fromEntries(columns.map((field, index) => [field, params[index]]));
        inserts.push({ table, row, id: nextId });
        return [{ insertId: nextId++ }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    beginTransaction: async () => { events.push('begin'); },
    commit: async () => { events.push('commit'); if (options.commitFailure) throw new Error('Commit failed'); },
    rollback: async () => { events.push('rollback'); if (options.rollbackFailure) throw new Error('Rollback failed'); },
    release: () => { events.push('release'); },
    destroy: () => { events.push('destroy'); }
  };
  return { getConnection: async () => connection, events, inserts };
};

test('maps canonical relationships to fresh IDs and commits/release exactly once', async () => {
  const pool = fakePool();
  const counts = await restoreDemoData(pool);
  assert.equal(counts.gardens, 5);
  assert.deepEqual(pool.events.filter(event => typeof event === 'string'), ['begin', 'commit', 'release']);
  const seed = loadDemoSeed();
  const gardens = pool.inserts.filter(({ table }) => table === 'gardens');
  for (const [table, rows] of Object.entries(seed)) {
    const inserted = pool.inserts.filter(insert => insert.table === table);
    assert.equal(inserted.length, rows.length);
    rows.forEach((row, index) => {
      const { id, ...expected } = row;
      if (Object.hasOwn(expected, 'user_id')) expected.user_id = 7;
      if (Object.hasOwn(expected, 'garden_id')) expected.garden_id = gardens.find(garden => garden.row.demo_showcase_key === `garden-${row.garden_id}`).id;
      assert.deepEqual(inserted[index].row, expected);
    });
  }
});

for (const options of [
  { candidates: [] }, { candidates: [{ id: 7 }, { id: 9 }] },
  { lockedUsers: [] }, { lockedUsers: [{ id: 7, email: 'normal@example.com', is_active: 1 }] },
  { lockedUsers: [{ id: 7, email: 'demo@plantplotter.com', is_active: 0 }] },
  { ownership: [{ user_id: 12, garden_owner: 7 }] },
  { ownership: [{ user_id: 7, garden_owner: 12 }] },
  { foreignKeys: 0 }, { engine: 'MyISAM' }
]) {
  test(`refuses unsafe restore before deletion: ${JSON.stringify(options)}`, async () => {
    const pool = fakePool(options);
    await assert.rejects(restoreDemoData(pool), { code: 'DEMO_RESTORE_REFUSED' });
    assert.ok(pool.events.every(event => !/^(DELETE|INSERT)/.test(event.sql || '')));
    assert.equal(pool.events.at(-1), 'release');
    assert.ok(!pool.events.includes('commit'));
    if (pool.events.includes('begin')) assert.ok(pool.events.includes('rollback'));
  });
}

for (const table of ['gardens', 'planted_items', 'garden_tasks', 'garden_activities']) {
  test(`rolls back and releases on failed insertion into ${table}`, async () => {
    const pool = fakePool({ failAt: `INSERT INTO ${table}` });
    await assert.rejects(restoreDemoData(pool));
    assert.deepEqual(pool.events.filter(event => typeof event === 'string'), ['begin', 'rollback', 'release']);
  });
}

test('destroys the connection when rollback fails', async () => {
  const pool = fakePool({ failAt: 'DELETE FROM gardens', rollbackFailure: true });
  await assert.rejects(restoreDemoData(pool));
  assert.deepEqual(pool.events.filter(event => typeof event === 'string'), ['begin', 'rollback', 'destroy', 'release']);
});

test('a failed commit is not reported as a successful restore', async () => {
  const pool = fakePool({ commitFailure: true });
  await assert.rejects(restoreDemoData(pool), /Commit failed/);
  assert.ok(pool.events.includes('rollback'));
  assert.equal(pool.events.at(-1), 'release');
});
