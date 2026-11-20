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
import type { Person } from '../src/types/index.ts';
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
