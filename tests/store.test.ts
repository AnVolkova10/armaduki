// The real Zustand store from start to end: its fetch goes to a stand-in that runs Code.gs
// on in-memory sheets (helpers/appsScriptHarness.ts). The stand-in refuses every other host,
// and Vite reads env from an empty folder, so this test can never reach the real backend.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import type useAppStore from '../src/store/useAppStore.ts';
import type { GeneratedTeams, Match, Person } from '../src/types/index.ts';
import { addPlayer, buildMatch, newDraft } from '../src/utils/matches.ts';
import { createSheet, loadAppsScript, TEAM_HEADERS, type Cell } from './helpers/appsScriptHarness.ts';

const TEST_ORIGIN = 'https://script.test';
const HEADERS = [
  'id', 'name', 'nickname', 'role', 'rating', 'avatar', 'gkWillingness', 'wantsWith', 'avoidsWith', 'attributes',
  'shirtNumber', 'primaryTeam', 'teams', 'groups', 'availability', 'birthYear', 'secondaryRole', 'active', 'notes',
];
const row = (values: Record<string, Cell>) => HEADERS.map((header) => values[header] ?? '');

const players = createSheet('Players', [
  HEADERS,
  row({ id: 1, nickname: 'Ana', role: 'GK', rating: 7, wantsWith: '2', notes: 'keeps' }),
  row({ id: 2, nickname: 'Bea', role: 'MID', rating: 5, wantsWith: '1|7', avoidsWith: '3' }),
  row({ id: 3, nickname: 'Caro', role: 'ATT', rating: 6, avoidsWith: '2', avatar: 'data:old' }),
  row({ id: 7, nickname: 'Dani', role: 'DEF', rating: 4, wantsWith: '2' }),
  row({ id: '', nickname: 'NoId', role: 'MID', rating: 5 }),
  row({ id: 3, nickname: 'CaroDup', role: 'MID', rating: 5 }),
  row({ id: '', nickname: '', role: '' }), // blank row
]);
const teams = createSheet('Teams', [TEAM_HEADERS, ['armaduki', 'Armaduki', '#e9252a', '', '']]);
const backend = loadAppsScript([players, teams]);

// ---------------------------------------------------------------------------
// fetch stand-in
// ---------------------------------------------------------------------------
// The device's storage: Node's own localStorage needs a file, so the store gets this one.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (name: string) => storage.get(name) ?? null,
    setItem: (name: string, value: string) => void storage.set(name, String(value)),
    removeItem: (name: string) => void storage.delete(name),
  },
});
const KEY_STORAGE = 'armaduki-access-key';
const COPY_STORAGE = 'armaduki-last-read-v1';
const KEY = 'pelota-de-trapo'; // the tests' own key; the real one is only in Script Properties

const gets: string[] = [];
/** The key each GET carried ('' when none). */
const getKeys: string[] = [];
let networkDown = false;
const posts: Record<string, unknown>[] = [];
let failNextPosts: ('network' | 'error-text')[] = [];
let answerReadAllLikeOldBackend = false;
/** Answers readAll without groups, like a backend from before Sprint 6. */
let answerReadAllWithoutGroups = false;
/** Answers readAll without the wants and avoids history, like a backend from before Sprint 8. */
let answerReadAllWithoutHistory = false;
/** Answers readAll without capabilities and the id floor, like a backend from before Sprint 9. */
let answerReadAllWithoutMatches = false;

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== TEST_ORIGIN) throw new Error(`test fetch refuses ${url.origin}`);
  await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 15));

  if (networkDown) throw new TypeError('Failed to fetch');

  if (!init.method || init.method === 'GET') {
    const action = url.searchParams.get('action') ?? 'read';
    gets.push(action);
    getKeys.push(url.searchParams.get('key') ?? '');
    if (answerReadAllLikeOldBackend && action === 'readAll') {
      return new Response(JSON.stringify({ error: 'Action unknown' }));
    }
    if (answerReadAllWithoutGroups && action === 'readAll') {
      const all = JSON.parse(backend.doGet({ parameter: Object.fromEntries(url.searchParams) }).content);
      delete all.groups;
      delete all.groupsError;
      delete all.relationshipHistory;
      return new Response(JSON.stringify(all));
    }
    if (answerReadAllWithoutMatches && action === 'readAll') {
      const all = JSON.parse(backend.doGet({ parameter: Object.fromEntries(url.searchParams) }).content);
      delete all.capabilities;
      delete all.highestPlayerId;
      return new Response(JSON.stringify(all));
    }
    if (answerReadAllWithoutHistory && action === 'readAll') {
      const all = JSON.parse(backend.doGet({ parameter: Object.fromEntries(url.searchParams) }).content);
      delete all.relationshipHistory;
      return new Response(JSON.stringify(all));
    }
    return new Response(backend.doGet({ parameter: Object.fromEntries(url.searchParams) }).content);
  }

  const body = JSON.parse(String(init.body)) as Record<string, unknown>;
  posts.push(body);
  const failure = failNextPosts.shift();
  if (failure === 'network') throw new TypeError('Failed to fetch');
  if (failure === 'error-text') return new Response('Error: Exception: Service invoked too many times');
  return new Response(backend.doPost({ postData: { contents: String(init.body) } }).content);
}) as typeof fetch;
(globalThis as Record<string, unknown>).window = globalThis; // the store uses window.setTimeout

