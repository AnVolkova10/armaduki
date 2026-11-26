// Matches as they were played (Sprint 9): building one by hand or from the app's teams, the
// keepers, the result and its counters, and what goes to the sheet and comes back. Plain
// TypeScript, so `npm test` loads it in Node.
import { analyzeSplit } from '../services/teamGenerator.ts';
import type {
  GenerationStage,
  Match,
  MatchOrigin,
  MatchPlayer,
  MatchSide,
  MatchSnapshot,
  Person,
  SplitAnalysis,
} from '../types/index.ts';
import {
  DEFAULT_ATTRIBUTES,
  parseAttributes,
  validateGKWillingness,
  validateRating,
  validateRole,
  validateSecondaryRole,
} from './playerFields.ts';

export const SIDES: readonly MatchSide[] = [1, 2];
const MAX_GOALS = 99;

export function otherSide(side: MatchSide): MatchSide {
  return side === 1 ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Days. Always this device's own day: after 21:00 in Buenos Aires, UTC is already tomorrow, and
// `new Date('2026-10-13')` is the evening before there.
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** Today (or `now`) as yyyy-MM-dd on this device's clock. */
export function localDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A yyyy-MM-dd day as this device's midnight, or null when it is not a real day. */
export function parseDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!match) return null;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(year, month - 1, date);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === date ? parsed : null;
}

/** "Tue 24/11", with the year when it is not this one: "Mon 24/11/2025". */
export function formatDay(day: string, weekdays: readonly string[], now: Date = new Date()): string {
  const date = parseDay(day);
  if (!date) return day;
  const year = date.getFullYear() === now.getFullYear() ? '' : `/${date.getFullYear()}`;
  return `${weekdays[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}${year}`;
}

