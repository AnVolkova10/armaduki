// apps-script/Code.gs in Node, against in-memory sheets (see helpers/appsScriptHarness.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSheet,
  get,
  LEGACY_PLAYER_HEADERS as HEADERS,
  loadAppsScript,
  post,
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