// ---------------------------------------------------------------------------
// the real store, loaded through Vite like the app does
// ---------------------------------------------------------------------------
let server: ViteDevServer;
let store: typeof useAppStore;
const S = () => store.getState();
const sheetRow = (id: string | number) => players.records().find((r) => String(r.id) === String(id));
const findPerson = (nickname: string) => S().people.find((p) => p.nickname === nickname) as Person;
const settle = async () => {
  while (S().pendingSyncCount > 0) await new Promise((resolve) => setTimeout(resolve, 10));
};
const resetStore = () => store.setState(store.getInitialState(), true);
const silence = { log: console.log, warn: console.warn, error: console.error };
const consoleErrors: string[] = [];

before(async () => {
  const envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'armaduki-test-env-'));
  process.env.VITE_APPS_SCRIPT_URL = `${TEST_ORIGIN}/exec`;
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    envDir,
    mode: 'test',
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  store = (await server.ssrLoadModule('/src/store/useAppStore.ts')).default as typeof useAppStore;
  console.log = () => {};
  console.warn = () => {};
  console.error = (...args: unknown[]) => consoleErrors.push(args.map(String).join(' '));
});

after(async () => {
  Object.assign(console, silence);
  await server?.close();
});

// ---------------------------------------------------------------------------
// opening the app
// ---------------------------------------------------------------------------
test('opening the app reads players and teams with one request', async () => {
  gets.length = 0;
  await Promise.all([S().fetchPeople(), S().fetchPeople()]); // the second call waits for the first

  assert.deepEqual(gets, ['readAll']);
  assert.equal(S().peopleStatus, 'loaded');
  assert.deepEqual(S().people.map((p) => p.nickname), ['Ana', 'Bea', 'Caro', 'Dani', 'NoId']);
  assert.equal(findPerson('NoId').id, 'missing-id-row-6');
  assert.match(S().dataWarning ?? '', /Duplicate player ids.*id 3 \(rows 4 and 7\)/);
  assert.match(S().dataWarning ?? '', /without id.*rows 6/);
  assert.deepEqual(S().teamsCatalog.map((t) => [t.teamId, t.color2]), [['armaduki', '#e9252a']]);
  assert.equal(S().teamsCatalogLoaded, true);
  assert.equal(S().isTeamsCatalogLoading, false);
});

test('with a backend older than readAll, the app still loads players and teams', async () => {
  resetStore();
  gets.length = 0;
  answerReadAllLikeOldBackend = true;
  try {
    await S().fetchPeople();
  } finally {
    answerReadAllLikeOldBackend = false;
  }

  assert.deepEqual([...gets].sort(), ['read', 'readAll', 'readTeams']);
  assert.equal(S().peopleStatus, 'loaded');
  assert.equal(S().people.length, 5);
  assert.equal(S().teamsCatalog.length, 1);
  assert.equal(S().teamsCatalogError, null);
});

test('a broken Teams tab does not stop the players from loading', async () => {
  resetStore();
  gets.length = 0;
  const original = teams.getDataRange;
  teams.getDataRange = () => {
    throw new Error('Teams is broken');
  };
  try {
    await S().fetchPeople();
  } finally {
    teams.getDataRange = original;
  }

  assert.deepEqual(gets, ['readAll']);
  assert.equal(S().peopleStatus, 'loaded');
  assert.equal(S().people.length, 5);
  assert.deepEqual(S().teamsCatalog, []);
  assert.equal(S().teamsCatalogError, 'Error loading teams catalog from Google Sheets');
  assert.equal(S().isTeamsCatalogLoading, false);

  resetStore();
  await S().fetchPeople(); // back to a clean load for the tests below
  assert.equal(S().teamsCatalog.length, 1);
});

// ---------------------------------------------------------------------------
// writes (from the November 2026 review)
// ---------------------------------------------------------------------------
test('addPerson picks an id above every id and link (7 + 1 = 8) and the sheet gets the row', async () => {
  const base = S().people[0];
  await S().addPerson({ ...base, id: '', nickname: 'Eli', name: 'Eli New', wantsWith: ['1'], avoidsWith: [], shirtNumber: '10', notes: undefined });
  await settle();

  assert.equal(findPerson('Eli').id, '8');
  assert.equal(sheetRow(8)?.nickname, 'Eli');
  assert.equal(String(sheetRow(8)?.shirtNumber), '10');
  assert.equal(posts.at(-1)?.action, 'add');
});

