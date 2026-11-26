import type { LinkHistoryEntry, Person } from '../types';
// The .ts extension lets plain Node (npm test) load this file without Vite.
import { matchesWordPrefix, normalizeSearch } from './search.ts';

// The wants and avoids history (Sprint 8): the RelationshipHistory tab counts how many times each
// player marked each other one. The player form uses it to put "the usual ones" first.

export type LinkKind = 'wants' | 'avoids';

const FIELD: Record<LinkKind, 'wantsWith' | 'avoidsWith'> = { wants: 'wantsWith', avoids: 'avoidsWith' };

function toCount(value: unknown): number {
    const count = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
    return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

function toId(value: unknown): string {
    return value === undefined || value === null ? '' : String(value).trim();
}

/** The history as the backend sends it. Rows without both ids, or with nothing counted, are skipped. */
export function parseLinkHistory(raw: unknown): LinkHistoryEntry[] {
    if (!Array.isArray(raw)) throw new Error('Incorrect relationship history format: not an array');
    const history: LinkHistoryEntry[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const record = row as Record<string, unknown>;
        const sourceId = toId(record.sourceId);
        const targetId = toId(record.targetId);
        const wantsCount = toCount(record.wantsCount);
        const avoidsCount = toCount(record.avoidsCount);
        if (!sourceId || !targetId || sourceId === targetId || wantsCount + avoidsCount === 0) continue;
        history.push({ sourceId, targetId, wantsCount, avoidsCount });
    }
    return history;
}

/** How often two players were linked, and how often each one was in a link of that kind. */
export interface LinkScores {
    /** Both directions add up: A marking B counts in A's list and in B's (Ángela, 25/11). */
    pair(a: string, b: string): number;
    /** Every link of that kind the player was in, on either side. */
    popularity(id: string): number;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}\n${b}` : `${b}\n${a}`);

export function linkScores(history: readonly LinkHistoryEntry[] | null, kind: LinkKind): LinkScores {
    const pairs = new Map<string, number>();
    const players = new Map<string, number>();
    for (const entry of history ?? []) {
        const count = kind === 'wants' ? entry.wantsCount : entry.avoidsCount;
        if (count <= 0 || entry.sourceId === entry.targetId) continue;
        const key = pairKey(entry.sourceId, entry.targetId);
        pairs.set(key, (pairs.get(key) ?? 0) + count);
        players.set(entry.sourceId, (players.get(entry.sourceId) ?? 0) + count);
        players.set(entry.targetId, (players.get(entry.targetId) ?? 0) + count);
    }
    return {
        pair: (a, b) => pairs.get(pairKey(a, b)) ?? 0,
        popularity: (id) => players.get(id) ?? 0,
    };
}

type LinkCandidate = Pick<Person, 'id' | 'nickname' | 'wantsWith' | 'avoidsWith'>;

/**
 * The order of a Wants or Avoids list when the form opens (Sprint 8):
 * 1. who this player already marked;
 * 2. who marks this player now (opening B, A is near the top if A wants B);
 * 3. the usual ones: the pair's history, both directions;
 * 4. who was in the most links of that kind;
 * 5. the rest, by nickname.
 * `ownerId` is empty for somebody new. Never changes the input list.
 */
export function orderLinkCandidates<T extends LinkCandidate>(
    candidates: readonly T[],
    ownerId: string,
    marked: ReadonlySet<string>,
    kind: LinkKind,
    scores: LinkScores,
): T[] {
    const field = FIELD[kind];
    const marksOwner = (person: T) => Boolean(ownerId) && person[field].includes(ownerId);
    const pair = (person: T) => (ownerId ? scores.pair(ownerId, person.id) : 0);
    return [...candidates].sort(
        (a, b) =>
            Number(marked.has(b.id)) - Number(marked.has(a.id)) ||
            Number(marksOwner(b)) - Number(marksOwner(a)) ||
            pair(b) - pair(a) ||
            scores.popularity(b.id) - scores.popularity(a.id) ||
            a.nickname.localeCompare(b.nickname),
    );
}

/** The players a search in the form's lists keeps: nickname or name, by word, without accents. */
export function matchesLinkSearch(person: Pick<Person, 'nickname' | 'name'>, query: string): boolean {
    const normalized = normalizeSearch(query);
    return !normalized || matchesWordPrefix(person.nickname || '', normalized) || matchesWordPrefix(person.name || '', normalized);
}

interface Links {
    wantsWith: readonly string[];
    avoidsWith: readonly string[];
}

/**
 * The history after a save, counted as the backend does: 1 more for each want or avoid the player
 * did not have before (`before` is undefined for somebody new), never for themselves. The app keeps
 * its copy up to date with it until the next read.
 */
export function recordNewLinks(
    history: readonly LinkHistoryEntry[],
    sourceId: string,
    before: Links | undefined,
    after: Links,
): LinkHistoryEntry[] {
    const added = (kind: LinkKind) => {
        const field = FIELD[kind];
        const previous = new Set(before?.[field] ?? []);
        return [...new Set(after[field])].filter((id) => id && id !== sourceId && !previous.has(id));
    };
    const newWants = added('wants');
    const newAvoids = added('avoids');
    if (newWants.length === 0 && newAvoids.length === 0) return [...history];

    const next = history.map((entry) => ({ ...entry }));
    const bump = (targetId: string, kind: LinkKind) => {
        const entry = next.find((existing) => existing.sourceId === sourceId && existing.targetId === targetId);
        const countKey = kind === 'wants' ? 'wantsCount' : 'avoidsCount';
        if (entry) entry[countKey] += 1;
        else next.push({ sourceId, targetId, wantsCount: kind === 'wants' ? 1 : 0, avoidsCount: kind === 'avoids' ? 1 : 0 });
    };
    newWants.forEach((id) => bump(id, 'wants'));
    newAvoids.forEach((id) => bump(id, 'avoids'));
    return next;
}
