import { create } from 'zustand';
import type { Attributes, AttributeLevel, GeneratedTeams, GKWillingness, Person, Role } from '../types';

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

type SyncStatus = 'idle' | 'saving' | 'synced' | 'error';

interface FailedSyncOperation {
  label: string;
  errorMessage: string;
  run: () => Promise<void>;
}

// Helper to get next sequential ID
function getNextId(people: Person[]): string {
  if (people.length === 0) return '0';
  const maxId = Math.max(...people.map(p => parseInt(p.id, 10) || 0));
  return String(maxId + 1);
}

function parseArrayField(value: string | number | undefined): string[] {
  if (value === undefined || value === null || value === '') return [];
  const str = String(value).trim();
  if (str === '') return [];
  return str.split('|').map(s => s.trim()).filter(Boolean);
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

function parsePersonRow(row: unknown, index: number): Person | null {
  if (!row || typeof row !== 'object') return null;

  const rowRecord = row as Record<string, unknown>;
  const normalizedRow = new Map<string, unknown>();

  for (const [key, value] of Object.entries(rowRecord)) {
    normalizedRow.set(normalizeKey(key), value);
  }

  const getValue = (targetKey: string): unknown => normalizedRow.get(normalizeKey(targetKey));

  const nickname = getValue('nickname')?.toString().trim() || '';
  if (!nickname || nickname.toLowerCase() === 'unknown') return null;

  const id = getValue('id')?.toString().trim() || String(index + 1);
  const name = getValue('name')?.toString().trim() || '';
  const role = validateRole(getValue('role')?.toString());
  const rating = validateRating(getValue('rating')?.toString());
  const avatar = getValue('avatar')?.toString().trim() || '';
  const gkWillingness = validateGKWillingness(getValue('gkwillingness')?.toString());
  const wantsWith = parseArrayField(getValue('wantswith') as string | number | undefined);
  const avoidsWith = parseArrayField(getValue('avoidswith') as string | number | undefined);
  const attributes = parseAttributes(getValue('attributes'));

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
  };
}

function validateRole(value: string | undefined): Role {
  const validRoles: Role[] = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
  const normalized = (value || '').toUpperCase() as Role;
  return validRoles.includes(normalized) ? normalized : 'FLEX';
}

function validateGKWillingness(value: string | undefined): GKWillingness {
  const valid: GKWillingness[] = ['yes', 'no', 'low'];
  const normalized = (value || '').toLowerCase() as GKWillingness;
  return valid.includes(normalized) ? normalized : 'no';
}

function validateRating(value: string | undefined): number {
  const num = parseInt(value || '5', 10);
  if (isNaN(num)) return 5;
  return Math.max(1, Math.min(10, num));
}

function buildUpdatePayload(person: Person) {
  return {
    action: 'update',
    id: person.id,
    name: person.name,
    nickname: person.nickname,
    role: person.role,
    rating: person.rating,
    avatar: person.avatar,
    gkWillingness: person.gkWillingness,
    wantsWith: person.wantsWith.join('|'),
    avoidsWith: person.avoidsWith.join('|'),
    attributes: JSON.stringify(person.attributes || {}),
  };
}

function buildAddPayload(person: Person) {
  return {
    action: 'add',
    id: person.id,
    name: person.name,
    nickname: person.nickname,
    role: person.role,
    rating: person.rating,
    avatar: person.avatar,
    gkWillingness: person.gkWillingness,
    wantsWith: person.wantsWith.join('|'),
    avoidsWith: person.avoidsWith.join('|'),
    attributes: JSON.stringify(person.attributes || {}),
  };
}

function buildDeletePayload(id: string) {
  return {
    action: 'delete',
    id,
  };
}

async function postAppsScriptPayload(payload: Record<string, unknown>): Promise<void> {
  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify(payload),
  });
}

async function postPersonUpdate(person: Person): Promise<void> {
  await postAppsScriptPayload(buildUpdatePayload(person));
}

