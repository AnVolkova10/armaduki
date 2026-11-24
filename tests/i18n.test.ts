// The two dictionaries: same shape (TypeScript checks it too), and every fallback sentence exists
// in both languages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';
import type { FallbackCause, RuleIssue } from '../src/types/index.ts';

function shape(value: unknown, path = ''): string[] {
  if (typeof value === 'function') return [`${path}()`];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => shape(inner, path ? `${path}.${key}` : key));
  }
  return [path];
}

const CAUSES: FallbackCause[] = [
  { kind: 'tooManyGK', count: 3, maxPerTeam: 1 },
  { kind: 'tooManyDEF', count: 5, maxPerTeam: 2 },
  { kind: 'fewKeepers', gkCount: 0, capable: 3, neededPerTeam: 2 },
  { kind: 'wantsChain', nicknames: ['A', 'B', 'C', 'D', 'E', 'F'], teamSize: 5 },
  { kind: 'avoidInChain', from: 'A', to: 'B' },
];

const ISSUES: RuleIssue[] = [
  { kind: 'avoidTogether', link: { from: 'A', to: 'B', mutual: false } },
  { kind: 'avoidTogether', link: { from: 'A', to: 'B', mutual: true } },
  { kind: 'wantSplit', link: { from: 'A', to: 'B', mutual: true } },
  { kind: 'ownerOnStronger', nickname: 'A' },
  { kind: 'defSplit', team1: 2, team2: 0 },
  { kind: 'attSplit', team1: 3, team2: 1 },
  { kind: 'tooManyGK', team: 'T1', count: 2, max: 1 },
  { kind: 'tooManyDEF', team: 'T2', count: 3, max: 2 },
  { kind: 'fewKeepers', team: 'T2', capable: 1, needed: 2 },
];

test('English and Spanish have the same entries', () => {
  assert.deepEqual(shape(es).sort(), shape(en).sort());
});

test('every fallback cause and broken rule has its sentence in both languages', () => {
  for (const dict of [en, es]) {
    for (const cause of CAUSES) {
      const sentence = dict.result.cause(cause);
      assert.ok(sentence.length > 10 && !sentence.includes('undefined'), `${cause.kind}: ${sentence}`);
    }
    for (const issue of ISSUES) {
      const sentence = dict.result.issue(issue);
      assert.ok(sentence.length > 10 && !sentence.includes('undefined'), `${issue.kind}: ${sentence}`);
    }
  }
});

test('the sentences from the design direction', () => {
  assert.equal(es.result.cause(CAUSES[0]), 'Hay 3 GK elegidas y el máximo es 1 por equipo.');
  assert.equal(es.result.issue(ISSUES[6]), 'El Equipo 1 quedó con 2 GK (máximo 1).');
  assert.equal(es.result.issue(ISSUES[2]), 'A y B quieren jugar juntas y quedaron separadas.');
  assert.equal(en.result.cause(CAUSES[0]), '3 GK selected, and a team takes 1 at most.');
  assert.equal(es.page.generate, 'Armar equipos');
  assert.equal(es.gate.idle, 'Hacé el gol para entrar');
});

test('the texts the browser suites and old habits rely on stay as they were in English', () => {
  assert.equal(en.page.generate, 'Generate Teams');
  assert.equal(en.page.addPlayer, '+ Add Player');
  assert.equal(en.page.savedCopyRefresh, 'Saved copy · Refresh');
  assert.equal(en.gate.idle, 'Score to get in');
  assert.equal(en.gate.saved, "Saved. That's not the key.");
  assert.equal(en.result.copy, 'Copy Teams');
});
