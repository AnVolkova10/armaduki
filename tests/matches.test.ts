// The matches of Sprint 9 without the UI: days, keepers, the goals each side let in, where the
// teams came from, and the way to and from the sheet. Ángela's clock is Buenos Aires: after 21:00
// the UTC day is already tomorrow, so the days are tested there.
process.env.TZ = 'America/Argentina/Buenos_Aires';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Match, Person } from '../src/types/index.ts';
import {
  addPlayer,
  buildMatch,
  cleanGoalsInput,
  draftOf,
  formatDay,
  keeperIdOf,
  localDay,
  movePlayer,
  newDraft,
  newMatchId,
  outcomeOf,
  parseDay,
  parseMatches,
  playersOn,
  removePlayer,
  resultOf,
  scorerGap,
  serializeMatch,
  setCounter,
  snapshotOf,
  sortMatches,
  type MatchDraft,
} from '../src/utils/matches.ts';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const NOW = new Date(2026, 10, 26, 18, 0);

function person(id: number, nickname: string, overrides: Partial<Person> = {}): Person {
  return {
    id: String(id),
    name: '',
    nickname,
    role: 'MID',
    rating: 5,
    gkWillingness: 'low',
    wantsWith: [],
    avoidsWith: [],
    attributes: { shooting: 'mid', control: 'mid', passing: 'mid', defense: 'mid', pace: 'mid', vision: 'mid', grit: 'mid', stamina: 'mid' },
    teams: [],
    groups: [],
    availability: [],
    ...overrides,
  };
}

// ROJO: Ana (GK), Bea, Caro, Dani, Eli. NEGRO: Fio, Gabi, Hana, Isa, Juli, with no GK.
const rojo = [
  person(1, 'Ana', { role: 'GK', gkWillingness: 'good' }),
  person(2, 'Bea', { wantsWith: ['3', '40'] }),
  person(3, 'Caro', { avoidsWith: ['6'] }),
  person(4, 'Dani', { role: 'DEF' }),
  person(5, 'Eli', { role: 'ATT', rating: 7 }),
];
const negro = [
  person(6, 'Fio', { gkWillingness: 'good' }),
  person(7, 'Gabi', { role: 'DEF' }),
  person(8, 'Hana'),
  person(9, 'Isa', { role: 'ATT' }),
  person(10, 'Juli', { rating: 4 }),
];
const fromApp = () =>
  newDraft({ matchId: 'm1', createdAt: '2026-10-13T22:00:00.000Z', date: '2026-10-13', fromApp: { team1: rojo, team2: negro, stage: 'STRICT' } });
const byNick = (draft: MatchDraft, nickname: string) => draft.players.find((player) => player.nickname === nickname)!;
const withResult = (draft: MatchDraft, team1Goals: string, team2Goals: string): MatchDraft => ({ ...draft, team1Goals, team2Goals });

test('the day is this device\'s day: 22:30 in Buenos Aires is still the 13th, though UTC is on the 14th', () => {
  const lateEvening = new Date(Date.UTC(2026, 9, 14, 1, 30));
  assert.equal(lateEvening.toISOString().slice(0, 10), '2026-10-14');
  assert.equal(localDay(lateEvening), '2026-10-13');
  assert.equal(formatDay('2026-10-13', WEEKDAYS, NOW), 'Tue 13/10', 'and the 13th is a Tuesday here');
  assert.equal(new Date('2026-10-13').getDay(), 1, 'the trap: parsed as UTC, it is Monday evening here');
});

test('days: real ones only; the year shows when it is not this one', () => {
  assert.equal(parseDay('2026-02-30'), null);
  assert.equal(parseDay('24/11/2026'), null);
  assert.equal(parseDay(''), null);
  assert.equal(parseDay('2026-11-03')?.getDate(), 3);
  assert.equal(formatDay('2025-11-24', WEEKDAYS, NOW), 'Mon 24/11/2025');
  assert.equal(formatDay('2026-11-03', WEEKDAYS, NOW), 'Tue 3/11');
  assert.equal(formatDay('soon', WEEKDAYS, NOW), 'soon', 'anything else shows as it is');
});

test('a new match id carries the day and reads well in the sheet', () => {
  let call = 0;
  const id = newMatchId('2026-10-13', () => [0, 0.5, 0.99, 0.25][call++]);
  assert.match(id, /^m20261013-[a-z2-9]{4}$/);
  assert.equal(id, 'm20261013-as9i');
});

test('keepers follow the rule until one is picked: one GK keeps goal; none, or two, they rotate', () => {
  const draft = fromApp();
  assert.equal(keeperIdOf(draft.keepers[1], playersOn(draft.players, 1)), '1', 'ROJO has its GK');
  assert.equal(keeperIdOf(draft.keepers[2], playersOn(draft.players, 2)), '', 'NEGRO has no GK: they rotate');

  const twoKeepers = addPlayer(removePlayer(draft, '2'), person(11, 'Kari', { role: 'GK' }), 1);
  assert.equal(keeperIdOf(twoKeepers.keepers[1], playersOn(twoKeepers.players, 1)), '', 'two GK: nobody is guessed');

  assert.equal(keeperIdOf({ kind: 'player', playerId: '6' }, playersOn(draft.players, 2)), '6', 'picked by hand');
  assert.equal(keeperIdOf({ kind: 'rotate' }, playersOn(draft.players, 1)), '', 'rotating, by hand, even with a GK');
  const moved = movePlayer(draft, '6');
  assert.equal(keeperIdOf({ kind: 'player', playerId: '6' }, playersOn(moved.players, 2)), '', 'the pick moved away: back to the rule');
});