test('updatePerson sends only the changed fields and keeps edits made in the sheet', async () => {
  // Someone edits Caro's notes in the sheet after the app loaded.
  const caroIndex = players.records().findIndex((r) => r.nickname === 'Caro');
  players.getRange(caroIndex + 2, HEADERS.indexOf('notes') + 1, 1, 1).setValues([['edited in sheet']]);

  await S().updatePerson({ ...findPerson('Caro'), rating: 9 });
  await settle();

  assert.deepEqual(Object.keys(posts.at(-1) ?? {}).sort(), ['action', 'id', 'rating']);
  assert.equal(sheetRow(3)?.rating, 9);
  assert.equal(sheetRow(3)?.notes, 'edited in sheet');
  assert.equal(sheetRow(3)?.avatar, 'data:old');
});

test('saving without changes sends nothing', async () => {
  const before = posts.length;
  await S().updatePerson({ ...findPerson('Ana') });
  await settle();
  assert.equal(posts.length, before);
});

test('deletePerson removes the row and the links that pointed at it', async () => {
  await S().deletePerson('7'); // Bea wants 7
  await settle();

  assert.equal(sheetRow(7), undefined);
  assert.equal(String(sheetRow(2)?.wantsWith), '1');
  assert.deepEqual(findPerson('Bea').wantsWith, ['1']);
  assert.equal(S().syncErrors.length, 0);
});

test('clearWantsRelationships only writes the players that had wants', async () => {
  const before = posts.length;
  const withWants = S().people.filter((p) => p.wantsWith.length > 0).length;
  await S().clearWantsRelationships();
  await settle();

  assert.equal(posts.length - before, withWants);
  assert.ok(players.records().filter((r) => r.nickname).every((r) => r.wantsWith === ''));
  assert.equal(String(sheetRow(2)?.avoidsWith), '3', 'avoids untouched');
});

test('an Apps Script error answer is a failure, not a save', async () => {
  failNextPosts = ['error-text'];
  await S().updatePerson({ ...findPerson('Ana'), rating: 2 });
  await settle();

  assert.equal(S().syncErrors.length, 1);
  assert.match(S().syncErrors[0].detail, /Service invoked too many times/);
  assert.equal(sheetRow(1)?.rating, 7, 'sheet unchanged');
});

test('Retry sends the current values, so a newer edit is not overwritten', async () => {
  await S().updatePerson({ ...findPerson('Ana'), rating: 3 }); // the newer edit goes through
  await settle();
  assert.equal(sheetRow(1)?.rating, 3);

  await S().retryFailedSyncs();
  await settle();
  assert.equal(S().syncErrors.length, 0);
  assert.equal(sheetRow(1)?.rating, 3, 'the retry must not resend the old 2');
});

test('network failure on add, then an edit, then Retry: the row ends with the latest data', async () => {
  failNextPosts = ['network', 'network'];
  const base = S().people[0];
  await S().addPerson({ ...base, id: '', nickname: 'Fio', rating: 4, wantsWith: [], avoidsWith: [] });
  await S().updatePerson({ ...findPerson('Fio'), rating: 6 });
  await settle();
  assert.equal(S().syncErrors.length, 2);

  await S().retryFailedSyncs();
  await settle();
  assert.equal(S().syncErrors.length, 0);
  assert.equal(sheetRow(findPerson('Fio').id)?.rating, 6);
});

test('writes run in order: two quick edits end with the last one', async () => {
  void S().updatePerson({ ...findPerson('Bea'), rating: 1 });
  void S().updatePerson({ ...findPerson('Bea'), rating: 10 });
  await settle();
  assert.equal(sheetRow(2)?.rating, 10);
});

test('changing the selection clears generated teams', () => {
  store.setState({ generatedTeams: { primary: {}, secondary: null, secondaryReason: null, comparison: null } as never });
  S().toggleSelection('1');
  assert.equal(S().generatedTeams, null);
});

// ---------------------------------------------------------------------------
// Sprint 6: groups, teams and groups made from the form, birth dates, second positions, active
// ---------------------------------------------------------------------------
// These tests put the sheet back as they found it: the Sprint 4 tests below count on it.
const sprint6Snapshot: Record<string, Cell[][]> = {};
const sheetsTouched = () => ({ Players: players, Teams: teams, Groups: backend.sheet('Groups') });

