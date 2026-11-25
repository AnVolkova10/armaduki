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
  assert.equal(es.result.issue(ISSUES[6]), 'El Rojo quedó con 2 GK (máximo 1).');
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

// ---------------------------------------------------------------------------
// The analysis in words (25/11): every branch, in both languages.
// ---------------------------------------------------------------------------

test('keepers: each case of a team without a GK reads right', () => {
  assert.equal(en.result.keepersTeam('T1', 1, [], [], 2), 'Red has its GK.');
  assert.equal(es.result.keepersTeam('T2', 2, [], [], 2), 'El Negro tiene 2 GK.');
  assert.equal(es.result.keepersTeam('T1', 0, [], [], 2), 'El Rojo no tiene GK ni quien ataje (necesita 2).');
  assert.equal(es.result.keepersTeam('T1', 0, [], ['Flor'], 2), 'El Rojo no tiene GK y solo puede atajar Flor (necesita 2).');
  assert.equal(en.result.keepersTeam('T1', 0, ['Maru'], [], 2), 'Red has no GK, and only Maru can keep goal (it needs 2).');
  assert.equal(
    es.result.keepersTeam('T1', 0, ['Maru'], ['Flor', 'Tana', 'Caro', 'Rochi'], 2),
    'El Rojo no tiene GK: ataja bien Maru; si hace falta, pueden 4 más.',
  );
  assert.equal(
    en.result.keepersTeam('T2', 0, ['Maru', 'Sol'], [], 2),
    'Black has no GK: Maru and Sol keep goal well.',
  );
  assert.equal(es.result.keepersTeam('T2', 0, [], ['Flor', 'Tana'], 2), 'El Negro no tiene GK: pueden atajar Flor y Tana, ninguna muy bien.');
  assert.equal(es.result.keepersTeam('T2', 0, [], ['A', 'B', 'C', 'D'], 2), 'El Negro no tiene GK: pueden atajar 4, ninguna muy bien.');
});

test('rating, attributes and links: the even, one-sided and empty cases', () => {
  assert.equal(es.result.ratingSentence(0, 'Even', [30, 30]), 'Los dos equipos suman el mismo rating (30 a 30).');
  assert.equal(es.result.ratingSentence(1, 'T2', null), 'El Negro suma 1 punto más de rating.');
  assert.equal(en.result.ratingSentence(2, 'T1', [38, 36]), 'Red adds up to 2 more rating points (38 to 36).');
  assert.equal(es.result.attributesSentence([], ['remate'], ['pase', 'marca']), 'El Negro es mejor en remate. Iguales en pase y marca.');
  assert.equal(
    en.result.attributesSentence(['passing', 'defense'], ['shooting', 'grit', 'stamina'], ['pace']),
    'Red is better at passing and defense; Black at shooting, grit and stamina. Even in pace.',
  );
  assert.equal(es.result.attributesSentence([], [], ['remate']), 'Iguales en todos los atributos.');
  assert.equal(es.result.linksSentence(0, 0, 0, 0), 'No hay wants ni avoids entre estas diez.');
  assert.equal(en.result.linksSentence(3, 4, 0, 0), 'Wants kept: 3 of 4, playing together.');
  assert.equal(es.result.linksSentence(3, 3, 1, 1), 'Wants cumplidos: 3 de 3, juegan juntas. Avoids cumplidos: 1 de 1, juegan separadas.');
  assert.equal(es.result.oneWaySplit(15), 'Para emparejar, se separaron estos wants de un solo lado (15 puntos menos cada uno):');
});

test('the score: negative with a real minus, and what added nothing named in a sentence', () => {
  assert.equal(es.result.balanceSentence('imbalanced', -4), 'Los equipos están desparejos: uno es claramente más fuerte. Score −4: cuanto más alto, más parejo.');
  assert.equal(en.result.score(-4), 'Score −4');
  assert.equal(en.result.balanceSentence('highlyBalanced', 90), 'The teams are very even. Score 90: the higher, the more even.');
  assert.equal(es.result.scoreNoEffect(['la velocidad', 'el aire', 'la marca']), 'Esta vez no suman ni restan: la velocidad, el aire y la marca.');
  assert.equal(en.result.scoreTimes('1.5', 10), '1.5 × 10');
});