test('the goals a side let in: a fixed keeper gets the other side\'s goals, the rest of that side 0', () => {
  let draft = withResult(fromApp(), '5', '3');
  draft = setCounter(draft, '2', 'conceded', 3); // a stray count on ROJO, which has a fixed keeper
  draft = setCounter(draft, '6', 'conceded', 5);
  draft = setCounter(draft, '7', 'conceded', 2);

  const match = buildMatch(draft, NOW);

  assert.deepEqual(
    match.players.map((player) => [player.nickname, player.conceded]),
    [['Ana', 3], ['Bea', 0], ['Caro', 0], ['Dani', 0], ['Eli', 0], ['Fio', 5], ['Gabi', 2], ['Hana', 0], ['Isa', 0], ['Juli', 0]],
    'NEGRO rotated: each keeps their own count',
  );
  assert.deepEqual([match.team1KeeperId, match.team2KeeperId], ['1', '']);
  assert.deepEqual([match.team1Goals, match.team2Goals], [5, 3]);
});

test('switching a side from fixed to rotating and back recomputes the goals let in each time', () => {
  let draft = withResult(fromApp(), '5', '3');
  draft = { ...draft, keepers: { ...draft.keepers, 1: { kind: 'rotate' } } };
  draft = setCounter(setCounter(draft, '1', 'conceded', 1), '2', 'conceded', 3);
  assert.deepEqual(playersOn(buildMatch(draft, NOW).players, 1).map((player) => player.conceded), [1, 3, 0, 0, 0]);

  draft = { ...draft, keepers: { ...draft.keepers, 1: { kind: 'player', playerId: '3' } } };
  const fixedAgain = buildMatch(draft, NOW);
  assert.deepEqual(playersOn(fixedAgain.players, 1).map((player) => player.conceded), [0, 0, 3, 0, 0], 'Caro kept goal');
  assert.equal(fixedAgain.team1KeeperId, '3');

  const noResult = buildMatch(withResult(draft, '', ''), NOW);
  assert.deepEqual(playersOn(noResult.players, 1).map((player) => player.conceded), [0, 0, 0, 0, 0]);
  assert.deepEqual([noResult.team1Goals, noResult.team2Goals], [null, null]);
});

test('the result: nothing typed is no result, one box typed makes the other 0, and a 0-0 stays', () => {
  assert.deepEqual(resultOf({ team1Goals: '', team2Goals: '' }), { 1: null, 2: null });
  assert.deepEqual(resultOf({ team1Goals: '3', team2Goals: '' }), { 1: 3, 2: 0 });
  assert.deepEqual(resultOf({ team1Goals: '0', team2Goals: '0' }), { 1: 0, 2: 0 });
  assert.equal(cleanGoalsInput('7a'), '7');
  assert.equal(cleanGoalsInput('05'), '5');
  assert.equal(cleanGoalsInput('123'), '12');
  assert.equal(cleanGoalsInput(''), '');
});

test('where the teams came from: the app\'s split, changed, back as it was, or built by hand', () => {
  const draft = fromApp();
  assert.deepEqual([buildMatch(draft, NOW).origin, buildMatch(draft, NOW).stage], ['app', 'STRICT']);

  const changed = movePlayer(draft, '5');
  assert.deepEqual([buildMatch(changed, NOW).origin, buildMatch(changed, NOW).stage], ['edited', '']);
  assert.equal(buildMatch(movePlayer(changed, '5'), NOW).origin, 'app', 'moved back: the app\'s split again');

  const manual = newDraft({ matchId: 'm2', createdAt: '', date: '2026-10-13' });
  assert.equal(buildMatch(addPlayer(manual, rojo[0], 1), NOW).origin, 'manual');

  const savedApp = buildMatch(draft, NOW);
  assert.equal(buildMatch(draftOf(savedApp), NOW).origin, 'app', 'a saved app match opened and saved again');
  const savedEdited = buildMatch(changed, NOW);
  assert.equal(buildMatch(movePlayer(draftOf(savedEdited), '5'), NOW).origin, 'edited', 'once edited, always edited');
});

test('a saved match keeps each player as they were, with only the links inside the match', () => {
  const match = buildMatch(withResult(fromApp(), '2', '2'), NOW);

  assert.deepEqual(match.players.find((player) => player.playerId === '2')!.snapshot.wantsWith, ['3'], '40 did not play');
  assert.deepEqual(match.players.find((player) => player.playerId === '3')!.snapshot.avoidsWith, ['6']);
  assert.equal(match.updatedAt, NOW.toISOString());
  assert.equal(match.createdAt, '2026-10-13T22:00:00.000Z');
  assert.equal(typeof match.score, 'number', '5 against 5 is measured');
  assert.equal(buildMatch(removePlayer(fromApp(), '10'), NOW).score, null, '5 against 4 is not');
});