test('readAll brings the groups from Sprint 6 on; with an older backend they stay null (hidden)', async () => {
  resetStore();
  await S().fetchPeople();
  for (const [name, sheet] of Object.entries(sheetsTouched())) sprint6Snapshot[name] = (sheet?.data() ?? []).map((r) => [...r]);
  assert.deepEqual(S().groupsCatalog, [], 'no Groups tab yet: an empty list, and groups can be made');
  assert.ok(players.data()[0].includes('birthDate'), 'the first read added the birthDate column');

  resetStore();
  answerReadAllWithoutGroups = true;
  try {
    await S().fetchPeople();
  } finally {
    answerReadAllWithoutGroups = false;
  }
  assert.equal(S().groupsCatalog, null);

  resetStore();
  await S().fetchPeople();
});

test('a new team and a new group show at once, save behind, and keep their ids after a fresh read', async () => {
  const teamId = S().createTeam(' Las Pibas ', '#7c3aed', '#facc15');
  const groupId = S().createGroup('Segurola 20hs Jueves');
  const otherId = S().createGroup('Segurola 20hs Jueves');

  assert.equal(teamId, 'las-pibas');
  assert.equal(groupId, 'segurola-20hs-jueves');
  assert.equal(otherId, 'segurola-20hs-jueves-2', 'the store never reuses an id');
  assert.ok(S().teamsCatalog.some((team) => team.teamId === 'las-pibas' && team.name === 'Las Pibas'));
  await settle();
  assert.equal(S().syncErrors.length, 0);

  resetStore();
  await S().fetchPeople();
  assert.deepEqual(S().teamsCatalog.map((team) => team.teamId), ['armaduki', 'las-pibas']);
  assert.deepEqual(S().groupsCatalog?.map((group) => [group.groupId, group.name]), [
    ['segurola-20hs-jueves', 'Segurola 20hs Jueves'],
    ['segurola-20hs-jueves-2', 'Segurola 20hs Jueves'],
  ]);
});

test('a birth date with only the year and month survives a save and a fresh read', async () => {
  await S().updatePerson({ ...findPerson('Bea'), birthDate: '1994-03', groups: ['segurola-20hs-jueves'], notes: 'juega de todo' });
  await settle();
  assert.deepEqual(Object.keys(posts.at(-1) ?? {}).sort(), ['action', 'birthDate', 'groups', 'id', 'notes']);

  resetStore();
  await S().fetchPeople();
  assert.equal(findPerson('Bea').birthDate, '1994-03');
  assert.deepEqual(findPerson('Bea').groups, ['segurola-20hs-jueves']);
  assert.equal(findPerson('Bea').notes, 'juega de todo');
});

test('a second position equal to the main one or FLEX is dropped, and GK there means they keep goal', async () => {
  const beaRow = players.records().findIndex((r) => r.nickname === 'Bea') + 2;
  const caroRow = players.records().findIndex((r) => r.nickname === 'Caro') + 2;
  const column = (name: string) => players.data()[0].indexOf(name) + 1;
  players.getRange(beaRow, column('secondaryRole'), 1, 1).setValues([['MID']]);
  players.getRange(caroRow, column('secondaryRole'), 1, 1).setValues([['gk']]);
  players.getRange(caroRow, column('gkWillingness'), 1, 1).setValues([['no']]);

  resetStore();
  await S().fetchPeople();
  assert.equal(findPerson('Bea').secondaryRole, undefined, 'MID twice');
  assert.equal(findPerson('Caro').secondaryRole, 'GK');
  assert.equal(findPerson('Caro').gkWillingness, 'good');

  players.getRange(beaRow, column('secondaryRole'), 1, 1).setValues([['FLEX']]);
  resetStore();
  await S().fetchPeople();
  assert.equal(findPerson('Bea').secondaryRole, undefined, 'FLEX is never a second position');
});

test('making a picked player inactive takes them out of the picks, and inactive players cannot be picked', async () => {
  S().clearSelection();
  S().toggleSelection(findPerson('Ana').id);
  await S().updatePerson({ ...findPerson('Ana'), active: false });
  await settle();

  assert.equal(S().selectedIds.has(findPerson('Ana').id), false);
  assert.equal(String(sheetRow(1)?.active), 'false');
  S().toggleSelection(findPerson('Ana').id);
  assert.equal(S().selectedIds.size, 0);

  await S().updatePerson({ ...findPerson('Ana'), active: true });
  await settle();
  S().toggleSelection(findPerson('Ana').id);
  assert.equal(S().selectedIds.has(findPerson('Ana').id), true);
  S().clearSelection();
});

test('the Sprint 6 tests leave the sheet as they found it', async () => {
  for (const [name, sheet] of Object.entries(sheetsTouched())) {
    if (sheet) sheet.data().splice(0, Infinity, ...sprint6Snapshot[name].map((r) => [...r]));
  }
  resetStore();
  await S().fetchPeople();
  assert.deepEqual(S().teamsCatalog.map((team) => team.teamId), ['armaduki']);
  assert.deepEqual(S().groupsCatalog, []);
  assert.equal(findPerson('Bea').birthDate, undefined);
});