interface AppStore {
  // Data
  people: Person[];
  selectedIds: Set<string>;
  generatedTeams: GeneratedTeams | null;
  
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Sync state
  syncStatus: SyncStatus;
  syncMessage: string | null;
  syncUpdatedAt: number | null;
  lastFailedSyncOperation: FailedSyncOperation | null;
  
  // Actions - Data fetching
  fetchPeople: () => Promise<void>;
  
  // Actions - People management
  setPeople: (people: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  clearAllRelationships: () => Promise<void>;
  clearWantsRelationships: () => Promise<void>;
  clearAvoidsRelationships: () => Promise<void>;
  
  // Actions - Selection
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  
  // Actions - Team generation
  setGeneratedTeams: (teams: GeneratedTeams | null) => void;
  
  // Actions - Error handling
  setError: (error: string | null) => void;
  retryLastSync: () => Promise<void>;
  clearSyncState: () => void;

  // App State
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const useAppStore = create<AppStore>()((set, get) => {
  const runSyncOperation = async (params: {
    label: string;
    task: () => Promise<void>;
    errorMessage: string;
    retryTask?: () => Promise<void>;
  }) => {
    console.info(`Sync start: ${params.label}`);
    set({
      syncStatus: 'saving',
      syncMessage: `Syncing ${params.label}...`,
      syncUpdatedAt: Date.now(),
      lastFailedSyncOperation: null,
    });

    try {
      await params.task();
      console.info(`Sync success: ${params.label}`);
      set({
        syncStatus: 'synced',
        syncMessage: `Synced ${params.label}.`,
        syncUpdatedAt: Date.now(),
        lastFailedSyncOperation: null,
      });
    } catch (syncError) {
      console.error(`Sync failed (${params.label}):`, syncError);
      const retryOperation: FailedSyncOperation = {
        label: params.label,
        errorMessage: params.errorMessage,
        run: params.retryTask ?? params.task,
      };

      set({
        syncStatus: 'error',
        syncMessage: params.errorMessage,
        syncUpdatedAt: Date.now(),
        lastFailedSyncOperation: retryOperation,
      });
    }
  };

  return {
    // Initial state
    people: [],
    selectedIds: new Set(),
    generatedTeams: null,
    isLoading: false,
    error: null,
    syncStatus: 'idle',
    syncMessage: null,
    syncUpdatedAt: null,
    lastFailedSyncOperation: null,
    privacyMode: true,

    togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),

    // Fetch people from Google Sheets CSV (Read-only)
    fetchPeople: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=read`);
        const rawData = await response.json();
        
        console.log('Raw Data from Apps Script:', rawData);

        if (!Array.isArray(rawData)) {
          throw new Error('Incorrect data format: not an array');
        }

        let skippedRows = 0;
        const people: Person[] = [];

        rawData.forEach((row: unknown, index: number) => {
          try {
            const parsed = parsePersonRow(row, index);
            if (parsed) {
              people.push(parsed);
            } else {
              skippedRows++;
            }
          } catch (rowError) {
            skippedRows++;
            console.warn(`Skipped malformed row ${index + 1}:`, rowError);
          }
        });

        if (skippedRows > 0) {
          console.warn(`Skipped ${skippedRows} malformed row(s) while loading players.`);
        }

        console.log('Parsed People:', people);
        set({
          people,
          isLoading: false,
          error: people.length === 0 && skippedRows > 0 ? 'No valid players found in Google Sheets' : null,
        });
      } catch (fetchError) {
        console.error('Error fetching people data:', fetchError);
        set({ 
          error: 'Error loading data from Google Sheets', 
          isLoading: false 
        });
      }
    },

    setPeople: (people) => set({ people }),

    addPerson: async (person) => {
      const state = get();
      const newId = person.id || getNextId(state.people);
      const personWithId = { ...person, id: newId };

      // Optimistic update first
      set((innerState) => ({
        people: [...innerState.people, personWithId],
      }));

      const syncTask = () => postAppsScriptPayload(buildAddPayload(personWithId));
      await runSyncOperation({
        label: `player "${personWithId.nickname}"`,
        task: syncTask,
        retryTask: syncTask,
        errorMessage: `Couldn't sync "${personWithId.nickname}" to Google Sheets. Saved locally.`,
      });
    },

