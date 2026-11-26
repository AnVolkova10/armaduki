import { create } from 'zustand';
import { tr } from '../i18n/index.ts';
import {
  clearSavedRead,
  readAccessKey,
  readPrivacyMode,
  readSavedRead,
  saveAccessKey,
  savePrivacyMode,
  saveRead,
} from '../services/deviceStorage';
import type {
  GeneratedTeams,
  GroupCatalog,
  LinkHistoryEntry,
  Match,
  Person,
  TeamCatalog,
} from '../types';
import { normalizeBirthDate } from '../utils/birthDate';
import { uniqueCatalogId } from '../utils/catalogIds';
import { parseLinkHistory, recordNewLinks } from '../utils/linkHistory';
import { formatDay, parseMatches, serializeMatch, sortMatches } from '../utils/matches';
import {
  parseAttributes,
  validateGKWillingness,
  validateRating,
  validateRole,
  validateSecondaryRole,
} from '../utils/playerFields';

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
// Messages are written in the language chosen at that moment (see src/i18n).
const missingUrlMessage = () => tr().store.missingUrl;

// Bulk writes (clear links, delete cleanup) run a few requests at a time so Apps Script
// does not hit its simultaneous-executions limit.
const BULK_SYNC_CONCURRENCY = 4;
const SYNC_REQUEST_TIMEOUT_MS = 60_000;

// Players whose sheet row has no id get a placeholder that can never collide with real ids.
const MISSING_ID_PREFIX = 'missing-id-row-';

function debugLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * open: the app is usable. asking: a device with no key and no saved copy waits for the first
 * answer. locked: the backend refused, and the gate asks for the key.
 */
export type Access = 'open' | 'asking' | 'locked';
export type UnlockResult = 'open' | 'wrong' | 'unreachable';
type LoadResult = 'ok' | 'refused' | 'failed';

const UNAUTHORIZED = 'unauthorized';

class UnauthorizedError extends Error {}

// The key this device sends with every request. It is stored on the device only after the
// backend accepted it (see unlock).
let accessKey = readAccessKey();

function isUnauthorized(value: unknown): boolean {
  return Boolean(value) && typeof value === 'object' && (value as { error?: unknown }).error === UNAUTHORIZED;
}

interface SyncOperation {
  label: string;
  errorMessage: string;
  /** Builds its payload from the current local state when it runs, so retries never resend stale data. */
  run: () => Promise<void>;
}

export interface FailedSyncOperation extends SyncOperation {
  id: number;
  detail: string;
}

/** "12" is 12; an id that is not a whole number is -1. */
function numericId(id: string): number {
  return /^\d+$/.test(id) ? Number(id) : -1;
}

// Next id = highest numeric id seen anywhere + 1: the players and their links, and `floor`, the
// highest id ever used as far as the backend and this visit know (deleted players included, since
// Sprint 9). So a new player never inherits the links, the history or the matches of a deleted one.
function getNextId(people: Person[], floor: number): string {
  let maxId = floor;
  for (const person of people) {
    for (const id of [person.id, ...person.wantsWith, ...person.avoidsWith]) {
      maxId = Math.max(maxId, numericId(id));
    }
  }
  return String(maxId + 1);
}

function getOptionalString(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return String(value).trim();
}

function getOptionalField(value: unknown): string | undefined {
  const str = getOptionalString(value);
  return str || undefined;
}

function parseArrayField(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map(item => getOptionalString(item)).filter(Boolean);
  }
  if (typeof value !== 'string' && typeof value !== 'number') return [];

  const str = String(value).trim();
  if (str === '') return [];
  return str.split('|').map(s => s.trim()).filter(Boolean);
}

/** Relationship ids without duplicates and without the player's own id. */
function parseRelationshipIds(value: unknown, ownId: string): string[] {
  return [...new Set(parseArrayField(value))].filter((id) => id !== ownId);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s/g, '');
}

function createRowGetter(row: unknown): ((targetKey: string) => unknown) | null {
  if (!row || typeof row !== 'object') return null;

  const rowRecord = row as Record<string, unknown>;
  const normalizedRow = new Map<string, unknown>();

  for (const [key, value] of Object.entries(rowRecord)) {
    normalizedRow.set(normalizeKey(key), value);
  }

  return (targetKey: string): unknown => normalizedRow.get(normalizeKey(targetKey));
}

/** Sheet row number (header is row 1) for a data row index. */
function toSheetRow(index: number): number {
  return index + 2;
}

function parsePersonRow(row: unknown, index: number): Person | null {
  const getValue = createRowGetter(row);
  if (!getValue) return null;

  const nickname = getOptionalString(getValue('nickname'));
  if (!nickname || nickname.toLowerCase() === 'unknown') return null;

  const id = getOptionalString(getValue('id')) || `${MISSING_ID_PREFIX}${toSheetRow(index)}`;
  const name = getOptionalString(getValue('name'));
  const role = validateRole(getValue('role'));
  const rating = validateRating(getValue('rating'));
  const avatar = getOptionalString(getValue('avatar'));
  // A second position is GK, DEF, MID or ATT, never the main one (rows edited by hand can say
  // anything). With GK there, they keep goal well: the form does the same.
  const secondaryRole = validateSecondaryRole(getValue('secondaryrole'), role);
  const gkWillingness = secondaryRole === 'GK' ? 'good' : validateGKWillingness(getValue('gkwillingness'));
  const wantsWith = parseRelationshipIds(getValue('wantswith'), id);
  const avoidsWith = parseRelationshipIds(getValue('avoidswith'), id);
  const attributes = parseAttributes(getValue('attributes'));
  const shirtNumber = getOptionalField(getValue('shirtnumber'));
  const primaryTeam = getOptionalField(getValue('primaryteam'));
  const teams = parseArrayField(getValue('teams'));
  const groups = parseArrayField(getValue('groups'));
  const availability = parseArrayField(getValue('availability'));
  const active = validateActive(getValue('active'));
  const notes = getOptionalField(getValue('notes'));
  // birthYear is the old column: read when birthDate is empty, never written again.
  const birthDate = normalizeBirthDate(getValue('birthdate')) ?? normalizeBirthDate(getValue('birthyear'));

  return {
    id,
    name,
    nickname,
    role,
    rating,
    avatar,
    gkWillingness,
    wantsWith,
    avoidsWith,
    attributes,
    shirtNumber,
    primaryTeam,
    teams,
    groups,
    availability,
    secondaryRole,
    active,
    notes,
    birthDate,
  };
}

