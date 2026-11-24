import type { Person, Role } from '../types';
// The .ts extensions let plain Node (npm test) load this file without Vite.
import { matchesWordPrefix, normalizeSearch } from './search.ts';
import { sortSelectedFirst } from './selection.ts';

export type RoleFilter = 'all' | Role;
export type ScoreFilter = 'all' | `${number}`;
export type SortMode = 'none' | 'selected' | 'score' | 'position';
export type SortDirection = 'desc' | 'asc';

/** Search, filters and sort of a player list. Players and Match each keep their own copy. */
export interface ListingControls {
    query: string;
    role: RoleFilter;
    score: ScoreFilter;
    sort: SortMode;
    scoreDirection: SortDirection;
}

export const DEFAULT_LISTING_CONTROLS: ListingControls = {
    query: '',
    role: 'all',
    score: 'all',
    sort: 'none',
    scoreDirection: 'desc',
};

const ROLE_SORT_PRIORITY: Record<Role, number> = {
    GK: 0,
    FLEX: 1,
    DEF: 2,
    MID: 3,
    ATT: 4,
};

/**
 * Privacy mode hides ratings, so it turns off the score filter and the score sort.
 * The chosen values are only ignored, not lost: they come back when privacy mode is off.
 */
export function applyPrivacyMode(controls: ListingControls, privacyMode: boolean): ListingControls {
    if (!privacyMode) return controls;

    return {
        ...controls,
        score: 'all',
        sort: controls.sort === 'score' ? 'none' : controls.sort,
        scoreDirection: 'desc',
    };
}

/** True when search or a filter hides players (sorting never hides anyone). */
export function hasActiveFilters(controls: ListingControls): boolean {
    return Boolean(normalizeSearch(controls.query)) || controls.role !== 'all' || controls.score !== 'all';
}

/** Players that pass the search and filters, in the chosen order. Never changes the input list. */
export function filterAndSortPeople<T extends Person>(
    people: readonly T[],
    controls: ListingControls,
    selectedIds: ReadonlySet<string>,
): T[] {
    const query = normalizeSearch(controls.query);
    const targetScore = controls.score === 'all' ? null : Number(controls.score);

    const filtered = people.filter(
        (person) =>
            (!query ||
                matchesWordPrefix(person.nickname || '', query) ||
                matchesWordPrefix(person.name || '', query)) &&
            (controls.role === 'all' || person.role === controls.role) &&
            (targetScore === null || person.rating === targetScore),
    );

    switch (controls.sort) {
        case 'selected':
            return sortSelectedFirst(filtered, selectedIds);
        case 'score':
            // Ties always go by nickname A-Z, in both directions.
            return filtered.sort((a, b) =>
                (controls.scoreDirection === 'desc' ? b.rating - a.rating : a.rating - b.rating) ||
                a.nickname.localeCompare(b.nickname),
            );
        case 'position':
            return filtered.sort(
                (a, b) =>
                    ROLE_SORT_PRIORITY[a.role] - ROLE_SORT_PRIORITY[b.role] || a.nickname.localeCompare(b.nickname),
            );
        default:
            return filtered;
    }
}

/** The sort in use, and the one to give back when the selection empties (null: nothing to give back). */
export interface SortMemory {
    sort: SortMode;
    restore: SortMode | null;
}

/**
 * The picks go to the top by themselves: each time the selection reaches a full match, the sort
 * switches to 'selected' and remembers the one it replaced. It stays while the picks change, and
 * the remembered sort comes back when the selection empties, unless the sort was changed by hand
 * in between (the caller forgets `restore` then).
 */
export function sortAfterSelectionChange(
    previousCount: number,
    count: number,
    matchSize: number,
    { sort, restore }: SortMemory,
): SortMemory {
    if (previousCount < matchSize && count >= matchSize) {
        return sort === 'selected' ? { sort, restore } : { sort: 'selected', restore: sort };
    }

    if (count === 0 && previousCount > 0) {
        return { sort: restore !== null && sort === 'selected' ? restore : sort, restore: null };
    }

    return { sort, restore };
}