// ---------------------------------------------------------------------------
// the wants and avoids history, and privacy mode kept on the device (Sprint 8)
// ---------------------------------------------------------------------------
// These tests also put the sheet back as they found it.
const sprint8Snapshot: Record<string, Cell[][]> = {};
const sprint8Sheets = () => ({ Players: players, RelationshipHistory: backend.sheet('RelationshipHistory') });
let historyAtStart: unknown = null;

test('readAll brings the wants and avoids history from Sprint 8 on; with an older backend it stays null', async () => {
  resetStore();
  await S().fetchPeople();
  for (const [name, sheet] of Object.entries(sprint8Sheets())) sprint8Snapshot[name] = (sheet?.data() ?? []).map((r) => [...r]);
  historyAtStart = S().linkHistory;
  assert.deepEqual(
    S().linkHistory,
    [{ sourceId: '8', targetId: '1', wantsCount: 1, avoidsCount: 0 }],
    'Eli, added above with a want for Ana, was counted',
  );

  resetStore();
  answerReadAllWithoutHistory = true;
  try {
    await S().fetchPeople();
  } finally {
    answerReadAllWithoutHistory = false;
  }
  assert.equal(S().linkHistory, null);
  assert.deepEqual(S().groupsCatalog, [], 'the rest of the read is as usual');

  resetStore();
  await S().fetchPeople();
});

test('a new want counts at once in the app and once in the sheet, also when marked again after clearing', async () => {
  const anaId = findPerson('Ana').id;
  const beaId = findPerson('Bea').id;
  const count = () => S().linkHistory?.find((entry) => entry.sourceId === anaId && entry.targetId === beaId)?.wantsCount ?? 0;
  await S().updatePerson({ ...findPerson('Ana'), wantsWith: [] });
  await settle();
  const before = count();

  await S().updatePerson({ ...findPerson('Ana'), wantsWith: [beaId] });
  assert.equal(count(), before + 1, 'the app counts it before the save ends');
  await settle();
  await S().clearWantsRelationships();
  await settle();
  assert.equal(count(), before + 1, 'clearing keeps the count');
  await S().updatePerson({ ...findPerson('Ana'), wantsWith: [beaId] });
  await settle();
  assert.equal(count(), before + 2);
  assert.equal(S().syncErrors.length, 0);

  resetStore();
  await S().fetchPeople();
  assert.equal(count(), before + 2, 'the sheet counted the same');
});

test('privacy mode stays as this device left it', async () => {
  assert.equal(S().privacyMode, true, 'on until it is ever switched off');
  S().togglePrivacyMode();
  assert.equal(storage.get('armaduki-privacy'), 'off');

  server.moduleGraph.invalidateAll();
  const reopened = (await server.ssrLoadModule('/src/store/useAppStore.ts')).default as typeof useAppStore;
  assert.equal(reopened.getState().privacyMode, false, 'a reload keeps it off');
  reopened.getState().togglePrivacyMode();
  assert.equal(storage.get('armaduki-privacy'), 'on');

  S().togglePrivacyMode();
  storage.delete('armaduki-privacy');
});

test('the Sprint 8 tests leave the sheet as they found it', async () => {
  for (const [name, sheet] of Object.entries(sprint8Sheets())) {
    if (sheet) sheet.data().splice(0, Infinity, ...sprint8Snapshot[name].map((r) => [...r]));
  }
  resetStore();
  await S().fetchPeople();
  assert.deepEqual(S().linkHistory, historyAtStart);
});

// ---------------------------------------------------------------------------
// matches (Sprint 9)
// ---------------------------------------------------------------------------
// These tests also put the sheet back as they found it.
const sprint9Snapshot: Record<string, Cell[][]> = {};
const sprint9Sheets = () => ({
  Players: players,
  MatchHistory: backend.sheet('MatchHistory'),
  MatchPlayers: backend.sheet('MatchPlayers'),
});
const blankPlayer = (nickname: string): Person => ({ ...S().people[0], id: '', nickname, name: '', wantsWith: [], avoidsWith: [] });
/** A match between some of the players on screen, as the editor would save it. */
const matchWith = (matchId: string, sides: [string[], string[]], result: [string, string] = ['', '']): Match => {
  let draft = newDraft({ matchId, createdAt: '2026-10-13T22:00:00.000Z', date: '2026-10-13' });
  sides.forEach((nicknames, index) => {
    for (const nickname of nicknames) draft = addPlayer(draft, findPerson(nickname), index === 0 ? 1 : 2);
  });
  return buildMatch({ ...draft, team1Goals: result[0], team2Goals: result[1] }, new Date('2026-10-14T01:30:00.000Z'));
};
const matchRows = (sheet: 'MatchHistory' | 'MatchPlayers', matchId: string) =>
  (backend.sheet(sheet)?.records() ?? []).filter((row) => row.matchId === matchId);

