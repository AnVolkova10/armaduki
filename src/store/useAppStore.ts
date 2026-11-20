import { create } from 'zustand';
import type { Attributes, AttributeLevel, GeneratedTeams, GKWillingness, Person, Role, TeamCatalog } from '../types';

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
const MISSING_URL_MESSAGE =
  'Missing VITE_APPS_SCRIPT_URL. Add it to .env (local) or to the Vercel environment variables.';

// Bulk writes (clear links, delete cleanup) run a few requests at a time so Apps Script
// does not hit its simultaneous-executions limit.
const BULK_SYNC_CONCURRENCY = 4;
const SYNC_REQUEST_TIMEOUT_MS = 60_000;

// Players whose sheet row has no id get a placeholder that can never collide with real ids.
const MISSING_ID_PREFIX = 'missing-id-row-';

const DEFAULT_ROLE: Role = 'FLEX';
const DEFAULT_RATING = 5;
const DEFAULT_GK_WILLINGNESS: GKWillingness = 'no';

function debugLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

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

// Next id = highest numeric id seen anywhere (players or their links) + 1, so a new player
// never inherits wants/avoids that still point at the id of a deleted player.
function getNextId(people: Person[]): string {
  let maxId = -1;
  for (const person of people) {
    for (const id of [person.id, ...person.wantsWith, ...person.avoidsWith]) {
      if (/^\d+$/.test(id)) maxId = Math.max(maxId, Number(id));
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

const ATTRIBUTE_KEYS: (keyof Attributes)[] = [
  'shooting',
  'control',
  'passing',
  'defense',
  'pace',
  'vision',
  'grit',
  'stamina',
];

const DEFAULT_ATTRIBUTES: Attributes = {
  shooting: 'mid',
  control: 'mid',
  passing: 'mid',
  defense: 'mid',
  pace: 'mid',
  vision: 'mid',
  grit: 'mid',
  stamina: 'mid',
};

function isAttributeLevel(value: unknown): value is AttributeLevel {
  return value === 'high' || value === 'mid' || value === 'low';
}

function parseAttributes(value: unknown): Attributes {
  if (value === undefined || value === null || value === '') {
    return { ...DEFAULT_ATTRIBUTES };
  }

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ...DEFAULT_ATTRIBUTES };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_ATTRIBUTES };
  }

  const raw = parsed as Partial<Record<keyof Attributes, unknown>>;
  const normalized: Attributes = { ...DEFAULT_ATTRIBUTES };

  for (const key of ATTRIBUTE_KEYS) {
    const maybeLevel = raw[key];
    if (isAttributeLevel(maybeLevel)) {
      normalized[key] = maybeLevel;
    }
  }

  return normalized;
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
  const gkWillingness = validateGKWillingness(getValue('gkwillingness'));
  const wantsWith = parseRelationshipIds(getValue('wantswith'), id);
  const avoidsWith = parseRelationshipIds(getValue('avoidswith'), id);
  const attributes = parseAttributes(getValue('attributes'));
  const shirtNumber = getOptionalField(getValue('shirtnumber'));
  const primaryTeam = getOptionalField(getValue('primaryteam'));
  const teams = parseArrayField(getValue('teams'));
  const groups = parseArrayField(getValue('groups'));
  const availability = parseArrayField(getValue('availability'));
  const birthYear = getOptionalField(getValue('birthyear'));
  const secondaryRole = validateOptionalRole(getValue('secondaryrole'));
  const active = validateActive(getValue('active'));
  const notes = getOptionalField(getValue('notes'));

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
    birthYear,
    secondaryRole,
    active,
    notes,
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

function validateRole(value: unknown): Role {
  const validRoles: Role[] = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
  const normalized = getOptionalString(value).toUpperCase() as Role;
  return validRoles.includes(normalized) ? normalized : DEFAULT_ROLE;
}

function validateOptionalRole(value: unknown): Role | undefined {
  const normalized = getOptionalString(value);
  if (!normalized) return undefined;

  const role = validateRole(normalized);
  return role === normalized.toUpperCase() ? role : undefined;
}

function validateGKWillingness(value: unknown): GKWillingness {
  const valid: GKWillingness[] = ['good', 'no', 'low'];
  const normalized = getOptionalString(value).toLowerCase();
  if (normalized === 'yes') return 'good';
  return valid.includes(normalized as GKWillingness) ? (normalized as GKWillingness) : DEFAULT_GK_WILLINGNESS;
}

function validateActive(value: unknown): boolean {
  const normalized = getOptionalString(value).toLowerCase();
  if (!normalized) return true;
  if (['false', 'no', '0', 'inactive', 'off'].includes(normalized)) return false;
  return true;
}

function validateRating(value: unknown): number {
  const num = typeof value === 'number' ? value : parseInt(getOptionalString(value) || String(DEFAULT_RATING), 10);
  if (!Number.isFinite(num)) return DEFAULT_RATING;
  return Math.max(1, Math.min(10, Math.trunc(num)));
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
        duplicates.push(`id ${parsed.id} (rows ${firstRow} and ${toSheetRow(index)})`);
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
    warnings.push(
      `Duplicate player ids in Google Sheets: ${duplicates.join(', ')}. Only the first row is shown; give each row its own id.`,
    );
  }
  if (missingIdRows.length > 0) {
    warnings.push(
      `Players without id in Google Sheets (rows ${missingIdRows.join(', ')}). Add an id in the sheet before editing them here.`,
    );
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
  birthYear: (person: Person) => getOptionalString(person.birthYear),
  secondaryRole: (person: Person) => getOptionalString(person.secondaryRole),
  active: (person: Person) => person.active ?? true,
  notes: (person: Person) => getOptionalString(person.notes),
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

type SheetsPayload = { action: 'add' | 'update' | 'delete'; id: string } & Record<string, unknown>;

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
};

async function postAppsScriptPayload(payload: SheetsPayload): Promise<void> {
  if (!APPS_SCRIPT_URL) throw new Error(MISSING_URL_MESSAGE);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SYNC_REQUEST_TIMEOUT_MS);

  try {
    // text/plain keeps this a "simple" CORS request (no preflight), so the
    // Apps Script answer can be read and checked instead of assumed.
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const responseText = (await response.text()).trim();

    if (!response.ok) {
      throw new Error(`Apps Script returned HTTP ${response.status}.`);
    }

    if (!SUCCESS_RESPONSES[payload.action].includes(responseText)) {
      throw new Error(`Apps Script answered: ${responseText.slice(0, 200) || '(empty response)'}`);
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Apps Script did not answer within ${SYNC_REQUEST_TIMEOUT_MS / 1000}s.`, { cause: error });
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

/** Answer of `action=readAll`: players and teams in one request. */
interface ReadAllPayload {
  players: unknown[];
  teams?: unknown;
  teamsError?: unknown;
}

function isReadAllPayload(value: unknown): value is ReadAllPayload {
  return Boolean(value) && typeof value === 'object' && Array.isArray((value as ReadAllPayload).players);
}

async function getAppsScriptJson(action: 'readAll' | 'read' | 'readTeams'): Promise<unknown> {
  const response = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
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

type RelationshipKind = 'wantsWith' | 'avoidsWith';

interface AppStore {
  // Data
  people: Person[];
  teamsCatalog: TeamCatalog[];
  selectedIds: Set<string>;
  generatedTeams: GeneratedTeams | null;

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

  // Actions - People management
  addPerson: (person: Person) => Promise<void>;
  updatePerson: (person: Person) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  clearAllRelationships: () => Promise<void>;
  clearWantsRelationships: () => Promise<void>;
  clearAvoidsRelationships: () => Promise<void>;

  // Actions - Selection
  toggleSelection: (id: string) => void;
  clearSelection: () => void;

  // Actions - Team generation
  setGeneratedTeams: (teams: GeneratedTeams | null) => void;

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

  const findPerson = (id: string) => get().people.find((person) => person.id === id);

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
      errorMessage: `Couldn't clear ${label} in Google Sheets.`,
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
      error: people.length === 0 && skippedRows > 0 ? 'No valid players found in Google Sheets' : null,
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
      teamsCatalogError: 'Error loading teams catalog from Google Sheets',
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

  return {
    // Initial state
    people: [],
    teamsCatalog: [],
    selectedIds: new Set(),
    generatedTeams: null,
    peopleStatus: 'idle',
    isTeamsCatalogLoading: false,
    error: null,
    dataWarning: null,
    teamsCatalogError: null,
    teamsCatalogLoaded: false,
    pendingSyncCount: 0,
    syncErrors: [],
    privacyMode: true,

    togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),

    // Loads players and the Teams catalog with one request (`readAll`). A backend older than
    // `readAll` answers { error: 'Action unknown' }; then the two separate reads run instead,
    // so rolling the Apps Script back never breaks loading.
    fetchPeople: async () => {
      if (get().peopleStatus === 'loading') return;

      if (!APPS_SCRIPT_URL) {
        set({
          peopleStatus: 'error',
          error: MISSING_URL_MESSAGE,
          teamsCatalogLoaded: true,
          teamsCatalogError: MISSING_URL_MESSAGE,
        });
        return;
      }

      set({ peopleStatus: 'loading', error: null, isTeamsCatalogLoading: true, teamsCatalogError: null });

      try {
        const rawData = await getAppsScriptJson('readAll');

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
          return;
        }

        debugLog('readAll not available, using read + readTeams:', rawData);
        const [peopleResult] = await Promise.allSettled([
          getAppsScriptJson('read').then(applyPeopleRows),
          loadTeamsCatalog(),
        ]);
        if (peopleResult.status === 'rejected') throw peopleResult.reason;
      } catch (fetchError) {
        console.error('Error fetching people data:', fetchError);
        set({
          error: `Error loading data from Google Sheets. ${getErrorMessage(fetchError)}`,
          peopleStatus: 'error',
        });
        if (get().isTeamsCatalogLoading) failTeamsCatalog(fetchError);
      }
    },

    fetchTeamsCatalog: async () => {
      if (get().isTeamsCatalogLoading) return;

      if (!APPS_SCRIPT_URL) {
        set({ teamsCatalogLoaded: true, teamsCatalogError: MISSING_URL_MESSAGE });
        return;
      }

      await loadTeamsCatalog();
    },

    addPerson: async (person) => {
      const id = person.id || getNextId(get().people);
      const personWithId = { ...person, id };

      // Optimistic update first
      set((state) => ({
        people: [...state.people, personWithId],
      }));

      await runSyncOperation({
        label: `player "${personWithId.nickname}"`,
        errorMessage: `Couldn't save new player "${personWithId.nickname}" to Google Sheets.`,
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

      // Optimistic update first. A result that includes this player is now stale.
      set((state) => ({
        people: state.people.map((existing) => (existing.id === person.id ? person : existing)),
        generatedTeams: state.selectedIds.has(person.id) ? null : state.generatedTeams,
      }));

      if (changedFields.length === 0) return;

      await runSyncOperation({
        label: `player "${person.nickname}"`,
        errorMessage: `Couldn't save changes to "${person.nickname}" in Google Sheets.`,
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

      // Optimistic update first: remove the player and every link that points at them.
      set((innerState) => {
        const newSelected = new Set(innerState.selectedIds);
        const wasSelected = newSelected.delete(id);
        return {
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
        errorMessage: `Couldn't delete "${label}" in Google Sheets.`,
        run: async () => {
          if (id.startsWith(MISSING_ID_PREFIX)) {
            // The Apps Script finds rows by id, so this row can only be removed in the sheet.
            throw new Error('This row has no id in Google Sheets. Delete it there, or add an id first.');
          }
          await postAppsScriptPayload({ action: 'delete', id });
          await syncFieldsForPlayers(referencingIds, ['wantsWith', 'avoidsWith']);
        },
      });
    },

    clearAllRelationships: () => clearRelationships(['wantsWith', 'avoidsWith'], 'all links'),

    clearWantsRelationships: () => clearRelationships(['wantsWith'], 'positive links'),

    clearAvoidsRelationships: () => clearRelationships(['avoidsWith'], 'negative links'),

    // Changing the selection makes a generated result stale, so it is cleared.
    toggleSelection: (id) => set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected, generatedTeams: null };
    }),

    clearSelection: () => set({ selectedIds: new Set(), generatedTeams: null }),

    setGeneratedTeams: (teams) => set({ generatedTeams: teams }),

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