    updatePerson: async (person) => {
      // Optimistic update first
      set((state) => ({
        people: state.people.map((existing) => (existing.id === person.id ? person : existing)),
      }));

      const syncTask = () => postPersonUpdate(person);
      await runSyncOperation({
        label: `player "${person.nickname}"`,
        task: syncTask,
        retryTask: syncTask,
        errorMessage: `Couldn't update "${person.nickname}" in Google Sheets. Updated locally.`,
      });
    },

    deletePerson: async (id) => {
      const existing = get().people.find((person) => person.id === id);
      const label = existing?.nickname || `ID ${id}`;

      // Optimistic update first
      set((state) => {
        const newSelected = new Set(state.selectedIds);
        newSelected.delete(id);
        return {
          people: state.people.filter((person) => person.id !== id),
          selectedIds: newSelected,
        };
      });

      const syncTask = () => postAppsScriptPayload(buildDeletePayload(id));
      await runSyncOperation({
        label: `delete "${label}"`,
        task: syncTask,
        retryTask: syncTask,
        errorMessage: `Couldn't delete "${label}" in Google Sheets. Removed locally.`,
      });
    },

    clearAllRelationships: async () => {
      const currentPeople = get().people;
      if (currentPeople.length === 0) return;

      const updatedPeople = currentPeople.map((person) => ({
        ...person,
        wantsWith: [],
        avoidsWith: [],
      }));

      // Optimistic update first
      set({ people: updatedPeople });

      const syncTask = () => Promise.all(updatedPeople.map((person) => postPersonUpdate(person))).then(() => undefined);
      await runSyncOperation({
        label: 'all links',
        task: syncTask,
        retryTask: syncTask,
        errorMessage: 'Couldn\'t clear all links in Google Sheets. Cleared locally.',
      });
    },

    clearWantsRelationships: async () => {
      const currentPeople = get().people;
      if (currentPeople.length === 0) return;

      const updatedPeople = currentPeople.map((person) => ({
        ...person,
        wantsWith: [],
      }));

      // Optimistic update first
      set({ people: updatedPeople });

      const syncTask = () => Promise.all(updatedPeople.map((person) => postPersonUpdate(person))).then(() => undefined);
      await runSyncOperation({
        label: 'positive links',
        task: syncTask,
        retryTask: syncTask,
        errorMessage: 'Couldn\'t clear positive links in Google Sheets. Cleared locally.',
      });
    },

    clearAvoidsRelationships: async () => {
      const currentPeople = get().people;
      if (currentPeople.length === 0) return;

      const updatedPeople = currentPeople.map((person) => ({
        ...person,
        avoidsWith: [],
      }));

      // Optimistic update first
      set({ people: updatedPeople });

      const syncTask = () => Promise.all(updatedPeople.map((person) => postPersonUpdate(person))).then(() => undefined);
      await runSyncOperation({
        label: 'negative links',
        task: syncTask,
        retryTask: syncTask,
        errorMessage: 'Couldn\'t clear negative links in Google Sheets. Cleared locally.',
      });
    },

    toggleSelection: (id) => set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    }),

    clearSelection: () => set({ selectedIds: new Set(), generatedTeams: null }),

    selectAll: (ids) => set({ selectedIds: new Set(ids) }),

    setGeneratedTeams: (teams) => set({ generatedTeams: teams }),

    setError: (error) => set({ error }),

    retryLastSync: async () => {
      const failed = get().lastFailedSyncOperation;
      if (!failed) return;

      await runSyncOperation({
        label: failed.label,
        task: failed.run,
        retryTask: failed.run,
        errorMessage: failed.errorMessage,
      });
    },

    clearSyncState: () => set({
      syncStatus: 'idle',
      syncMessage: null,
      syncUpdatedAt: Date.now(),
      lastFailedSyncOperation: null,
    }),
  };
});

export default useAppStore;
