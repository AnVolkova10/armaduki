// What this device keeps between visits: the access key, once the backend accepted it, and a
// copy of the last read so the app opens at once. Both go away when the backend refuses the key.
// Storage can be missing or full (private windows, old browsers): then nothing is kept.

const ACCESS_KEY_STORAGE = 'armaduki-access-key';
const LAST_READ_STORAGE = 'armaduki-last-read-v1';

/** The rows exactly as the backend sent them, so the usual parsers read them again. */
export interface SavedRead {
  players: unknown[];
  teams: unknown[];
  /** Only from a backend that knows groups (Sprint 6 on). */
  groups?: unknown[];
}

export function readAccessKey(): string {
  try {
    return localStorage.getItem(ACCESS_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

/** An empty key forgets it. */
export function saveAccessKey(key: string): void {
  try {
    if (key) localStorage.setItem(ACCESS_KEY_STORAGE, key);
    else localStorage.removeItem(ACCESS_KEY_STORAGE);
  } catch {
    /* storage unavailable */
  }
}

export function readSavedRead(): SavedRead | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LAST_READ_STORAGE) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const { players, teams, groups } = parsed as Partial<SavedRead>;
    if (!Array.isArray(players) || players.length === 0) return null;
    return { players, teams: Array.isArray(teams) ? teams : [], ...(Array.isArray(groups) ? { groups } : {}) };
  } catch {
    return null;
  }
}

export function saveRead(read: SavedRead): void {
  try {
    localStorage.setItem(LAST_READ_STORAGE, JSON.stringify(read));
  } catch {
    /* storage full or unavailable: the app just opens with a normal read next time */
  }
}

export function clearSavedRead(): void {
  try {
    localStorage.removeItem(LAST_READ_STORAGE);
  } catch {
    /* storage unavailable */
  }
}

const LANGUAGE_STORAGE = 'armaduki-lang';

/** The language picked on this device; empty when it never picked one. It outlives the key. */
export function readLanguage(): string {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveLanguage(lang: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE, lang);
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
}