test('readAll says the backend saves matches, but does not read them; an older backend hides them', async () => {
  resetStore();
  gets.length = 0;
  await S().fetchPeople();
  for (const [name, sheet] of Object.entries(sprint9Sheets())) sprint9Snapshot[name] = (sheet?.data() ?? []).map((r) => [...r]);

  assert.equal(S().matchesSupported, true);
  assert.deepEqual(gets, ['readAll'], 'matches wait until «Matches» opens');
  assert.equal(S().matches, null);
  assert.ok(S().highestPlayerId >= 8, 'the highest id, Eli (8), or above');

  resetStore();
  answerReadAllWithoutMatches = true;
  try {
    await S().fetchPeople();
  } finally {
    answerReadAllWithoutMatches = false;
  }
  assert.equal(S().matchesSupported, false);
  assert.equal(S().highestPlayerId, -1);

  resetStore();
  await S().fetchPeople();
});

test('a new player never takes the id of a deleted one, in this visit or the next', async () => {
  await S().addPerson(blankPlayer('Temp1'));
  await settle();
  const first = Number(findPerson('Temp1').id);
  await S().deletePerson(String(first));
  await settle();

  await S().addPerson(blankPlayer('Temp2'));
  await settle();
  const second = Number(findPerson('Temp2').id);
  assert.equal(second, first + 1, 'not the id Temp1 had');
  await S().deletePerson(String(second));
  await settle();

  resetStore();
  await S().fetchPeople();
  assert.equal(S().highestPlayerId, second, 'the backend remembers the deleted ids');
  await S().addPerson(blankPlayer('Temp3'));
  await settle();
  assert.equal(Number(findPerson('Temp3').id), second + 1);
  await S().deletePerson(findPerson('Temp3').id);
  await settle();
  assert.equal(S().syncErrors.length, 0);
});

test('a saved match shows at once, reaches both tabs and comes back the same after a reload', async () => {
  await S().fetchMatches();
  assert.equal(S().matchesStatus, 'loaded');
  assert.deepEqual(S().matches, []);

  const match = matchWith('m-store-1', [['Ana', 'Bea'], ['Caro']], ['2', '1']);
  const saving = S().saveMatch(match);
  assert.deepEqual(S().matches?.map((m) => m.matchId), ['m-store-1'], 'at once');
  await saving;
  await settle();

  assert.equal(matchRows('MatchHistory', 'm-store-1').length, 1);
  assert.equal(matchRows('MatchPlayers', 'm-store-1').length, 3);
  assert.equal(posts.at(-1)?.action, 'saveMatch');
  resetStore();
  await S().fetchPeople();
  await S().fetchMatches();
  assert.deepEqual(S().matches, [match]);
});

test('a match saved before the list was read is in the list once it loads', async () => {
  resetStore();
  await S().fetchPeople();
  const match = matchWith('m-store-2', [['Bea'], ['Ana']]);

  const saving = S().saveMatch(match);
  assert.equal(S().matches, null, 'nothing to show yet');
  await S().fetchMatches();
  await saving;

  assert.deepEqual(S().matches?.map((m) => m.matchId).sort(), ['m-store-1', 'm-store-2']);
});

test('a retried save sends the match as it is now, and nothing once it was deleted', async () => {
  const match = matchWith('m-store-3', [['Ana'], ['Bea']]);
  failNextPosts = ['network'];
  await S().saveMatch(match);
  await settle();
  assert.equal(S().syncErrors.length, 1);

  await S().saveMatch({ ...match, team1Goals: 3, team2Goals: 0 });
  await settle();
  await S().retryFailedSyncs();
  await settle();
  assert.equal(S().syncErrors.length, 0);
  assert.equal(matchRows('MatchHistory', 'm-store-3')[0]?.team1Goals, 3, 'the latest version, also from the retry');

  failNextPosts = ['network'];
  await S().saveMatch(matchWith('m-store-4', [['Ana'], ['Bea']]));
  await settle();
  await S().deleteMatch('m-store-4');
  await settle();
  const sent = posts.length;
  await S().retryFailedSyncs();
  await settle();
  assert.equal(posts.length, sent, 'nothing to send for a match that is gone');
  assert.deepEqual(matchRows('MatchHistory', 'm-store-4'), []);
  assert.ok(!S().matches?.some((m) => m.matchId === 'm-store-4'));
  assert.equal(S().syncErrors.length, 0);
});

