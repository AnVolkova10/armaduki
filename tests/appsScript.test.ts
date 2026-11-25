// apps-script/Code.gs in Node, against in-memory sheets (see helpers/appsScriptHarness.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSheet,
  get,
  LEGACY_PLAYER_HEADERS as HEADERS,
  loadAppsScript,
  post,
  storeCell,
  TEAM_HEADERS,
  type MemorySheet,
  type Row,
} from './helpers/appsScriptHarness.ts';

type Rows = Record<string, unknown>[];

const ana: Row = [1, 'Ana P', 'Ana', 'GK', 7, '', 'good', '2', '', '{}'];
const bea: Row = [2, '', 'Bea', 'MID', 5, '', 'no', '', '', ''];
const column = (sheet: MemorySheet, header: string) => sheet.data()[0].indexOf(header);

test('read renames the legacy db sheet, adds the missing columns and returns the rows', () => {
  const db = createSheet('db', [HEADERS, ana, bea]);
  const env = loadAppsScript([db]);
  const rows = get(env, 'read') as Rows;

  assert.equal(db.getName(), 'Players');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].nickname, 'Ana');
  assert.equal(rows[0].wantswith, '2');
  assert.ok('shirtnumber' in rows[0], 'newer columns are appended');
  assert.ok(env.sheet('Teams') && env.sheet('MatchHistory'), 'missing tabs are created');
});

test('a second read skips the schema check thanks to the cache', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players]);
  get(env, 'read');
  const teams = env.sheet('Teams')!;
  const before = players.calls + teams.calls;
  get(env, 'read');
  assert.ok(players.calls + teams.calls - before <= 1, 'a cached read makes one sheet call');
});

test('readAll returns players and teams in one request, the same as read and readTeams', () => {
  const teams = createSheet('Teams', [TEAM_HEADERS, ['armaduki', 'Armaduki', '#e9252a', '', '']]);
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana, bea]), teams]);

  const all = get(env, 'readAll') as { players: Rows; teams: Rows; teamsError?: string };

  assert.deepEqual(all.players, get(env, 'read'));
  assert.deepEqual(all.teams, get(env, 'readTeams'));
  assert.equal(all.teams[0].color2, '#e9252a');
  assert.equal(all.teamsError, undefined);
});

test('readAll still returns the players when the Teams tab fails', () => {
  const teams = createSheet('Teams', [TEAM_HEADERS]);
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana]), teams]);
  get(env, 'read'); // schema ready, so the next read goes straight to the data
  teams.getDataRange = () => {
    throw new Error('Teams is broken');
  };

  const all = get(env, 'readAll') as { players: Rows; teams: Rows; teamsError?: string };

  assert.equal(all.players.length, 1);
  assert.deepEqual(all.teams, []);
  assert.match(all.teamsError ?? '', /Teams is broken/);
});

test('an unknown GET action answers an error object (the app falls back on it)', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS])]);
  assert.deepEqual(get(env, 'nope'), { error: 'Action unknown' });
});

test('migrateSchema returns ok and always runs', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS])]);
  const result = get(env, 'migrateSchema') as { ok: boolean; action: string; sheets: { players: string } };
  assert.equal(result.ok, true);
  assert.equal(result.action, 'migrateSchema');
  assert.equal(result.sheets.players, 'Players');
});

test('add appends a row aligned with the headers and answers Added', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players]);
  const answer = post(env, {
    action: 'add',
    id: '5',
    nickname: 'Caro',
    role: 'ATT',
    rating: 8,
    wantsWith: '1',
    attributes: '{"pace":"high"}',
    shirtNumber: '9',
  });

  assert.equal(answer, 'Added');
  const row = players.data().at(-1)!;
  assert.equal(row[column(players, 'id')], '5');
  assert.equal(row[column(players, 'nickname')], 'Caro');
  assert.equal(row[column(players, 'shirtNumber')], '9');
  assert.equal(row[column(players, 'name')], '');
});

test('add refuses an id that already exists, or no id', () => {
  const players = createSheet('Players', [HEADERS, [5, '', 'Ana', 'GK', 7, '', 'good', '', '', '']]);
  const env = loadAppsScript([players]);
  assert.match(post(env, { action: 'add', id: '5', nickname: 'Dup' }), /^Error: id 5 already exists/);
  assert.match(post(env, { action: 'add', nickname: 'NoId' }), /^Error: missing id/);
  assert.equal(players.data().length, 2);
});

