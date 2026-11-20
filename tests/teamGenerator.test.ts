// Run with `npm test` (Node's built-in test runner, no extra dependencies).
// VITE_OWNER_ID is not available here, so the owner id is the default `10`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTeamPower,
  compareSplitsByBalance,
  generateTeams,
  ONE_WAY_WANT_PENALTY,
  type RankableSplit,
} from '../src/services/teamGenerator.ts';
import type { GeneratedTeamOption, Person } from '../src/types/index.ts';

function player(id: number, overrides: Partial<Person> = {}): Person {
  return {
    id: String(id),
    name: '',
    nickname: `P${id}`,
    role: 'MID',
    rating: 5,
    gkWillingness: 'low',
    wantsWith: [],
    avoidsWith: [],
    attributes: {
      shooting: 'mid',
      control: 'mid',
      passing: 'mid',
      defense: 'mid',
      pace: 'mid',
      vision: 'mid',
      grit: 'mid',
      stamina: 'mid',
    },
    teams: [],
    groups: [],
    availability: [],
    ...overrides,
  };
}

/** Ten players: P1 and P6 are GK, ratings 3..8, ids 1..9 and 11 (no owner). */
function basePool(): Person[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 11].map((id, index) =>
    player(id, { role: id === 1 || id === 6 ? 'GK' : 'MID', rating: 3 + (index % 6) }),
  );
}

function teamOf(option: GeneratedTeamOption, id: string): 1 | 2 {
  return option.team1.players.some((p) => p.id === id) ? 1 : 2;
}

function count(players: Person[], role: Person['role']): number {
  return players.filter((p) => p.role === role).length;
}

function byId(pool: Person[], id: number): Person {
  const found = pool.find((p) => p.id === String(id));
  if (!found) throw new Error(`missing player ${id}`);
  return found;
}

test('needs exactly 10 players with unique ids', () => {
  assert.equal(generateTeams(basePool().slice(0, 9)), null);
  const duplicated = basePool();
  duplicated[9] = { ...duplicated[9], id: duplicated[0].id };
  assert.equal(generateTeams(duplicated), null);
});

test('strict split: 5v5, one GK per team, two DEF split 1/1', () => {
  const pool = basePool();
  byId(pool, 2).role = 'DEF';
  byId(pool, 3).role = 'DEF';
  const result = generateTeams(pool);
  assert.ok(result);
  const { team1, team2 } = result.primary;
  assert.equal(result.primary.stage, 'STRICT');
  assert.equal(team1.players.length, 5);
  assert.equal(team2.players.length, 5);
  assert.equal(count(team1.players, 'GK'), 1);
  assert.equal(count(team2.players, 'GK'), 1);
  assert.equal(count(team1.players, 'DEF'), 1);
  assert.equal(count(team2.players, 'DEF'), 1);
});

test('strict split keeps avoids apart and mutual wants together', () => {
  const pool = basePool();
  byId(pool, 2).avoidsWith = ['3'];
  byId(pool, 4).wantsWith = ['5'];
  byId(pool, 5).wantsWith = ['4'];
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'STRICT');
  assert.notEqual(teamOf(result.primary, '2'), teamOf(result.primary, '3'));
  assert.equal(teamOf(result.primary, '4'), teamOf(result.primary, '5'));
});

test('a one-way want stays together when it costs little', () => {
  const pool = basePool();
  byId(pool, 4).wantsWith = ['5'];
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'STRICT');
  assert.equal(teamOf(result.primary, '4'), teamOf(result.primary, '5'));
  assert.match(result.primary.explanation ?? '', /One-way wants \(preference, -15 each if broken\): kept 1\/1\./);
});

test('a one-way want gives way when keeping it makes the teams much more uneven', () => {
  // P2 and P3 are the two strongest: together they would make one team 10 rating points stronger.
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11].map((id) =>
    player(id, { role: id === 1 || id === 6 ? 'GK' : 'MID', rating: id === 2 || id === 3 ? 10 : 5 }),
  );
  byId(pool, 2).wantsWith = ['3'];
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'STRICT');
  assert.notEqual(teamOf(result.primary, '2'), teamOf(result.primary, '3'));
  assert.equal(result.primary.score, 100 - ONE_WAY_WANT_PENALTY);
  assert.match(result.primary.explanation ?? '', /highly balanced; 1 broken one-way want -15/);
  assert.match(result.primary.explanation ?? '', /Broken one-way wants: P2 -> P3/);
});

test('a one-way wants chain of 6 no longer forces a fallback', () => {
  const pool = basePool();
  for (const [from, to] of [[2, 3], [3, 4], [4, 5], [5, 7], [7, 8]]) {
    byId(pool, from).wantsWith = [String(to)];
  }
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'STRICT');
});