function parseTeamCatalogRow(row: unknown): TeamCatalog | null {
  const getValue = createRowGetter(row);
  if (!getValue) return null;

  const teamId = getOptionalString(getValue('teamId'));
  if (!teamId) return null;

  const name = getOptionalString(getValue('name')) || teamId;
  const color1 = getOptionalString(getValue('color1'));

  return {
    teamId,
    name,
    color1,
    color2: getOptionalString(getValue('color2')) || color1,
    crest: getOptionalString(getValue('crest')),
  };
}

function parseGroupCatalogRow(row: unknown): GroupCatalog | null {
  const getValue = createRowGetter(row);
  if (!getValue) return null;

  const groupId = getOptionalString(getValue('groupId'));
  if (!groupId) return null;

  return {
    groupId,
    name: getOptionalString(getValue('name')) || groupId,
    place: getOptionalString(getValue('place')),
  };
}

function validateActive(value: unknown): boolean {
  const normalized = getOptionalString(value).toLowerCase();
  if (!normalized) return true;
  if (['false', 'no', '0', 'inactive', 'off'].includes(normalized)) return false;
  return true;
}

interface ParsedPeople {
  people: Person[];
  skippedRows: number;
  warnings: string[];
}

function parsePeopleRows(rawData: unknown[]): ParsedPeople {
  const people: Person[] = [];
  const firstRowById = new Map<string, number>();
  const duplicates: string[] = [];
  const missingIdRows: number[] = [];
  let skippedRows = 0;

  rawData.forEach((row, index) => {
    try {
      const parsed = parsePersonRow(row, index);
      if (!parsed) {
        skippedRows++;
        return;
      }

      const firstRow = firstRowById.get(parsed.id);
      if (firstRow !== undefined) {
        duplicates.push(tr().store.duplicateId(parsed.id, firstRow, toSheetRow(index)));
        return;
      }

      if (parsed.id.startsWith(MISSING_ID_PREFIX)) missingIdRows.push(toSheetRow(index));
      firstRowById.set(parsed.id, toSheetRow(index));
      people.push(parsed);
    } catch (rowError) {
      skippedRows++;
      console.warn(`Skipped malformed row ${toSheetRow(index)}:`, rowError);
    }
  });

  const warnings: string[] = [];
  if (duplicates.length > 0) {
    warnings.push(tr().store.duplicateIds(duplicates.join(', ')));
  }
  if (missingIdRows.length > 0) {
    warnings.push(tr().store.missingIds(missingIdRows.join(', ')));
  }

  return { people, skippedRows, warnings };
}

// ---------------------------------------------------------------------------
// Sheets payloads. Updates only send the fields that changed, so values edited
// by hand in the sheet are not overwritten with stale in-memory values.
// ---------------------------------------------------------------------------

function serializeArrayField(value: string[] | undefined): string {
  return (value || []).join('|');
}

const FIELD_SERIALIZERS = {
  name: (person: Person) => getOptionalString(person.name),
  nickname: (person: Person) => getOptionalString(person.nickname),
  role: (person: Person) => person.role,
  rating: (person: Person) => person.rating,
  avatar: (person: Person) => getOptionalString(person.avatar),
  gkWillingness: (person: Person) => person.gkWillingness,
  wantsWith: (person: Person) => serializeArrayField(person.wantsWith),
  avoidsWith: (person: Person) => serializeArrayField(person.avoidsWith),
  attributes: (person: Person) => JSON.stringify(person.attributes || {}),
  shirtNumber: (person: Person) => getOptionalString(person.shirtNumber),
  primaryTeam: (person: Person) => getOptionalString(person.primaryTeam),
  teams: (person: Person) => serializeArrayField(person.teams),
  groups: (person: Person) => serializeArrayField(person.groups),
  availability: (person: Person) => serializeArrayField(person.availability),
  secondaryRole: (person: Person) => getOptionalString(person.secondaryRole),
  active: (person: Person) => person.active ?? true,
  notes: (person: Person) => getOptionalString(person.notes),
  birthDate: (person: Person) => getOptionalString(person.birthDate),
} satisfies Record<string, (person: Person) => string | number | boolean>;

type SyncedField = keyof typeof FIELD_SERIALIZERS;

const BASE_FIELDS: SyncedField[] = [
  'name',
  'nickname',
  'role',
  'rating',
  'avatar',
  'gkWillingness',
  'wantsWith',
  'avoidsWith',
  'attributes',
];
const SYNCED_FIELDS = Object.keys(FIELD_SERIALIZERS) as SyncedField[];
const OPTIONAL_FIELDS = SYNCED_FIELDS.filter((field) => !BASE_FIELDS.includes(field));