test('deleting a match takes it out at once and from both tabs', async () => {
  const deleting = S().deleteMatch('m-store-3');
  assert.ok(!S().matches?.some((m) => m.matchId === 'm-store-3'), 'at once');
  await deleting;
  await settle();
  assert.deepEqual(matchRows('MatchHistory', 'm-store-3'), []);
  assert.deepEqual(matchRows('MatchPlayers', 'm-store-3'), []);
});

test('a match logged from the teams on screen marks those teams, until it is deleted', async () => {
  const onScreen = { primary: {}, secondary: null } as unknown as GeneratedTeams;
  S().setGeneratedTeams(onScreen);
  await S().saveMatch(matchWith('m-store-5', [['Ana'], ['Bea']]), { fromResult: true });
  assert.equal(S().loggedMatch?.result, onScreen);
  assert.equal(S().loggedMatch?.matchId, 'm-store-5');

  await S().deleteMatch('m-store-5');
  assert.equal(S().loggedMatch, null);
  S().setGeneratedTeams(null);
  await settle();
});

test('a save that failed before the list was read stays in the list, and Retry saves it', async () => {
  resetStore();
  await S().fetchPeople();
  failNextPosts = ['network'];
  await S().saveMatch(matchWith('m-store-6', [['Ana'], ['Bea']]));
  await settle();
  assert.equal(S().syncErrors.length, 1);

  await S().fetchMatches();
  assert.ok(S().matches?.some((m) => m.matchId === 'm-store-6'), 'waiting for Retry, but on the list');
  assert.deepEqual(matchRows('MatchHistory', 'm-store-6'), []);
  await S().retryFailedSyncs();
  await settle();
  assert.equal(matchRows('MatchHistory', 'm-store-6').length, 1);
  await S().deleteMatch('m-store-6');
  await settle();
  assert.equal(S().syncErrors.length, 0);
});

test('a refused key while reading matches locks the device and forgets them', async () => {
  backend.setAccessKey(KEY);
  try {
    await S().fetchMatches();
  } finally {
    backend.setAccessKey(null);
  }
  assert.equal(S().access, 'locked');
  assert.equal(S().matches, null);
  assert.equal(S().matchesSupported, false);

  resetStore();
  await S().fetchPeople();
  assert.equal(S().access, 'open');
});

test('the Sprint 9 tests leave the sheet as they found it', async () => {
  for (const [name, sheet] of Object.entries(sprint9Sheets())) {
    if (sheet) sheet.data().splice(0, Infinity, ...sprint9Snapshot[name].map((r) => [...r]));
  }
  resetStore();
  await S().fetchPeople();
  await S().fetchMatches();
  assert.deepEqual(S().matches, []);
  assert.equal(S().syncErrors.length, 0);
});

// ---------------------------------------------------------------------------
// access key and the copy saved on the device (Sprint 4)
// ---------------------------------------------------------------------------
test('reads so far sent no key and left a copy on the device', () => {
  assert.ok(getKeys.every((key) => key === ''));
  assert.equal(storage.get(KEY_STORAGE), undefined);
  assert.ok(storage.has(COPY_STORAGE));
});

test('when the backend asks for a key, a device without it is locked out with one request', async () => {
  backend.setAccessKey(KEY);
  resetStore();
  gets.length = 0;
  await S().fetchPeople();

  assert.deepEqual(gets, ['readAll'], 'no fallback reads after a refusal');
  assert.equal(S().access, 'locked');
  assert.deepEqual(S().people, []);
  assert.equal(S().error, null);
  assert.equal(storage.has(COPY_STORAGE), false, 'the saved copy is wiped');
});

test('a wrong key stays locked and is not kept on the device', async () => {
  assert.equal(await S().unlock('not-the-key'), 'wrong');
  assert.equal(S().access, 'locked');
  assert.equal(storage.get(KEY_STORAGE), undefined);
  assert.equal(S().people.length, 0);
});

test('with no answer the gate stays, nothing is saved, and the same key can be tried again', async () => {
  networkDown = true;
  try {
    assert.equal(await S().unlock(KEY), 'unreachable');
  } finally {
    networkDown = false;
  }
  assert.equal(S().access, 'locked');
  assert.equal(S().error, null);
  assert.equal(storage.get(KEY_STORAGE), undefined);
});

test('the right key opens the app, is kept on the device and travels with reads and writes', async () => {
  gets.length = 0;
  getKeys.length = 0;
  assert.equal(await S().unlock(` ${KEY} `), 'open');

  assert.equal(S().access, 'open');
  assert.equal(S().isFresh, true);
  assert.ok(S().people.length > 0);
  assert.deepEqual(gets, ['readAll']);
  assert.deepEqual(getKeys, [KEY]);
  assert.equal(storage.get(KEY_STORAGE), KEY);
  assert.ok(storage.has(COPY_STORAGE));

  await S().updatePerson({ ...findPerson('Ana'), rating: 8 });
  await settle();
  assert.equal(posts.at(-1)?.key, KEY);
  assert.equal(sheetRow(1)?.rating, 8);
  assert.equal(S().syncErrors.length, 0);
});

