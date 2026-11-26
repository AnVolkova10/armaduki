import type { Person, Role } from '../types';
// The .ts extensions let plain Node (npm test) load this file without Vite.
import { mainTeamId } from './mainTeam.ts';
import { matchesWordPrefix, normalizeSearch } from './search.ts';
import { sortSelectedFirst } from './selection.ts';

/** A role, or 'inactive': the only way to see the players switched off (Sprint 6). */
export type RoleFilter = 'all' | Role | 'inactive';
export type ScoreFilter = 'all' | `${number}`;
/**
 * A team or group from the Teams or Groups tab ("id:" and its id), or 'none': the players
 * without one, to see who is left to load (Sprint 7). The prefix keeps an id like "all" apart.
 */
export type CatalogFilter = 'all' | 'none' | `id:${string}`;
export type SortMode = 'none' | 'selected' | 'score' | 'position' | 'shirt' | 'team';
export type SortDirection = 'desc' | 'asc';

/** Search, filters and sort of the player list. */
export interface ListingControls {
    query: string;
    role: RoleFilter;
    score: ScoreFilter;
    team: CatalogFilter;
    group: CatalogFilter;
    sort: SortMode;
    scoreDirection: SortDirection;
}

export const DEFAULT_LISTING_CONTROLS: ListingControls = {
    query: '',
    role: 'all',
    score: 'all',
    team: 'all',
    group: 'all',
    sort: 'none',
    scoreDirection: 'desc',
};

/** Team and group names by id, from the Teams and Groups tabs. An empty one has no filter. */
export interface ListingCatalogs {
    teams: ReadonlyMap<string, string>;
    groups: ReadonlyMap<string, string>;
}

export const NO_CATALOGS: ListingCatalogs = { teams: new Map(), groups: new Map() };

export function catalogFilter(id: string): CatalogFilter {
    return `id:${id}`;
}

function catalogFilterId(filter: CatalogFilter): string | null {
    return filter.startsWith('id:') ? filter.slice(3) : null;
}

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

/** A team or group filter its catalog does not offer (any more) is off. */
function offeredFilter(filter: CatalogFilter, catalog: ReadonlyMap<string, string>): CatalogFilter {
    if (filter === 'all') return filter;
    if (catalog.size === 0) return 'all';
    const id = catalogFilterId(filter);
    return id === null || catalog.has(id) ? filter : 'all';
}

/**
 * Without teams there is no team filter or team sort, and without groups no group filter; a
 * team or group that left its tab stops filtering. Like privacy mode, the chosen values are only
 * ignored: they come back with the catalog.
 */
export function applyCatalogs(controls: ListingControls, catalogs: ListingCatalogs): ListingControls {
    const team = offeredFilter(controls.team, catalogs.teams);
    const group = offeredFilter(controls.group, catalogs.groups);
    const sort = controls.sort === 'team' && catalogs.teams.size === 0 ? 'none' : controls.sort;
    if (team === controls.team && group === controls.group && sort === controls.sort) return controls;
    return { ...controls, team, group, sort };
}

/** True when search or a filter hides players (sorting never hides anyone). */
export function hasActiveFilters(controls: ListingControls): boolean {
    return (
        Boolean(normalizeSearch(controls.query)) ||
        controls.role !== 'all' ||
        controls.score !== 'all' ||
        controls.team !== 'all' ||
        controls.group !== 'all'
    );
}

/** The player's teams and groups, as ids; the main team is one of the teams even if the list misses it. */
function teamIdsOf(person: Person): string[] {
    return person.primaryTeam ? [person.primaryTeam, ...person.teams] : person.teams;
}

/** 'none' is "no team (or group) the tab knows": an id left behind by a deleted one counts as none. */
function matchesCatalog(ids: readonly string[], filter: CatalogFilter, catalog: ReadonlyMap<string, string>): boolean {
    if (filter === 'all') return true;
    if (filter === 'none') return !ids.some((id) => catalog.has(id));
    return ids.includes(catalogFilterId(filter) ?? '');
}

/**
 * Shirt numbers as numbers ("007" ties with 7, and the nickname decides), then other text, and
 * nobody without one until the end.
 */
function compareShirts(a: Person, b: Person): number {
    const rank = (person: Person) => {
        const text = (person.shirtNumber ?? '').trim();
        if (!text) return { group: 2, value: 0, text: '' };
        return /^\d+$/.test(text) ? { group: 0, value: Number(text), text: '' } : { group: 1, value: 0, text };
    };
    const left = rank(a);
    const right = rank(b);
    return left.group - right.group || left.value - right.value || left.text.localeCompare(right.text);
}

/**
 * Players that pass the search and filters, in the chosen order. Never changes the input list.
 *
 * A role filter also brings whoever has that role as their second position, after the ones who
 * play it as their main one (Sprint 7); only the "selected" sort puts the picks before that.
 */
export function filterAndSortPeople<T extends Person>(
    people: readonly T[],
    controls: ListingControls,
    selectedIds: ReadonlySet<string>,
    catalogs: ListingCatalogs = NO_CATALOGS,
): T[] {
    const query = normalizeSearch(controls.query);
    const targetScore = controls.score === 'all' ? null : Number(controls.score);
    // Inactive players only show under their own filter, and then only them.
    const showInactive = controls.role === 'inactive';
    const role: Role | null = controls.role === 'all' || controls.role === 'inactive' ? null : controls.role;

    const filtered = people.filter(
        (person) =>
            (person.active === false) === showInactive &&
            (!query ||
                matchesWordPrefix(person.nickname || '', query) ||
                matchesWordPrefix(person.name || '', query)) &&
            (role === null || person.role === role || person.secondaryRole === role) &&
            (targetScore === null || person.rating === targetScore) &&
            matchesCatalog(teamIdsOf(person), controls.team, catalogs.teams) &&
            matchesCatalog(person.groups, controls.group, catalogs.groups),
    );

    // Main position first, second position after (0 when there is no role filter).
    const byRole = (a: T, b: T) => (role === null ? 0 : Number(a.role !== role) - Number(b.role !== role));
    const byNickname = (a: T, b: T) => a.nickname.localeCompare(b.nickname);

    switch (controls.sort) {
        case 'selected':
            return sortSelectedFirst(filtered.sort(byRole), selectedIds);
        case 'score':
            // Ties always go by nickname A-Z, in both directions.
            return filtered.sort((a, b) =>
                byRole(a, b) ||
                (controls.scoreDirection === 'desc' ? b.rating - a.rating : a.rating - b.rating) ||
                byNickname(a, b),
            );
        case 'position':
            return filtered.sort(
                (a, b) => byRole(a, b) || ROLE_SORT_PRIORITY[a.role] - ROLE_SORT_PRIORITY[b.role] || byNickname(a, b),
            );
        case 'shirt':
            return filtered.sort((a, b) => byRole(a, b) || compareShirts(a, b) || byNickname(a, b));
        case 'team': {
            // By the main team's name, the one in the card's corner; nobody without one until the end.
            const teamOf = (person: T) => {
                const id = mainTeamId(person, (teamId) => catalogs.teams.has(teamId));
                return id === undefined ? null : { id, name: catalogs.teams.get(id) || id };
            };
            const compareTeams = (a: T, b: T) => {
                const left = teamOf(a);
                const right = teamOf(b);
                if (!left || !right) return Number(!left) - Number(!right);
                return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
            };
            return filtered.sort((a, b) => byRole(a, b) || compareTeams(a, b) || byNickname(a, b));
        }
        default:
            return filtered.sort(byRole);
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