test('update only touches the columns it receives', () => {
  const players = createSheet('Players', [
    HEADERS,
    [3, 'Full Name', 'Ana', 'GK', 7, 'data:img', 'good', '1|2', '4', '{"pace":"high"}'],
  ]);
  const env = loadAppsScript([players]);

  assert.equal(post(env, { action: 'update', id: '3', wantsWith: '' }), 'Updated');
  const row = players.data()[1];
  assert.equal(row[column(players, 'wantsWith')], '');
  assert.equal(row[column(players, 'avoidsWith')], '4');
  assert.equal(row[column(players, 'avatar')], 'data:img');
  assert.equal(row[column(players, 'name')], 'Full Name');
});

test('update finds ids stored as numbers or with spaces, with the id column anywhere', () => {
  const players = createSheet('Players', [
    ['nickname', 'role', 'id', 'rating'],
    ['Ana', 'GK', ' 12 ', 5],
    ['Bea', 'MID', 13, 6],
  ]);
  const env = loadAppsScript([players]);

  assert.equal(post(env, { action: 'update', id: '13', rating: 9 }), 'Updated');
  assert.equal(post(env, { action: 'update', id: '12', rating: 2 }), 'Updated');
  assert.equal(players.data()[2][3], 9);
  assert.equal(players.data()[1][3], 2);
});

test('update of an unknown id says so', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])]);
  assert.equal(post(env, { action: 'update', id: '99', rating: 1 }), 'ID not found for update');
});

test('delete removes the row; deleting it again answers ID not found', () => {
  const players = createSheet('Players', [HEADERS, ana, bea]);
  const env = loadAppsScript([players]);

  assert.equal(post(env, { action: 'delete', id: '1' }), 'Deleted');
  assert.equal(players.data().length, 2);
  assert.equal(players.data()[1][2], 'Bea');
  assert.equal(post(env, { action: 'delete', id: '1' }), 'ID not found');
});

test('writes take and release the script lock', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS])]);
  post(env, { action: 'add', id: '1', nickname: 'Ana' });
  const locks = env.lockEvents.filter((event) => event === 'lock').length;
  const unlocks = env.lockEvents.filter((event) => event === 'unlock').length;
  assert.ok(locks >= 1 && locks === unlocks, `lock/unlock mismatch ${locks}/${unlocks}`);
});

test('readTeams fills defaults and skips rows without teamId', () => {
  const teams = createSheet('Teams', [TEAM_HEADERS, ['armaduki', '', '#e9252a', '', ''], ['', 'Ghost', '', '', '']]);
  const env = loadAppsScript([createSheet('Players', [HEADERS]), teams]);
  assert.deepEqual(get(env, 'readTeams'), [
    { teamId: 'armaduki', name: 'armaduki', color1: '#e9252a', color2: '#e9252a', crest: '' },
  ]);
});

test('unknown POST action and a broken body are errors', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS])]);
  assert.equal(post(env, { action: 'nope', id: '1' }), 'Action unknown');
  assert.match(env.doPost({ postData: { contents: '{bad json' } }).content, /^Error: /);
});

test('the spreadsheet id comes from Script Properties and is opened once per request', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])]);
  assert.equal(post(env, { action: 'update', id: '1', rating: 8 }), 'Updated');
  assert.deepEqual(env.openedIds, ['test-sheet-id']);
});

test('without the SPREADSHEET_ID property, reads and writes fail loudly', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS])], { spreadsheetId: null });
  assert.match((get(env, 'read') as { error: string }).error, /Missing script property SPREADSHEET_ID/);
  assert.match((get(env, 'readAll') as { error: string }).error, /Missing script property SPREADSHEET_ID/);
  assert.match(post(env, { action: 'update', id: '1', rating: 8 }), /^Error: .*Missing script property SPREADSHEET_ID/);
});

// ---------------------------------------------------------------------------
// Access key (Sprint 4). The real key lives in Script Properties; tests use their own word.
// ---------------------------------------------------------------------------
const KEY = 'pelota-de-trapo';

test('with ACCESS_KEY set, every GET without the right key is refused before the sheet is opened', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])], { accessKey: KEY });

  for (const action of ['readAll', 'read', 'readTeams', 'migrateSchema', 'migratePlayersSheet', 'nope', undefined]) {
    assert.deepEqual(get(env, action), { error: 'unauthorized' }, `${action} without key`);
    assert.deepEqual(get(env, action, 'wrong'), { error: 'unauthorized' }, `${action} with a wrong key`);
  }
  assert.deepEqual(env.openedIds, [], 'the spreadsheet was never opened');
});

test('with ACCESS_KEY set, every POST without the right key is refused and writes nothing', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players], { accessKey: KEY });

  for (const action of ['add', 'update', 'delete', 'addTeam', 'addGroup', 'migrateSchema', 'readTeams', 'nope']) {
    assert.equal(post(env, { action, id: '1', rating: 2 }), 'Error: unauthorized');
    assert.equal(post(env, { action, id: '1', rating: 2, key: 'wrong' }), 'Error: unauthorized');
  }
  assert.deepEqual(env.openedIds, []);
  assert.equal(players.data().length, 2);
  assert.equal(players.data()[1][4], 7);
});