/** A new match id: the day and four characters ("m20261124-k3f9"), so it reads in the sheet. */
export function newMatchId(day: string, random: () => number = Math.random): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let index = 0; index < 4; index++) suffix += chars[Math.floor(random() * chars.length)];
  return `m${day.replace(/-/g, '')}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Players in a match
// ---------------------------------------------------------------------------

/** How a player is now, kept with the match. The links are trimmed to the match when it is saved. */
export function snapshotOf(person: Person): MatchSnapshot {
  return {
    role: person.role,
    secondaryRole: person.secondaryRole,
    rating: person.rating,
    attributes: { ...(person.attributes ?? DEFAULT_ATTRIBUTES) },
    gkWillingness: person.gkWillingness,
    wantsWith: [...person.wantsWith],
    avoidsWith: [...person.avoidsWith],
  };
}

export function matchPlayerOf(person: Person, team: MatchSide): MatchPlayer {
  return { playerId: person.id, nickname: person.nickname, team, goals: 0, conceded: 0, errors: 0, snapshot: snapshotOf(person) };
}

/** A player of a match as the analysis needs them: as they were that day. */
export function personOf(player: MatchPlayer): Person {
  return {
    id: player.playerId,
    name: '',
    nickname: player.nickname,
    role: player.snapshot.role,
    secondaryRole: player.snapshot.secondaryRole,
    rating: player.snapshot.rating,
    attributes: player.snapshot.attributes,
    gkWillingness: player.snapshot.gkWillingness,
    wantsWith: player.snapshot.wantsWith,
    avoidsWith: player.snapshot.avoidsWith,
    teams: [],
    groups: [],
    availability: [],
  };
}

export function playersOn(players: readonly MatchPlayer[], side: MatchSide): MatchPlayer[] {
  return players.filter((player) => player.team === side);
}

// ---------------------------------------------------------------------------
// The match being built or edited
// ---------------------------------------------------------------------------

/**
 * Who keeps goal on a side. `auto` follows Ángela's rule (26/11): keepers are fixed, and when a
 * side has no GK, they rotate. A pick by hand (a player, or rotating) wins over the rule.
 */
export type KeeperChoice = { kind: 'auto' } | { kind: 'player'; playerId: string } | { kind: 'rotate' };

/** The app's split a match started from, to tell later whether it was changed. */
export interface AppSplit {
  team1Ids: string[];
  team2Ids: string[];
  stage: GenerationStage;
}

export interface MatchDraft {
  matchId: string;
  createdAt: string;
  date: string;
  groupId: string;
  place: string;
  /** As typed: '' is no result yet. */
  team1Goals: string;
  team2Goals: string;
  keepers: Record<MatchSide, KeeperChoice>;
  players: MatchPlayer[];
  /** Built by hand, or the app's split (then `appSplit` says which one). */
  origin: MatchOrigin;
  appSplit: AppSplit | null;
}

/** A new match: empty, or with the app's two teams (from the result). */
export function newDraft({
  matchId,
  createdAt,
  date,
  fromApp,
}: {
  matchId: string;
  createdAt: string;
  date: string;
  fromApp?: { team1: readonly Person[]; team2: readonly Person[]; stage: GenerationStage };
}): MatchDraft {
  return {
    matchId,
    createdAt,
    date,
    groupId: '',
    place: '',
    team1Goals: '',
    team2Goals: '',
    keepers: { 1: { kind: 'auto' }, 2: { kind: 'auto' } },
    players: fromApp
      ? [...fromApp.team1.map((person) => matchPlayerOf(person, 1)), ...fromApp.team2.map((person) => matchPlayerOf(person, 2))]
      : [],
    origin: fromApp ? 'app' : 'manual',
    appSplit: fromApp
      ? { team1Ids: fromApp.team1.map((person) => person.id), team2Ids: fromApp.team2.map((person) => person.id), stage: fromApp.stage }
      : null,
  };
}

/** A saved match, to edit it. Its keepers stay as they were saved. */
export function draftOf(match: Match): MatchDraft {
  const keeper = (keeperId: string): KeeperChoice => (keeperId ? { kind: 'player', playerId: keeperId } : { kind: 'rotate' });
  return {
    matchId: match.matchId,
    createdAt: match.createdAt,
    date: match.date,
    groupId: match.groupId,
    place: match.place,
    team1Goals: match.team1Goals === null ? '' : String(match.team1Goals),
    team2Goals: match.team2Goals === null ? '' : String(match.team2Goals),
    keepers: { 1: keeper(match.team1KeeperId), 2: keeper(match.team2KeeperId) },
    players: match.players.map((player) => ({ ...player, snapshot: { ...player.snapshot } })),
    origin: match.origin,
    appSplit:
      match.origin === 'app' && (match.stage === 'STRICT' || match.stage === 'FALLBACK')
        ? {
            team1Ids: playersOn(match.players, 1).map((player) => player.playerId),
            team2Ids: playersOn(match.players, 2).map((player) => player.playerId),
            stage: match.stage,
          }
        : null,
  };
}

/** The one GK (main position) of a side, or '' when it has none or more than one. */
export function ruleKeeperId(sidePlayers: readonly MatchPlayer[]): string {
  const keepers = sidePlayers.filter((player) => player.snapshot.role === 'GK');
  return keepers.length === 1 ? keepers[0].playerId : '';
}

/** The fixed keeper a choice means for this side: '' when they rotate. */
export function keeperIdOf(choice: KeeperChoice, sidePlayers: readonly MatchPlayer[]): string {
  if (choice.kind === 'rotate') return '';
  if (choice.kind === 'player' && sidePlayers.some((player) => player.playerId === choice.playerId)) return choice.playerId;
  return ruleKeeperId(sidePlayers);
}

export function addPlayer(draft: MatchDraft, person: Person, side: MatchSide): MatchDraft {
  if (draft.players.some((player) => player.playerId === person.id)) return draft;
  return { ...draft, players: [...draft.players, matchPlayerOf(person, side)] };
}

/** One tap: to the other side, with their counters. */
export function movePlayer(draft: MatchDraft, playerId: string): MatchDraft {
  return {
    ...draft,
    players: draft.players.map((player) => (player.playerId === playerId ? { ...player, team: otherSide(player.team) } : player)),
  };
}

export function removePlayer(draft: MatchDraft, playerId: string): MatchDraft {
  return { ...draft, players: draft.players.filter((player) => player.playerId !== playerId) };
}

export type Counter = 'goals' | 'conceded' | 'errors';

export function setCounter(draft: MatchDraft, playerId: string, counter: Counter, value: number): MatchDraft {
  const next = Math.max(0, Math.min(MAX_GOALS, Math.trunc(value)));
  return {
    ...draft,
    players: draft.players.map((player) => (player.playerId === playerId ? { ...player, [counter]: next } : player)),
  };
}

/** What was typed in a result box: digits only, up to 99; '' stays ''. */
export function cleanGoalsInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 2);
  return digits === '' ? '' : String(Math.min(MAX_GOALS, Number(digits)));
}

/** The result: both null while nothing is typed; a box left empty next to a typed one is 0. */
export function resultOf(draft: Pick<MatchDraft, 'team1Goals' | 'team2Goals'>): Record<MatchSide, number | null> {
  if (draft.team1Goals.trim() === '' && draft.team2Goals.trim() === '') return { 1: null, 2: null };
  const goals = (text: string) => Math.min(MAX_GOALS, Number(text.trim() || '0') || 0);
  return { 1: goals(draft.team1Goals), 2: goals(draft.team2Goals) };
}

export function hasResult(draft: Pick<MatchDraft, 'team1Goals' | 'team2Goals'>): boolean {
  return resultOf(draft)[1] !== null;
}

/** The analysis of the two sides as they are now, with each player as they were that day. */
export function analyzeDraft(players: readonly MatchPlayer[]): SplitAnalysis | null {
  return analyzeSplit(playersOn(players, 1).map(personOf), playersOn(players, 2).map(personOf));
}

function sameIds(players: readonly MatchPlayer[], ids: readonly string[]): boolean {
  const set = new Set(ids);
  return players.length === set.size && players.every((player) => set.has(player.playerId));
}

/** Where the teams came from: the app's split as it was, changed, or built by hand. */
export function originOf(draft: Pick<MatchDraft, 'players' | 'origin' | 'appSplit'>): { origin: MatchOrigin; stage: GenerationStage | '' } {
  const { appSplit } = draft;
  if (appSplit && sameIds(playersOn(draft.players, 1), appSplit.team1Ids) && sameIds(playersOn(draft.players, 2), appSplit.team2Ids)) {
    return { origin: 'app', stage: appSplit.stage };
  }
  return { origin: appSplit || draft.origin !== 'manual' ? 'edited' : 'manual', stage: '' };
}

/**
 * The match to save. The goals a side let in are worked out again every time: with a fixed keeper
 * the keeper gets the other side's goals and the rest of the side 0; when a side rotates, each
 * one keeps their own count. Links are trimmed to the players of the match.
 */
export function buildMatch(draft: MatchDraft, now: Date = new Date()): Match {
  const result = resultOf(draft);
  const keeperIds = {
    1: keeperIdOf(draft.keepers[1], playersOn(draft.players, 1)),
    2: keeperIdOf(draft.keepers[2], playersOn(draft.players, 2)),
  } as Record<MatchSide, string>;
  const inMatch = new Set(draft.players.map((player) => player.playerId));
  const players = draft.players.map((player): MatchPlayer => {
    const keeperId = keeperIds[player.team];
    const conceded = keeperId ? (player.playerId === keeperId ? (result[otherSide(player.team)] ?? 0) : 0) : player.conceded;
    return {
      ...player,
      conceded,
      snapshot: {
        ...player.snapshot,
        wantsWith: player.snapshot.wantsWith.filter((id) => id !== player.playerId && inMatch.has(id)),
        avoidsWith: player.snapshot.avoidsWith.filter((id) => id !== player.playerId && inMatch.has(id)),
      },
    };
  });
  const analysis = analyzeDraft(players);
  const { origin, stage } = originOf(draft);
  return {
    matchId: draft.matchId,
    createdAt: draft.createdAt,
    updatedAt: now.toISOString(),
    date: draft.date,
    groupId: draft.groupId,
    place: draft.place.trim(),
    team1Goals: result[1],
    team2Goals: result[2],
    team1KeeperId: keeperIds[1],
    team2KeeperId: keeperIds[2],
    origin,
    stage,
    score: analysis ? analysis.score : null,
    socialSatisfactionPct: analysis ? analysis.socialSatisfactionPct : null,
    players,
  };
}

/** Goals with a name on one side, against the side's result (the hint under each team). */
export function scorerGap(draft: MatchDraft, side: MatchSide): { named: number; total: number } | null {
  const total = resultOf(draft)[side];
  if (total === null) return null;
  return { named: playersOn(draft.players, side).reduce((sum, player) => sum + player.goals, 0), total };
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

/** Newest first: by the day played, then by when it was saved. */
export function sortMatches(matches: readonly Match[]): Match[] {
  return [...matches].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || a.matchId.localeCompare(b.matchId),
  );
}

export type Outcome =
  | { kind: 'none' }
  | { kind: 'draw'; goals: number }
  | { kind: 'won'; side: MatchSide; winner: number; loser: number };

export function outcomeOf(match: Pick<Match, 'team1Goals' | 'team2Goals'>): Outcome {
  const { team1Goals, team2Goals } = match;
  if (team1Goals === null || team2Goals === null) return { kind: 'none' };
  if (team1Goals === team2Goals) return { kind: 'draw', goals: team1Goals };
  return team1Goals > team2Goals
    ? { kind: 'won', side: 1, winner: team1Goals, loser: team2Goals }
    : { kind: 'won', side: 2, winner: team2Goals, loser: team1Goals };
}

// ---------------------------------------------------------------------------
// To and from the backend (see apps-script/README.md, MatchHistory and MatchPlayers)
// ---------------------------------------------------------------------------

/** The body of `saveMatch`: the match with each player's picture of the day spelled out. */
export function serializeMatch(match: Match): Record<string, unknown> {
  const { players, ...fields } = match;
  return {
    ...fields,
    players: players.map(({ snapshot, ...player }) => ({
      ...player,
      role: snapshot.role,
      secondaryRole: snapshot.secondaryRole ?? '',
      rating: snapshot.rating,
      attributes: JSON.stringify(snapshot.attributes),
      gkWillingness: snapshot.gkWillingness,
      wantsWith: snapshot.wantsWith.join('|'),
      avoidsWith: snapshot.avoidsWith.join('|'),
    })),
  };
}

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function count(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(MAX_GOALS, Math.floor(number)) : 0;
}

function goalsOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(MAX_GOALS, Math.floor(number)) : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function idList(value: unknown): string[] {
  return [...new Set(text(value).split('|').map((id) => id.trim()).filter(Boolean))];
}

function parseMatchPlayer(raw: unknown): MatchPlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const playerId = text(row.playerId);
  if (!playerId) return null;
  const role = validateRole(row.role);
  const secondaryRole = validateSecondaryRole(row.secondaryRole, role);
  return {
    playerId,
    nickname: text(row.nickname) || playerId,
    team: Number(row.team) === 2 ? 2 : 1,
    goals: count(row.goals),
    conceded: count(row.conceded),
    errors: count(row.errors),
    snapshot: {
      role,
      secondaryRole,
      rating: validateRating(row.rating),
      attributes: parseAttributes(row.attributes),
      gkWillingness: secondaryRole === 'GK' ? 'good' : validateGKWillingness(row.gkWillingness),
      wantsWith: idList(row.wantsWith).filter((id) => id !== playerId),
      avoidsWith: idList(row.avoidsWith).filter((id) => id !== playerId),
    },
  };
}

const ORIGINS: readonly MatchOrigin[] = ['app', 'edited', 'manual'];

function parseMatch(raw: unknown): Match | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const matchId = text(row.matchId);
  if (!matchId) return null;
  const seen = new Set<string>();
  const players = (Array.isArray(row.players) ? row.players : [])
    .map(parseMatchPlayer)
    .filter((player): player is MatchPlayer => {
      if (!player || seen.has(player.playerId)) return false;
      seen.add(player.playerId);
      return true;
    });
  const origin = ORIGINS.find((value) => value === text(row.origin)) ?? 'manual';
  const stage = text(row.stage);
  // Half a result typed by hand in the sheet: the empty side is 0, as in the app.
  const typed1 = goalsOrNull(row.team1Goals);
  const typed2 = goalsOrNull(row.team2Goals);
  const noResult = typed1 === null && typed2 === null;
  const team1Goals = noResult ? null : (typed1 ?? 0);
  const team2Goals = noResult ? null : (typed2 ?? 0);
  return {
    matchId,
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
    date: text(row.date),
    groupId: text(row.groupId),
    place: text(row.place),
    team1Goals,
    team2Goals,
    team1KeeperId: text(row.team1KeeperId),
    team2KeeperId: text(row.team2KeeperId),
    origin,
    stage: origin === 'app' && (stage === 'STRICT' || stage === 'FALLBACK') ? stage : '',
    score: numberOrNull(row.score),
    socialSatisfactionPct: numberOrNull(row.socialSatisfactionPct),
    players,
  };
}

/** The answer of `readMatches`. Throws when it is not one; rows that make no sense are skipped. */
export function parseMatches(raw: unknown): Match[] {
  const list = raw && typeof raw === 'object' ? (raw as { matches?: unknown }).matches : undefined;
  if (!Array.isArray(list)) {
    const error = raw && typeof raw === 'object' && 'error' in raw ? String((raw as { error: unknown }).error) : 'no matches';
    throw new Error(`Incorrect matches format: ${error}`);
  }
  const seen = new Set<string>();
  return list.map(parseMatch).filter((match): match is Match => {
    if (!match || seen.has(match.matchId)) return false;
    seen.add(match.matchId);
    return true;
  });
}