type SheetsAction = 'add' | 'update' | 'delete' | 'addTeam' | 'addGroup' | 'saveMatch' | 'deleteMatch';
type SheetsPayload = { action: SheetsAction } & Record<string, unknown>;

function getChangedFields(previous: Person | undefined, next: Person): SyncedField[] {
  if (!previous) return BASE_FIELDS;
  return SYNCED_FIELDS.filter((field) => FIELD_SERIALIZERS[field](previous) !== FIELD_SERIALIZERS[field](next));
}

function buildUpdatePayload(person: Person, fields: readonly SyncedField[]): SheetsPayload {
  const payload: SheetsPayload = { action: 'update', id: person.id };
  for (const field of fields) {
    payload[field] = FIELD_SERIALIZERS[field](person);
  }
  return payload;
}

function buildAddPayload(person: Person): SheetsPayload {
  const payload: SheetsPayload = { action: 'add', id: person.id };

  for (const field of BASE_FIELDS) {
    payload[field] = FIELD_SERIALIZERS[field](person);
  }

  // Optional fields are only written when they hold a real value.
  for (const field of OPTIONAL_FIELDS) {
    const value = FIELD_SERIALIZERS[field](person);
    if (field === 'active' ? value === false : value !== '') {
      payload[field] = value;
    }
  }

  return payload;
}

// The Apps Script answers writes with plain text. Anything else is an error message.
const SUCCESS_RESPONSES: Record<SheetsPayload['action'], string[]> = {
  add: ['Added'],
  update: ['Updated'],
  // A row that is already gone counts as deleted.
  delete: ['Deleted', 'ID not found'],
  // The backend answers Added again for a team or group it already has (a retry).
  addTeam: ['Added'],
  addGroup: ['Added'],
  // A save replaces the whole match, so a retry is a save too.
  saveMatch: ['Saved'],
  // A match that is already gone counts as deleted.
  deleteMatch: ['Deleted', 'Match not found'],
};