test('the right key reads and saves, and is never written to the sheet', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players], { accessKey: KEY });

  assert.equal((get(env, 'readAll', KEY) as { players: Rows }).players.length, 1);
  assert.equal(post(env, { action: 'update', id: '1', rating: 9, key: KEY }), 'Updated');
  assert.equal(post(env, { action: 'add', id: '2', nickname: 'Bea', key: ` ${KEY} ` }), 'Added', 'spaces around are fine');
  assert.equal(players.data()[1][4], 9);
  assert.ok(!JSON.stringify(players.data()).includes(KEY), 'the key is not stored in any cell');
});

test('spaces typed around the key in the property do not lock anyone out', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])], { accessKey: `  ${KEY} ` });
  assert.equal((get(env, 'read', KEY) as Rows).length, 1);
  assert.deepEqual(get(env, 'read', 'wrong'), { error: 'unauthorized' });

  const blank = loadAppsScript([createSheet('Players', [HEADERS, ana])], { accessKey: '   ' });
  assert.equal((get(blank, 'read') as Rows).length, 1, 'a property with only spaces is no key');
});

test('without ACCESS_KEY everything stays open, with or without a key in the request', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])], { accessKey: '' });
  assert.equal((get(env, 'read') as Rows).length, 1);
  assert.equal((get(env, 'read', 'anything') as Rows).length, 1);
  assert.equal(post(env, { action: 'update', id: '1', rating: 3, key: 'anything' }), 'Updated');
});

test('setting the key later locks requests that were open before', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])]);
  assert.equal((get(env, 'read') as Rows).length, 1);
  env.setAccessKey(KEY);
  assert.deepEqual(get(env, 'read'), { error: 'unauthorized' });
  assert.equal((get(env, 'read', KEY) as Rows).length, 1);
});

// ---------------------------------------------------------------------------
// Sprint 6: groups, birth dates, notes, and teams and groups made from the player form.
// ---------------------------------------------------------------------------

const GROUP_HEADERS = ['groupId', 'name', 'place', 'notes'];
type ReadAll = { players: Rows; teams: Rows; groups: Rows; teamsError?: string; groupsError?: string };

test('the sheet stand-in turns date-like text into dates, like Sheets, unless it starts with an apostrophe', () => {
  assert.ok(storeCell('1994-03') instanceof Date);
  assert.ok(storeCell('20/11') instanceof Date);
  assert.equal(storeCell("'1994-03"), '1994-03');
  assert.equal(storeCell('1994'), '1994');
});

test('readAll always answers groups: the app reads the key as a backend that saves them', () => {
  const groups = createSheet('Groups', [
    GROUP_HEADERS,
    ['segurola', 'Segurola 20hs Jueves', '', ''],
    ['', 'no id', '', ''],
    ['amigas', '', 'Palermo', ''],
  ]);
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana]), groups]);

  const all = get(env, 'readAll') as ReadAll;

  assert.deepEqual(all.groups, [
    { groupId: 'segurola', name: 'Segurola 20hs Jueves', place: '' },
    { groupId: 'amigas', name: 'amigas', place: 'Palermo' },
  ]);
  assert.equal(all.groupsError, undefined);
  const fresh = get(loadAppsScript([createSheet('Players', [HEADERS, ana])]), 'readAll') as ReadAll;
  assert.deepEqual(fresh.groups, [], 'no Groups tab yet: an empty list');
});

test('readAll still returns the players when the Groups tab fails', () => {
  const groups = createSheet('Groups', [GROUP_HEADERS]);
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana]), groups]);
  get(env, 'read');
  groups.getDataRange = () => {
    throw new Error('Groups is broken');
  };

  const all = get(env, 'readAll') as ReadAll;

  assert.equal(all.players.length, 1);
  assert.deepEqual(all.groups, []);
  assert.match(all.groupsError ?? '', /Groups is broken/);
});

test('the first read after the release adds birthDate even with the old schema still cached', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players], { cacheEntries: { 'armaduki-schema-v1': 'ok' } });

  const rows = get(env, 'read') as Rows;

  assert.ok(players.data()[0].includes('birthDate'));
  assert.equal(rows[0].birthdate, '');
});

