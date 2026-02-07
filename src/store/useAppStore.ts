import { create } from 'zustand';
import type { Person, Role, GKWillingness, GeneratedTeams } from '../types';

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

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

function validateRole(value: string | undefined): Role {
  const validRoles: Role[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX'];
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

interface AppStore {
  // Data
  people: Person[];
  selectedIds: Set<string>;
  generatedTeams: GeneratedTeams | null;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions - Data fetching
  fetchPeople: () => Promise<void>;
  
  // Actions - People management
  setPeople: (people: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  
  // Actions - Selection
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  
  // Actions - Team generation
  setGeneratedTeams: (teams: GeneratedTeams | null) => void;
  
  // Actions - Error handling
  setError: (error: string | null) => void;

  // App State
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const useAppStore = create<AppStore>()((set) => ({
  // Initial state
  people: [],
  selectedIds: new Set(),
  generatedTeams: null,
  isLoading: false,
  error: null,
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
        throw new Error('Formato de datos incorrecto: no es un array');
      }

      const people: Person[] = rawData
        .map((row: any) => {
          // Helper to find key ignoring case and spaces
          const getValue = (targetKey: string) => {
            const key = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '') === targetKey.toLowerCase());
            return key ? row[key] : undefined;
          };

          return {
            id: getValue('id')?.toString().trim() || '0',
            name: getValue('name')?.toString().trim() || '',
            nickname: getValue('nickname')?.toString().trim() || 'Unknown',
            role: validateRole(getValue('role')),
            rating: validateRating(getValue('rating')),
            avatar: getValue('avatar')?.toString().trim() || '',
            gkWillingness: validateGKWillingness(getValue('gkwillingness')),
            wantsWith: parseArrayField(getValue('wantswith')),
            avoidsWith: parseArrayField(getValue('avoidswith')),
            attributes: getValue('attributes') ? (typeof getValue('attributes') === 'string' ? JSON.parse(getValue('attributes')) : getValue('attributes')) : {
              shooting: 'mid', control: 'mid', passing: 'mid', defense: 'mid',
              pace: 'mid', vision: 'mid', grit: 'mid', stamina: 'mid'
            }
          };
        }).filter((p: Person) => p.nickname !== 'Unknown' && p.nickname !== '');


      console.log('Parsed People:', people);
      set({ people, isLoading: false });
    } catch (error) {
      console.error('Error fetching people data:', error);
      set({ 
        error: 'Error cargando datos desde Google Sheets', 
        isLoading: false 
      });
    }
  },

  setPeople: (people) => set({ people }),

  addPerson: async (person) => {
    // Generate sequential ID if not provided
    const state = useAppStore.getState();
    const newId = person.id || getNextId(state.people);
    const personWithId = { ...person, id: newId };
    
    // Optimistic update
    set((state) => ({ 
      people: [...state.people, personWithId] 
    }));

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'add',
          id: personWithId.id,
          name: person.name,
          nickname: person.nickname,
          role: person.role,
          rating: person.rating,
          avatar: person.avatar,
          gkWillingness: person.gkWillingness,
          wantsWith: person.wantsWith.join('|'),
          avoidsWith: person.avoidsWith.join('|'),
          // New stats columns
          attributes: JSON.stringify(person.attributes || {}),
        }),
      });
    } catch (error) {
      console.error('Error adding person to sheet:', error);
      set({ error: 'Error agregando jugador al Excel (se guardó localmente)' });
    }
  },

  updatePerson: async (person) => {
    // Optimistic update
    set((state) => ({
      people: state.people.map(p => p.id === person.id ? person : p)
    }));

    const payload = {
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

    console.log('[DEBUG] updatePerson payload:', payload);

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });
      console.log('[DEBUG] updatePerson response:', response.type, response.status);
    } catch (error) {
      console.error('[DEBUG] updatePerson ERROR:', error);
      set({ error: 'Error actualizando jugador en Excel (se actualizó localmente)' });
    }
  },


  deletePerson: async (id) => {
    // Optimistic update
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      return {
        people: state.people.filter(p => p.id !== id),
        selectedIds: newSelected,
      };
    });

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'delete',
          id,
        }),
      });
    } catch (error) {
      console.error('Error deleting person from sheet:', error);
      set({ error: 'Error eliminando jugador del Excel (se eliminó localmente)' });
    }
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
}));

export default useAppStore;