test('editing: adding twice adds once, moving keeps the counters, counters stay between 0 and 99', () => {
  let draft = setCounter(fromApp(), '5', 'goals', 3);
  draft = addPlayer(draft, rojo[0], 2);
  assert.equal(draft.players.length, 10);
  draft = movePlayer(draft, '5');
  assert.deepEqual([byNick(draft, 'Eli').team, byNick(draft, 'Eli').goals], [2, 3]);
  assert.equal(byNick(setCounter(draft, '5', 'goals', -2), 'Eli').goals, 0);
  assert.equal(byNick(setCounter(draft, '5', 'errors', 150), 'Eli').errors, 99);
  assert.deepEqual(scorerGap(withResult(draft, '1', '4'), 2), { named: 3, total: 4 });
  assert.equal(scorerGap(draft, 2), null, 'no result, no hint');
});

test('a picture of the player never changes with them', () => {
  const ana = person(1, 'Ana', { wantsWith: ['2'] });
  const snapshot = snapshotOf(ana);
  ana.wantsWith.push('3');
  ana.attributes!.pace = 'high';
  assert.deepEqual(snapshot.wantsWith, ['2']);
  assert.equal(snapshot.attributes.pace, 'mid');
});

test('a match goes to the sheet and comes back the same', () => {
  const match = buildMatch(setCounter(withResult(fromApp(), '5', '3'), '5', 'goals', 3), NOW);
  const back = parseMatches({ matches: [serializeMatch(match)] });
  assert.deepEqual(back, [match]);
  assert.deepEqual(draftOf(back[0]).keepers, { 1: { kind: 'player', playerId: '1' }, 2: { kind: 'rotate' } });
});

test('reading matches: junk and repeats are skipped, the picture is checked like a player row', () => {
  const matches = parseMatches({
    matches: [
      null,
      { matchId: '' },
      {
        matchId: 'a',
        date: '2026-11-17',
        createdAt: 'x',
        team1Goals: 3,
        team2Goals: null,
        origin: 'robot',
        stage: 'STRICT',
        players: [
          { playerId: '1', nickname: 'Ana', team: '2', goals: '2', role: 'keeper', secondaryRole: 'GK', rating: 'n', attributes: '{"pace":"high"}', wantsWith: '1|2|2' },
          { playerId: '1', nickname: 'Again' },
          { nickname: 'No id' },
        ],
      },
      { matchId: 'a', date: 'repeated' },
      { matchId: 'b', date: '2026-10-13', team1Goals: '', team2Goals: '', origin: 'app', stage: 'FALLBACK', players: 'nope' },
    ],
  });

  assert.deepEqual(matches.map((match) => match.matchId), ['a', 'b']);
  const [a, b] = matches;
  assert.deepEqual([a.team1Goals, a.team2Goals, a.origin, a.stage], [3, 0, 'manual', ''], 'half a result is a 0; an unknown origin is manual');
  assert.deepEqual([b.team1Goals, b.team2Goals, b.origin, b.stage, b.players], [null, null, 'app', 'FALLBACK', []]);
  assert.deepEqual(a.players.map((player) => player.nickname), ['Ana']);
  assert.deepEqual(a.players[0].snapshot, {
    role: 'FLEX',
    secondaryRole: 'GK',
    rating: 5,
    attributes: { shooting: 'mid', control: 'mid', passing: 'mid', defense: 'mid', pace: 'high', vision: 'mid', grit: 'mid', stamina: 'mid' },
    gkWillingness: 'good',
    wantsWith: ['2'],
    avoidsWith: [],
  });
  assert.deepEqual([a.players[0].team, a.players[0].goals], [2, 2]);
  assert.throws(() => parseMatches({ error: 'Action unknown' }), /Action unknown/);
});

test('the list: newest day first, then the last saved; the outcome in three cases', () => {
  const base = { team1Goals: null, team2Goals: null } as const;
  const list = sortMatches([
    { ...base, matchId: 'old', date: '2026-09-29', createdAt: '2026-09-29T22:00:00Z' },
    { ...base, matchId: 'later', date: '2026-10-13', createdAt: '2026-10-14T10:00:00Z' },
    { ...base, matchId: 'first', date: '2026-10-13', createdAt: '2026-10-13T22:00:00Z' },
  ] as Match[]);
  assert.deepEqual(list.map((match) => match.matchId), ['later', 'first', 'old']);

  assert.deepEqual(outcomeOf({ team1Goals: 5, team2Goals: 3 }), { kind: 'won', side: 1, winner: 5, loser: 3 });
  assert.deepEqual(outcomeOf({ team1Goals: 2, team2Goals: 5 }), { kind: 'won', side: 2, winner: 5, loser: 2 });
  assert.deepEqual(outcomeOf({ team1Goals: 0, team2Goals: 0 }), { kind: 'draw', goals: 0 });
  assert.deepEqual(outcomeOf({ team1Goals: null, team2Goals: null }), { kind: 'none' });
});
