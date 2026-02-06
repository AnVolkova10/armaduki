import { create } from 'zustand';
import type { Person, Role, GKWillingness, GeneratedTeams } from '../types';

// Google Apps Script Web App URL
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function parseArrayField(value: string | undefined): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
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
}

const useAppStore = create<AppStore>()((set) => ({
  // Initial state
  people: [],
  selectedIds: new Set(),
  generatedTeams: null,
  isLoading: false,
  error: null,

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
          // Normalize keys to lowercase to handle case mismatch (e.g. "Nickname" vs "nickname")
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.toLowerCase().trim()] = row[key];
          });
          return normalizedRow;
        })
        .filter((row: any) => row.nickname && row.nickname.trim() !== '')
        .map((row: any) => ({
          id: row.id?.toString().trim() || generateId(),
          name: row.name?.toString().trim() || '',
          nickname: row.nickname?.toString().trim() || 'Unknown',
          role: validateRole(row.role),
          rating: validateRating(row.rating),
          avatar: row.avatar?.toString().trim() || '',
          gkWillingness: validateGKWillingness(row.gkwillingness), // Note lowercase
          wantsWith: parseArrayField(row.wantswith), // Note lowercase
          avoidsWith: parseArrayField(row.avoidswith), // Note lowercase
        }));

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
    // Optimistic update
    set((state) => ({ 
      people: [...state.people, person] 
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
          id: person.id,
          name: person.name,
          nickname: person.nickname,
          role: person.role,
          rating: person.rating,
          avatar: person.avatar,
          gkWillingness: person.gkWillingness,
          wantsWith: person.wantsWith.join(','),
          avoidsWith: person.avoidsWith.join(','),
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

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'update',
          id: person.id,
          name: person.name,
          nickname: person.nickname,
          role: person.role,
          rating: person.rating,
          avatar: person.avatar,
          gkWillingness: person.gkWillingness,
          wantsWith: person.wantsWith.join(','),
          avoidsWith: person.avoidsWith.join(','),
        }),
      });
    } catch (error) {
      console.error('Error updating person in sheet:', error);
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