test('reopening the app shows the saved copy at once and refreshes with one request', async () => {
  server.moduleGraph.invalidateAll();
  const reopened = (await server.ssrLoadModule('/src/store/useAppStore.ts')).default as typeof useAppStore;
  assert.notEqual(reopened, store, 'a new instance, like a page reload');

  const atOpen = reopened.getState();
  assert.equal(atOpen.access, 'open');
  assert.equal(atOpen.peopleStatus, 'loaded');
  assert.equal(atOpen.isFresh, false, 'editing waits for the sheet');
  // The copy is the last read: edits made after it show up with the refresh.
  assert.ok(atOpen.people.some((p) => p.nickname === 'Ana'));
  assert.equal(atOpen.teamsCatalog.length, 1);

  players.getRange(2, HEADERS.indexOf('rating') + 1, 1, 1).setValues([[6]]); // edited in the sheet meanwhile
  gets.length = 0;
  getKeys.length = 0;
  await atOpen.fetchPeople();

  assert.deepEqual(gets, ['readAll']);
  assert.deepEqual(getKeys, [KEY]);
  assert.equal(reopened.getState().isFresh, true);
  assert.equal(reopened.getState().people.find((p) => p.nickname === 'Ana')?.rating, 6);
});

test('a fresh read over a saved copy drops picks that are gone and results made with old data', async () => {
  server.moduleGraph.invalidateAll();
  const reopened = (await server.ssrLoadModule('/src/store/useAppStore.ts')).default as typeof useAppStore;
  const [first, second] = reopened.getState().people;
  reopened.getState().toggleSelection(first.id);
  reopened.getState().toggleSelection(second.id);
  reopened.setState({ generatedTeams: { primary: {}, secondary: null, secondaryReason: null, comparison: null } as never });

  await reopened.getState().fetchPeople(); // nothing changed in the sheet
  assert.equal(reopened.getState().selectedIds.size, 2);
  assert.notEqual(reopened.getState().generatedTeams, null, 'same data: the result stays');

  server.moduleGraph.invalidateAll();
  const again = (await server.ssrLoadModule('/src/store/useAppStore.ts')).default as typeof useAppStore;
  again.getState().toggleSelection(first.id);
  again.getState().toggleSelection(second.id);
  again.setState({ generatedTeams: { primary: {}, secondary: null, secondaryReason: null, comparison: null } as never });
  const row = players.records().findIndex((r) => String(r.id) === second.id) + 2;
  const removed = players.data()[row - 1];
  players.deleteRow(row); // deleted from another device meanwhile
  try {
    await again.getState().fetchPeople();
    assert.deepEqual([...again.getState().selectedIds], [first.id]);
    assert.equal(again.getState().generatedTeams, null);
    assert.equal(again.getState().isReading, false);
  } finally {
    players.appendRow(removed);
    await S().fetchPeople();
  }
});

test('a reopened app that cannot reach the sheet keeps the saved copy and says so', async () => {
  server.moduleGraph.invalidateAll();
  const offline = (await server.ssrLoadModule('/src/store/useAppStore.ts')).default as typeof useAppStore;
  networkDown = true;
  try {
    await offline.getState().fetchPeople();
  } finally {
    networkDown = false;
  }
  const state = offline.getState();
  assert.equal(state.peopleStatus, 'loaded');
  assert.ok(state.people.length > 0);
  assert.equal(state.isFresh, false);
  assert.match(state.error ?? '', /Couldn't refresh.*copy saved on this device/);
});

test('if the key changes on the backend, the next save fails and the device is locked again', async () => {
  backend.setAccessKey('another-key');
  await S().updatePerson({ ...findPerson('Ana'), rating: 1 });
  await settle();

  assert.equal(S().access, 'locked');
  assert.deepEqual(S().people, []);
  assert.equal(storage.get(KEY_STORAGE), undefined);
  assert.equal(storage.has(COPY_STORAGE), false);
  assert.match(S().syncErrors.at(-1)?.detail ?? '', /access key was refused/);
  assert.equal(sheetRow(1)?.rating, 6, 'sheet unchanged');
  backend.setAccessKey(null);
});

test('no unexpected console errors', () => {
  const unexpected = consoleErrors.filter(
    (line) => !/Sync failed|Error fetching teams catalog: .*Teams is broken|Error fetching (people data|teams catalog): TypeError: Failed to fetch/.test(line),
  );
  assert.deepEqual(unexpected, []);
});