async function postAppsScriptPayload(payload: SheetsPayload): Promise<void> {
  if (!APPS_SCRIPT_URL) throw new Error(missingUrlMessage());

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SYNC_REQUEST_TIMEOUT_MS);

  try {
    // text/plain keeps this a "simple" CORS request (no preflight), so the
    // Apps Script answer can be read and checked instead of assumed.
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(accessKey ? { ...payload, key: accessKey } : payload),
      signal: controller.signal,
    });
    const responseText = (await response.text()).trim();

    if (!response.ok) {
      throw new Error(tr().store.httpStatus(response.status));
    }

    if (responseText === `Error: ${UNAUTHORIZED}`) {
      throw new UnauthorizedError(tr().store.keyRefused);
    }

    if (!SUCCESS_RESPONSES[payload.action].includes(responseText)) {
      throw new Error(tr().store.answered(responseText.slice(0, 200)));
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(tr().store.timeout(SYNC_REQUEST_TIMEOUT_MS / 1000), { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const failures: unknown[] = [];
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      try {
        await worker(item);
      } catch (error) {
        failures.push(error);
      }
    }
  });

  await Promise.all(runners);

  if (failures.length > 0) {
    const firstMessage = failures[0] instanceof Error ? failures[0].message : String(failures[0]);
    throw new Error(`${failures.length} of ${items.length} requests failed. ${firstMessage}`);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Answer of `action=readAll`: players, teams, (from Sprint 6) groups, (from Sprint 8) the wants
 * and avoids history, and (from Sprint 9) what else the backend does and the floor for new ids,
 * in one request.
 */
interface ReadAllPayload {
  players: unknown[];
  teams?: unknown;
  teamsError?: unknown;
  groups?: unknown;
  groupsError?: unknown;
  relationshipHistory?: unknown;
  relationshipHistoryError?: unknown;
  capabilities?: unknown;
  highestPlayerId?: unknown;
}

function isReadAllPayload(value: unknown): value is ReadAllPayload {
  return Boolean(value) && typeof value === 'object' && Array.isArray((value as ReadAllPayload).players);
}

/** Whether this backend saves matches (Sprint 9): an older one does not say so, and the app hides them. */
function readMatchesSupport(payload: ReadAllPayload): boolean {
  return Array.isArray(payload.capabilities) && payload.capabilities.includes('matches');
}

function readHighestPlayerId(payload: ReadAllPayload): number {
  const value = payload.highestPlayerId;
  return typeof value === 'number' && Number.isInteger(value) ? value : -1;
}

async function getAppsScriptJson(action: 'readAll' | 'read' | 'readTeams' | 'readMatches'): Promise<unknown> {
  const keyParam = accessKey ? `&key=${encodeURIComponent(accessKey)}` : '';
  const response = await fetch(`${APPS_SCRIPT_URL}?action=${action}${keyParam}`);
  if (!response.ok) {
    throw new Error(`Apps Script returned HTTP ${response.status}`);
  }
  return response.json();
}

function parseTeamsCatalog(rawData: unknown): TeamCatalog[] {
  if (!Array.isArray(rawData)) {
    throw new Error('Incorrect teams format: not an array');
  }

  let skippedRows = 0;
  const teamsCatalog: TeamCatalog[] = [];

  rawData.forEach((row: unknown, index: number) => {
    try {
      const parsed = parseTeamCatalogRow(row);
      if (parsed) {
        teamsCatalog.push(parsed);
      } else {
        skippedRows++;
      }
    } catch (rowError) {
      skippedRows++;
      console.warn(`Skipped malformed team row ${toSheetRow(index)}:`, rowError);
    }
  });

  if (skippedRows > 0) {
    console.warn(`Skipped ${skippedRows} malformed team row(s) while loading team catalog.`);
  }

  return teamsCatalog;
}

function parseGroupsCatalog(rawData: unknown): GroupCatalog[] {
  if (!Array.isArray(rawData)) throw new Error('Incorrect groups format: not an array');
  return rawData.map(parseGroupCatalogRow).filter((group): group is GroupCatalog => group !== null);
}

/**
 * The groups of a readAll answer. A backend from Sprint 6 on always sends the key; an older one
 * does not, and then the app hides groups, the birth date and making teams and groups, which
 * that backend would lose (null). A failure on the Groups tab is an empty list with an error.
 */
function readGroupsAnswer(payload: ReadAllPayload): { groups: GroupCatalog[] | null; error: string | null } {
  if (!('groups' in payload)) return { groups: null, error: null };
  if (payload.groupsError) return { groups: [], error: tr().store.groupsError };
  try {
    return { groups: parseGroupsCatalog(payload.groups), error: null };
  } catch (groupsError) {
    console.error('Error reading the groups:', groupsError);
    return { groups: [], error: tr().store.groupsError };
  }
}

/**
 * The wants and avoids history of a readAll answer (Sprint 8). A backend that counts links always
 * sends the key; an older one does not (null). A failure only costs the order of the form's lists,
 * so it is an empty history and a console warning, not a message.
 */
function readLinkHistoryAnswer(payload: ReadAllPayload): LinkHistoryEntry[] | null {
  if (!('relationshipHistory' in payload)) return null;
  if (payload.relationshipHistoryError) {
    console.warn('The RelationshipHistory tab failed:', payload.relationshipHistoryError);
    return [];
  }
  try {
    return parseLinkHistory(payload.relationshipHistory);
  } catch (historyError) {
    console.warn('Error reading the relationship history:', historyError);
    return [];
  }
}

/** The selected players as text, to tell whether a fresh read changed any of them. */
function describeSelection(state: { people: Person[]; selectedIds: Set<string> }): string {
  return JSON.stringify(state.people.filter((person) => state.selectedIds.has(person.id)));
}

type RelationshipKind = 'wantsWith' | 'avoidsWith';

interface AppStore {
  // Data
  people: Person[];
  teamsCatalog: TeamCatalog[];
  /**
   * The Groups tab. Null while the backend is older than Sprint 6: it cannot save groups, birth
   * dates or new teams and groups, so the form does not offer them.
   */
  groupsCatalog: GroupCatalog[] | null;
  groupsCatalogError: string | null;
  /**
   * The RelationshipHistory tab (Sprint 8): how many times each player marked each other one. Null
   * while the backend is older and does not count; the form's lists then skip that part of the order.
   */
  linkHistory: LinkHistoryEntry[] | null;
  selectedIds: Set<string>;
  generatedTeams: GeneratedTeams | null;

  // Matches (Sprint 9). Read when «Matches» opens, never with readAll, and never kept on the device.
  /** The backend saves matches (readAll says so). False with an older one: «Matches» is hidden. */
  matchesSupported: boolean;
  /** Null until the first read of this visit. Newest first. */
  matches: Match[] | null;
  matchesStatus: LoadStatus;
  matchesError: string | null;
  /** The result a match was logged from, so «Log Match» turns into «View Match» for it. */
  loggedMatch: { result: GeneratedTeams; matchId: string } | null;
  /** The highest player id ever used, as far as the backend and this visit know (-1: none). */
  highestPlayerId: number;

  // Access (see Access) and whether the sheet answered in this visit. While isFresh is false
  // the screen may show the copy saved on the device: picking works, editing waits.
  access: Access;
  isFresh: boolean;
  /** A read is running (the first one, or a refresh behind the saved copy). */
  isReading: boolean;

  // Loading state
  peopleStatus: LoadStatus;
  isTeamsCatalogLoading: boolean;
  error: string | null;
  dataWarning: string | null;
  teamsCatalogError: string | null;
  teamsCatalogLoaded: boolean;

  // Sync state: writes run one after another; failed ones wait here for a retry.
  pendingSyncCount: number;
  syncErrors: FailedSyncOperation[];

  // Actions - Data fetching
  fetchPeople: () => Promise<void>;
  fetchTeamsCatalog: () => Promise<void>;
  /** Tries a key typed at the gate. It is kept on the device only if the backend accepts it. */
  unlock: (key: string) => Promise<UnlockResult>;

  // Actions - People management
  addPerson: (person: Person) => Promise<void>;
  updatePerson: (person: Person) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  clearAllRelationships: () => Promise<void>;
  clearWantsRelationships: () => Promise<void>;
  clearAvoidsRelationships: () => Promise<void>;

  // Actions - Teams and groups made from the player form. They show at once and save behind;
  // each returns the new id, so the form can mark it.
  createTeam: (name: string, color1: string, color2: string) => string;
  createGroup: (name: string) => string;

  // Actions - Selection
  toggleSelection: (id: string) => void;
  clearSelection: () => void;

  // Actions - Team generation
  setGeneratedTeams: (teams: GeneratedTeams | null) => void;

  // Actions - Matches (Sprint 9). Saves show at once and go to the sheet behind, like players.
  fetchMatches: () => Promise<void>;
  /** Creates or replaces a whole match. `fromResult`: it was logged from the teams on screen. */
  saveMatch: (match: Match, options?: { fromResult?: boolean }) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;

  // Actions - Errors
  setError: (error: string | null) => void;
  dismissDataWarning: () => void;
  retryFailedSyncs: () => Promise<void>;
  dismissSyncErrors: () => void;

  // App State
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const useAppStore = create<AppStore>()((set, get) => {
  let syncQueue: Promise<void> = Promise.resolve();
  let nextFailedOperationId = 1;

  let inflightLoad: Promise<LoadResult> | null = null;

  // Matches (Sprint 9). The latest version of every match saved or deleted in this visit (null:
  // deleted): a save that runs late, or again after a failure, sends what the match is now, and
  // nothing once it was deleted. The version counts local changes, so a read that was on its way
  // while something was saved never covers it up.
  const latestMatch = new Map<string, Match | null>();
  let matchesVersion = 0;

  const findPerson = (id: string) => get().people.find((person) => person.id === id);

  // The backend refused this device's key: nothing of the roster stays on screen or on the device.
  const lock = () => {
    accessKey = '';
    saveAccessKey('');
    clearSavedRead();
    latestMatch.clear();
    matchesVersion++;
    set({
      matchesSupported: false,
      matches: null,
      matchesStatus: 'idle',
      matchesError: null,
      loggedMatch: null,
      access: 'locked',
      isFresh: false,
      isReading: false,
      people: [],
      teamsCatalog: [],
      teamsCatalogLoaded: false,
      isTeamsCatalogLoading: false,
      teamsCatalogError: null,
      groupsCatalog: null,
      groupsCatalogError: null,
      linkHistory: null,
      selectedIds: new Set(),
      generatedTeams: null,
      peopleStatus: 'idle',
      error: null,
      dataWarning: null,
    });
  };

  /** Queues a write. Writes run strictly in order; a failure is kept for retry and never blocks the queue. */
  const runSyncOperation = (operation: SyncOperation): Promise<void> => {
    set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 }));

    const execute = async () => {
      try {
        debugLog(`Sync start: ${operation.label}`);
        await operation.run();
        debugLog(`Sync success: ${operation.label}`);
      } catch (syncError) {
        console.error(`Sync failed (${operation.label}):`, syncError);
        if (syncError instanceof UnauthorizedError) lock();
        const failed: FailedSyncOperation = {
          ...operation,
          id: nextFailedOperationId++,
          detail: getErrorMessage(syncError),
        };
        set((state) => ({ syncErrors: [...state.syncErrors, failed] }));
      } finally {
        set((state) => ({ pendingSyncCount: state.pendingSyncCount - 1 }));
      }
    };

    const result = syncQueue.then(execute);
    syncQueue = result;
    return result;
  };

  /** Sends the current local value of some fields for a list of players. */
  const syncFieldsForPlayers = (ids: string[], fields: SyncedField[]) =>
    runWithConcurrency(ids, BULK_SYNC_CONCURRENCY, async (id) => {
      const current = findPerson(id);
      if (!current) return;
      await postAppsScriptPayload(buildUpdatePayload(current, fields));
    });

  const clearRelationships = async (kinds: RelationshipKind[], label: string) => {
    const affectedIds = get()
      .people.filter((person) => kinds.some((kind) => person[kind].length > 0))
      .map((person) => person.id);
    if (affectedIds.length === 0) return;

    const affected = new Set(affectedIds);
    set((state) => ({
      people: state.people.map((person) => {
        if (!affected.has(person.id)) return person;
        const cleared = { ...person };
        for (const kind of kinds) cleared[kind] = [];
        return cleared;
      }),
      generatedTeams: null,
    }));

    await runSyncOperation({
      label,
      errorMessage: tr().store.couldntClear(label),
      run: () => syncFieldsForPlayers(affectedIds, kinds),
    });
  };

  /** Stores the player rows of a read. Throws when the answer is not a list of rows. */
  const applyPeopleRows = (rawData: unknown) => {
    debugLog('Raw Data from Apps Script:', rawData);

    if (!Array.isArray(rawData)) {
      const serverError =
        rawData && typeof rawData === 'object' && 'error' in rawData ? String(rawData.error) : 'not an array';
      throw new Error(`Incorrect data format: ${serverError}`);
    }

    const { people, skippedRows, warnings } = parsePeopleRows(rawData);

    if (skippedRows > 0) {
      console.warn(`Skipped ${skippedRows} empty or malformed row(s) while loading players.`);
    }

    debugLog('Parsed People:', people);
    set({
      people,
      peopleStatus: 'loaded',
      error: people.length === 0 && skippedRows > 0 ? tr().store.noValidPlayers : null,
      dataWarning: warnings.length > 0 ? warnings.join(' ') : null,
    });
  };

  const applyTeamsCatalog = (teamsCatalog: TeamCatalog[]) => {
    debugLog('Parsed Teams Catalog:', teamsCatalog);
    set({ teamsCatalog, teamsCatalogLoaded: true, isTeamsCatalogLoading: false, teamsCatalogError: null });
  };

  const failTeamsCatalog = (reason: unknown) => {
    console.error('Error fetching teams catalog:', reason);
    set({
      teamsCatalog: [],
      teamsCatalogLoaded: true,
      teamsCatalogError: tr().store.teamsError,
      isTeamsCatalogLoading: false,
    });
  };

  /** Reads the Teams catalog on its own. Never throws: a failure is kept in teamsCatalogError. */
  const loadTeamsCatalog = async () => {
    set({ isTeamsCatalogLoading: true, teamsCatalogError: null });

    try {
      const rawData = await getAppsScriptJson('readTeams');
      debugLog('Raw Teams from Apps Script:', rawData);
      applyTeamsCatalog(parseTeamsCatalog(rawData));
    } catch (fetchError) {
      failTeamsCatalog(fetchError);
    }
  };

  // Loads players and the Teams catalog with one request (`readAll`). Three outcomes:
  // ok, refused (the key is wrong or missing: the gate takes over) and failed (no answer).
  // A backend older than `readAll` answers { error: 'Action unknown' }; then the two separate
  // reads run instead, so rolling the Apps Script back never breaks loading.
  const load = (): Promise<LoadResult> => {
    if (inflightLoad) return inflightLoad;

    if (!APPS_SCRIPT_URL) {
      set({
        access: 'open',
        peopleStatus: 'error',
        error: missingUrlMessage(),
        teamsCatalogLoaded: true,
        teamsCatalogError: missingUrlMessage(),
      });
      return Promise.resolve('failed');
    }

    // With a saved copy on screen the list stays; without one the loader shows.
    const hadCopy = get().peopleStatus === 'loaded';
    // Players picked on a saved copy, to compare with what the sheet says now.
    const pickedOnCopy = !get().isFresh ? describeSelection(get()) : null;
    set({
      isReading: true,
      peopleStatus: hadCopy ? 'loaded' : 'loading',
      error: null,
      isTeamsCatalogLoading: true,
      teamsCatalogError: null,
    });

    inflightLoad = (async (): Promise<LoadResult> => {
      try {
        const rawData = await getAppsScriptJson('readAll');

        if (isUnauthorized(rawData)) {
          lock();
          return 'refused';
        }

        if (isReadAllPayload(rawData)) {
          applyPeopleRows(rawData.players);
          if (rawData.teamsError) {
            failTeamsCatalog(rawData.teamsError);
          } else {
            try {
              applyTeamsCatalog(parseTeamsCatalog(rawData.teams));
            } catch (teamsError) {
              failTeamsCatalog(teamsError);
            }
          }
          const groupsAnswer = readGroupsAnswer(rawData);
          set((state) => ({
            groupsCatalog: groupsAnswer.groups,
            groupsCatalogError: groupsAnswer.error,
            linkHistory: readLinkHistoryAnswer(rawData),
            matchesSupported: readMatchesSupport(rawData),
            // Never lower than what this visit already used (a delete made before this read).
            highestPlayerId: Math.max(state.highestPlayerId, readHighestPlayerId(rawData)),
          }));
          saveRead({
            players: rawData.players,
            teams: Array.isArray(rawData.teams) ? rawData.teams : [],
            ...(Array.isArray(rawData.groups) ? { groups: rawData.groups } : {}),
          });
          set((state) => {
            // The fresh read replaces a saved copy: a pick that is gone from the sheet goes away,
            // and a result made with data that changed is no longer valid.
            const existing = new Set(state.people.map((person) => person.id));
            const selectedIds = new Set([...state.selectedIds].filter((id) => existing.has(id)));
            const changed = pickedOnCopy !== null && pickedOnCopy !== describeSelection({ ...state, selectedIds });
            return {
              access: 'open',
              isFresh: true,
              selectedIds: selectedIds.size === state.selectedIds.size ? state.selectedIds : selectedIds,
              generatedTeams: changed ? null : state.generatedTeams,
            };
          });
          return 'ok';
        }

        debugLog('readAll not available, using read + readTeams:', rawData);
        const [peopleResult] = await Promise.allSettled([
          getAppsScriptJson('read').then(applyPeopleRows),
          loadTeamsCatalog(),
        ]);
        if (peopleResult.status === 'rejected') throw peopleResult.reason;
        set({
          access: 'open',
          isFresh: true,
          groupsCatalog: null,
          groupsCatalogError: null,
          linkHistory: null,
          matchesSupported: false,
        });
        return 'ok';
      } catch (fetchError) {
        console.error('Error fetching people data:', fetchError);
        set((state) => ({
          // A device still waiting at the gate goes in to see the usual error and its retry.
          access: state.access === 'asking' ? 'open' : state.access,
          error: hadCopy
            ? tr().store.couldntRefresh(getErrorMessage(fetchError))
            : tr().store.couldntLoad(getErrorMessage(fetchError)),
          peopleStatus: hadCopy ? 'loaded' : 'error',
        }));
        if (get().isTeamsCatalogLoading) {
          if (hadCopy) set({ isTeamsCatalogLoading: false });
          else failTeamsCatalog(fetchError);
        }
        return 'failed';
      } finally {
        inflightLoad = null;
        set({ isReading: false });
      }
    })();

    return inflightLoad;
  };

  // A copy of the last read, if this device has one: the app opens with it and refreshes behind.
  const savedRead = readSavedRead();
  const savedPeople = savedRead ? parsePeopleRows(savedRead.players).people : [];
  let savedTeams: TeamCatalog[] = [];
  try {
    savedTeams = savedRead ? parseTeamsCatalog(savedRead.teams) : [];
  } catch {
    savedTeams = [];
  }
  let savedGroups: GroupCatalog[] | null = null;
  try {
    savedGroups = savedRead?.groups ? parseGroupsCatalog(savedRead.groups) : null;
  } catch {
    savedGroups = null;
  }
  const hasSavedCopy = savedPeople.length > 0;

  return {
    // Initial state
    people: savedPeople,
    teamsCatalog: savedTeams,
    groupsCatalog: savedGroups,
    groupsCatalogError: null,
    // Editing waits for a fresh read, which brings the history.
    linkHistory: null,
    selectedIds: new Set(),
    generatedTeams: null,
    // Matches wait for a fresh read to say the backend saves them.
    matchesSupported: false,
    matches: null,
    matchesStatus: 'idle',
    matchesError: null,
    loggedMatch: null,
    highestPlayerId: -1,
    // A device with no key and nothing saved waits at the gate for the first answer.
    access: hasSavedCopy || accessKey ? 'open' : 'asking',
    isFresh: false,
    isReading: false,
    peopleStatus: hasSavedCopy ? 'loaded' : 'idle',
    isTeamsCatalogLoading: false,
    error: null,
    dataWarning: null,
    teamsCatalogError: null,
    teamsCatalogLoaded: hasSavedCopy,
    pendingSyncCount: 0,
    syncErrors: [],
    // As this device left it last time (Sprint 8); on until it is ever switched off.
    privacyMode: readPrivacyMode() ?? true,

    togglePrivacyMode: () =>
      set((state) => {
        const privacyMode = !state.privacyMode;
        savePrivacyMode(privacyMode);
        return { privacyMode };
      }),

    fetchPeople: async () => {
      await load();
    },

    unlock: async (key) => {
      // A read sent before the key was typed would answer for the old key: let it finish first.
      if (inflightLoad) await inflightLoad;
      accessKey = key.trim();
      const result = await load();

      if (result === 'ok') {
        saveAccessKey(accessKey);
        return 'open';
      }

      accessKey = '';
      if (result === 'refused') return 'wrong';

      // No answer: stay at the gate, with nothing saved, so the same key can be tried again.
      set({ access: 'locked', peopleStatus: 'idle', error: null, isTeamsCatalogLoading: false });
      return 'unreachable';
    },

    fetchTeamsCatalog: async () => {
      if (get().isTeamsCatalogLoading) return;

      if (!APPS_SCRIPT_URL) {
        set({ teamsCatalogLoaded: true, teamsCatalogError: missingUrlMessage() });
        return;
      }

      await loadTeamsCatalog();
    },

    addPerson: async (person) => {
      const id = person.id || getNextId(get().people, get().highestPlayerId);
      const personWithId = { ...person, id };

      // Optimistic update first. The history counts the new links as the backend will.
      set((state) => ({
        people: [...state.people, personWithId],
        linkHistory: state.linkHistory && recordNewLinks(state.linkHistory, id, undefined, personWithId),
        highestPlayerId: Math.max(state.highestPlayerId, numericId(id)),
      }));

      await runSyncOperation({
        label: `player "${personWithId.nickname}"`,
        errorMessage: tr().store.couldntAdd(personWithId.nickname),
        run: async () => {
          const current = findPerson(id);
          if (!current) return; // Deleted locally before it was saved.
          await postAppsScriptPayload(buildAddPayload(current));
        },
      });
    },

    updatePerson: async (person) => {
      const previousPerson = findPerson(person.id);
      const changedFields = getChangedFields(previousPerson, person);

      // Optimistic update first. A result that includes this player is now stale, and a player
      // made inactive leaves the picks.
      set((state) => {
        const wasSelected = state.selectedIds.has(person.id);
        const selectedIds =
          wasSelected && person.active === false
            ? new Set([...state.selectedIds].filter((id) => id !== person.id))
            : state.selectedIds;
        return {
          people: state.people.map((existing) => (existing.id === person.id ? person : existing)),
          selectedIds,
          generatedTeams: wasSelected ? null : state.generatedTeams,
          linkHistory: state.linkHistory && recordNewLinks(state.linkHistory, person.id, previousPerson, person),
        };
      });

      if (changedFields.length === 0) return;

      await runSyncOperation({
        label: `player "${person.nickname}"`,
        errorMessage: tr().store.couldntUpdate(person.nickname),
        run: async () => {
          const current = findPerson(person.id);
          if (!current) return;
          await postAppsScriptPayload(buildUpdatePayload(current, changedFields));
        },
      });
    },

    deletePerson: async (id) => {
      const state = get();
      const existing = state.people.find((person) => person.id === id);
      const label = existing?.nickname || `ID ${id}`;
      const referencingIds = state.people
        .filter((person) => person.id !== id && (person.wantsWith.includes(id) || person.avoidsWith.includes(id)))
        .map((person) => person.id);
      const referencing = new Set(referencingIds);

      // Optimistic update first: remove the player and every link that points at them. Their id is
      // never handed out again in this visit (the backend remembers it for the next ones).
      set((innerState) => {
        const newSelected = new Set(innerState.selectedIds);
        const wasSelected = newSelected.delete(id);
        return {
          highestPlayerId: Math.max(innerState.highestPlayerId, numericId(id)),
          people: innerState.people
            .filter((person) => person.id !== id)
            .map((person) =>
              referencing.has(person.id)
                ? {
                    ...person,
                    wantsWith: person.wantsWith.filter((linkedId) => linkedId !== id),
                    avoidsWith: person.avoidsWith.filter((linkedId) => linkedId !== id),
                  }
                : person,
            ),
          selectedIds: newSelected,
          generatedTeams: wasSelected ? null : innerState.generatedTeams,
        };
      });

      await runSyncOperation({
        label: `delete "${label}"`,
        errorMessage: tr().store.couldntDelete(label),
        run: async () => {
          if (id.startsWith(MISSING_ID_PREFIX)) {
            // The Apps Script finds rows by id, so this row can only be removed in the sheet.
            throw new Error(tr().store.rowWithoutId);
          }
          await postAppsScriptPayload({ action: 'delete', id });
          await syncFieldsForPlayers(referencingIds, ['wantsWith', 'avoidsWith']);
        },
      });
    },

    clearAllRelationships: () => clearRelationships(['wantsWith', 'avoidsWith'], 'all links'),

    clearWantsRelationships: () => clearRelationships(['wantsWith'], 'positive links'),

    clearAvoidsRelationships: () => clearRelationships(['avoidsWith'], 'negative links'),

    createTeam: (name, color1, color2) => {
      const trimmed = name.trim();
      const teamId = uniqueCatalogId(trimmed, get().teamsCatalog.map((team) => team.teamId), 'team');
      set((state) => ({ teamsCatalog: [...state.teamsCatalog, { teamId, name: trimmed, color1, color2, crest: '' }] }));
      void runSyncOperation({
        label: `team "${trimmed}"`,
        errorMessage: tr().store.couldntAddTeam(trimmed),
        run: () => postAppsScriptPayload({ action: 'addTeam', teamId, name: trimmed, color1, color2 }),
      });
      return teamId;
    },

    createGroup: (name) => {
      const trimmed = name.trim();
      const groupId = uniqueCatalogId(trimmed, (get().groupsCatalog ?? []).map((group) => group.groupId), 'group');
      set((state) => ({ groupsCatalog: [...(state.groupsCatalog ?? []), { groupId, name: trimmed, place: '' }] }));
      void runSyncOperation({
        label: `group "${trimmed}"`,
        errorMessage: tr().store.couldntAddGroup(trimmed),
        run: () => postAppsScriptPayload({ action: 'addGroup', groupId, name: trimmed }),
      });
      return groupId;
    },

    // Changing the selection makes a generated result stale, so it is cleared. Inactive players
    // cannot be picked.
    toggleSelection: (id) => set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else if (state.people.find((person) => person.id === id)?.active !== false) {
        newSelected.add(id);
      } else {
        return state;
      }
      return { selectedIds: newSelected, generatedTeams: null };
    }),

    clearSelection: () => set({ selectedIds: new Set(), generatedTeams: null }),

    setGeneratedTeams: (teams) => set({ generatedTeams: teams }),

    fetchMatches: async () => {
      if (get().matchesStatus === 'loading') return;
      if (!APPS_SCRIPT_URL) {
        set({ matchesStatus: 'error', matchesError: missingUrlMessage() });
        return;
      }
      set({ matchesStatus: 'loading', matchesError: null });

      try {
        // A few tries at most: each one waits for the saves already sent, so the read has them.
        for (let attempt = 0; attempt < 3; attempt++) {
          const version = matchesVersion;
          await syncQueue;
          const rawData = await getAppsScriptJson('readMatches');
          if (isUnauthorized(rawData)) {
            lock();
            return;
          }
          const matches = parseMatches(rawData);
          if (version !== matchesVersion) continue; // something was saved meanwhile: read again
          // What this visit saved or deleted goes on top: a save that failed and waits for Retry
          // stays in the list, and a delete still on its way does not come back.
          const merged = new Map(matches.map((match) => [match.matchId, match]));
          for (const [matchId, local] of latestMatch) {
            if (local) merged.set(matchId, local);
            else merged.delete(matchId);
          }
          set({ matches: sortMatches([...merged.values()]), matchesStatus: 'loaded', matchesError: null });
          return;
        }
        // Saves kept coming while reading: what this device has stays, and a later read catches up.
        set((state) => ({ matchesStatus: state.matches ? 'loaded' : 'idle' }));
      } catch (fetchError) {
        console.error('Error fetching matches:', fetchError);
        set({ matchesStatus: 'error', matchesError: tr().store.couldntLoadMatches(getErrorMessage(fetchError)) });
      }
    },

    saveMatch: async (match, options = {}) => {
      matchesVersion++;
      latestMatch.set(match.matchId, match);
      set((state) => ({
        matches: state.matches
          ? sortMatches([...state.matches.filter((existing) => existing.matchId !== match.matchId), match])
          : state.matches,
        loggedMatch:
          options.fromResult && state.generatedTeams
            ? { result: state.generatedTeams, matchId: match.matchId }
            : state.loggedMatch,
      }));

      const day = formatDay(match.date, tr().matches.weekdays);
      await runSyncOperation({
        label: `match ${match.matchId}`,
        errorMessage: tr().store.couldntSaveMatch(day),
        run: async () => {
          const current = latestMatch.get(match.matchId);
          if (!current) return; // Deleted before it was saved.
          await postAppsScriptPayload({ action: 'saveMatch', match: serializeMatch(current) });
        },
      });
    },

    deleteMatch: async (matchId) => {
      const existing = latestMatch.get(matchId) ?? get().matches?.find((match) => match.matchId === matchId);
      matchesVersion++;
      latestMatch.set(matchId, null);
      set((state) => ({
        matches: state.matches ? state.matches.filter((match) => match.matchId !== matchId) : state.matches,
        loggedMatch: state.loggedMatch?.matchId === matchId ? null : state.loggedMatch,
      }));

      const day = existing ? formatDay(existing.date, tr().matches.weekdays) : matchId;
      await runSyncOperation({
        label: `delete match ${matchId}`,
        errorMessage: tr().store.couldntDeleteMatch(day),
        run: () => postAppsScriptPayload({ action: 'deleteMatch', matchId }),
      });
    },

    setError: (error) => set({ error }),

    dismissDataWarning: () => set({ dataWarning: null }),

    retryFailedSyncs: async () => {
      const failed = get().syncErrors;
      if (failed.length === 0) return;

      set({ syncErrors: [] });
      await Promise.all(
        failed.map(({ label, errorMessage, run }) => runSyncOperation({ label, errorMessage, run })),
      );
    },

    dismissSyncErrors: () => set({ syncErrors: [] }),
  };
});

export default useAppStore;