test('ties: higher social satisfaction first, then smaller rating gap', () => {
  const split = (overrides: Partial<RankableSplit>): RankableSplit => ({
    score: 80,
    socialPct: 100,
    ratingDiff: 1,
    displayKey: 'a',
    ...overrides,
  });
  const ranked = [
    split({ displayKey: 'tie-on-everything-b' }),
    split({ socialPct: 50, displayKey: 'lower-social' }),
    split({ ratingDiff: 3, displayKey: 'bigger-gap' }),
    split({ score: 90, socialPct: 0, ratingDiff: 9, displayKey: 'best-score' }),
    split({ displayKey: 'tie-on-everything-a' }),
  ].sort(compareSplitsByBalance);
  assert.deepEqual(
    ranked.map((s) => s.displayKey),
    ['best-score', 'tie-on-everything-a', 'tie-on-everything-b', 'bigger-gap', 'lower-social'],
  );
});

test('owner (id 10) lands on the lower or equal Power team', () => {
  const pool = basePool();
  pool[9] = player(10, { rating: 9 });
  const result = generateTeams(pool);
  assert.ok(result);
  const ownerTeam = teamOf(result.primary, '10') === 1 ? result.primary.team1 : result.primary.team2;
  const otherTeam = ownerTeam === result.primary.team1 ? result.primary.team2 : result.primary.team1;
  assert.ok(calculateTeamPower(ownerTeam.players) <= calculateTeamPower(otherTeam.players));
});

test('second option is a different, lower-or-equal scored split', () => {
  const result = generateTeams(basePool());
  assert.ok(result?.secondary);
  const key = (option: GeneratedTeamOption) =>
    option.team1.players.map((p) => p.id).sort().join(',');
  assert.notEqual(key(result.secondary), key(result.primary));
  assert.ok(result.secondary.score <= result.primary.score);
});

test('result does not depend on input order', () => {
  const pool = basePool();
  byId(pool, 2).avoidsWith = ['7'];
  const forward = generateTeams(pool);
  const reversed = generateTeams([...pool].reverse());
  assert.ok(forward && reversed);
  assert.deepEqual(
    forward.primary.team1.players.map((p) => p.id).sort(),
    reversed.primary.team1.players.map((p) => p.id).sort(),
  );
});

test('fallback keeps avoids when only the mutual wants are impossible', () => {
  const pool = basePool();
  // Mutual wants chain six players together: impossible with 5 spots per team.
  for (const [a, b] of [[2, 3], [3, 4], [4, 5], [5, 7], [7, 8]]) {
    byId(pool, a).wantsWith.push(String(b));
    byId(pool, b).wantsWith.push(String(a));
  }
  byId(pool, 9).avoidsWith = ['11'];
  byId(pool, 11).avoidsWith = ['9'];
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'FALLBACK');
  assert.notEqual(teamOf(result.primary, '9'), teamOf(result.primary, '11'));
  assert.match(result.primary.explanation ?? '', /Why: Wants chain 6 players together/);
  assert.match(result.primary.explanation ?? '', /- Avoids: kept\./);
});

test('fallback with 3 GK splits them 2/1 instead of 3/0', () => {
  const pool = basePool();
  byId(pool, 2).role = 'GK';
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'FALLBACK');
  const split = [count(result.primary.team1.players, 'GK'), count(result.primary.team2.players, 'GK')].sort();
  assert.deepEqual(split, [1, 2]);
  assert.match(result.primary.explanation ?? '', /Why: 3 GK selected/);
});

test('fallback explains a mutual want/avoid contradiction', () => {
  const pool = basePool();
  byId(pool, 2).wantsWith = ['3'];
  byId(pool, 3).wantsWith = ['2'];
  byId(pool, 4).wantsWith = ['3'];
  byId(pool, 3).avoidsWith = ['4'];
  // 2 and 3 want each other (rule); 4 wants 3 one way (preference) but 3 avoids 4.
  byId(pool, 5).wantsWith = ['6'];
  byId(pool, 6).wantsWith = ['5'];
  byId(pool, 6).avoidsWith = ['5'];
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'FALLBACK');
  assert.match(result.primary.explanation ?? '', /P6 avoids P5, but wants links chain them into the same team/);
  assert.doesNotMatch(result.primary.explanation ?? '', /P3 avoids P4, but wants links/);
  // Avoids outrank wants, so the two end up apart.
  assert.notEqual(teamOf(result.primary, '5'), teamOf(result.primary, '6'));
});

test('a one-way want against an avoid is just a broken preference, not a fallback', () => {
  const pool = basePool();
  byId(pool, 2).wantsWith = ['3'];
  byId(pool, 3).avoidsWith = ['2'];
  const result = generateTeams(pool);
  assert.ok(result);
  assert.equal(result.primary.stage, 'STRICT');
  assert.notEqual(teamOf(result.primary, '2'), teamOf(result.primary, '3'));
  assert.match(result.primary.explanation ?? '', /Broken one-way wants: P2 -> P3/);
});