test('a partial birth date comes back exactly as it was sent', () => {
  const players = createSheet('Players', [HEADERS, ana, bea]);
  const env = loadAppsScript([players]);

  assert.equal(post(env, { action: 'update', id: '1', birthDate: '1994-03' }), 'Updated');
  assert.equal(post(env, { action: 'update', id: '2', birthDate: '1994-03-12' }), 'Updated');
  assert.equal(post(env, { action: 'add', id: '3', nickname: 'Caro', birthDate: '1994' }), 'Added');

  const byId = new Map((get(env, 'read') as Rows).map((row) => [String(row.id), row.birthdate]));
  assert.equal(byId.get('1'), '1994-03', 'year and month stay text, not 1 March');
  assert.equal(byId.get('2'), '1994-03-12');
  assert.equal(byId.get('3'), '1994');
  assert.equal(players.data()[1][column(players, 'birthDate')], '1994-03', 'no apostrophe in the cell');

  assert.equal(post(env, { action: 'update', id: '1', birthDate: '' }), 'Updated');
  assert.equal((get(env, 'read') as Rows)[0].birthdate, '', 'clearing it leaves the cell empty');
});

test('a birth date typed by hand as a date reads as that day in the spreadsheet time zone', () => {
  // Midnight of 12 March 1994 in Madrid is still 11 March in UTC.
  const typed = new Date('1994-03-11T23:00:00Z');
  const withDate = [...HEADERS, 'birthDate'];
  const env = loadAppsScript([createSheet('Players', [withDate, [...ana, typed]])], { timeZone: 'Europe/Madrid' });

  assert.equal((get(env, 'read') as Rows)[0].birthdate, '1994-03-12');
});

test('notes stay as typed, even when they look like a date or a formula', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players]);

  assert.equal(post(env, { action: 'update', id: '1', notes: '20/11' }), 'Updated');
  assert.equal((get(env, 'read') as Rows)[0].notes, '20/11');
  assert.equal(post(env, { action: 'update', id: '1', notes: '=1+1 y se lesionó' }), 'Updated');
  assert.equal(players.data()[1][column(players, 'notes')], '=1+1 y se lesionó');
});

test('addTeam appends the team with its colours; a retry adds nothing, another name with the same id is refused', () => {
  const teams = createSheet('Teams', [TEAM_HEADERS, ['armaduki', 'Armaduki', '#dc2626', '#000000', '']]);
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana]), teams]);
  const body = { action: 'addTeam', teamId: 'las-pibas', name: 'Las Pibas', color1: '#7c3aed', color2: '#facc15' };

  assert.equal(post(env, body), 'Added');
  assert.equal(post(env, body), 'Added', 'the same team again is a retry');
  assert.equal(teams.data().length, 3);
  assert.deepEqual(teams.records()[1], { teamId: 'las-pibas', name: 'Las Pibas', color1: '#7c3aed', color2: '#facc15', crest: '' });
  assert.match(post(env, { ...body, name: 'Otras' }), /^Error: teamId las-pibas already exists/);
  assert.equal(teams.data().length, 3);
  assert.deepEqual((get(env, 'readTeams') as Rows).map((team) => team.teamId), ['armaduki', 'las-pibas']);
});

test('addGroup appends the group as text, so a name like 20/11 stays a name', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])]);

  assert.equal(post(env, { action: 'addGroup', groupId: 'jueves-20hs', name: 'Jueves 20hs' }), 'Added');
  assert.equal(post(env, { action: 'addGroup', groupId: '20-11', name: '20/11' }), 'Added');
  assert.equal(post(env, { action: 'addGroup', groupId: '20-11', name: '20/11' }), 'Added', 'a retry');

  const groups = env.sheet('Groups')!;
  assert.equal(groups.data().length, 3, 'the tab is created on the way, with one row per group');
  assert.deepEqual((get(env, 'readAll') as ReadAll).groups, [
    { groupId: 'jueves-20hs', name: 'Jueves 20hs', place: '' },
    { groupId: '20-11', name: '20/11', place: '' },
  ]);
});

test('addTeam and addGroup need an id and a name', () => {
  const env = loadAppsScript([createSheet('Players', [HEADERS, ana])]);
  assert.match(post(env, { action: 'addTeam', teamId: 'x', name: ' ' }), /^Error: missing teamId or name/);
  assert.match(post(env, { action: 'addGroup', name: 'Sin id' }), /^Error: missing groupId or name/);
});

test('an update writes only the cells it receives, so the others keep their text', () => {
  const players = createSheet('Players', [HEADERS, ana]);
  const env = loadAppsScript([players]);
  assert.equal(post(env, { action: 'update', id: '1', birthDate: '1994-03', shirtNumber: '007' }), 'Updated');

  assert.equal(post(env, { action: 'update', id: '1', rating: 4 }), 'Updated');

  const row = (get(env, 'read') as Rows)[0];
  assert.equal(row.birthdate, '1994-03', 'still year and month, not 1 March');
  assert.equal(row.shirtnumber, '007', 'the leading zeros stay');
  assert.equal(row.rating, 4);
});
