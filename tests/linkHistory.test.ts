import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LinkHistoryEntry } from '../src/types/index.ts';
import {
  linkScores,
  matchesLinkSearch,
  orderLinkCandidates,
  parseLinkHistory,
  recordNewLinks,
} from '../src/utils/linkHistory.ts';

const candidate = (id: string, nickname: string, wantsWith: string[] = [], avoidsWith: string[] = []) => ({
  id,
  nickname,
  name: '',
  wantsWith,
  avoidsWith,
});
const nicknames = (list: { nickname: string }[]) => list.map((p) => p.nickname);
const entry = (sourceId: string, targetId: string, wantsCount: number, avoidsCount = 0): LinkHistoryEntry => ({
  sourceId,
  targetId,
  wantsCount,
  avoidsCount,
});

test('the history from the backend: counts as numbers, rows without both ids or counts left out', () => {
  assert.deepEqual(
    parseLinkHistory([
      { sourceId: 1, targetId: '2', wantsCount: 3, avoidsCount: 0 },
      { sourceId: ' 5 ', targetId: '6', wantsCount: '2', avoidsCount: 'x' },
      { sourceId: '', targetId: '2', wantsCount: 1, avoidsCount: 0 },
      { sourceId: '3', targetId: '3', wantsCount: 1, avoidsCount: 0 },
      { sourceId: '4', targetId: '5', wantsCount: 0, avoidsCount: 0 },
      null,
      'nope',
    ]),
    [entry('1', '2', 3), entry('5', '6', 2)],
  );
  assert.throws(() => parseLinkHistory({}), /not an array/);
});

test('a pair counts both directions, and popularity counts every link a player was in', () => {
  const history = [entry('1', '2', 2), entry('2', '1', 1), entry('3', '1', 1, 4)];
  const wants = linkScores(history, 'wants');
  assert.equal(wants.pair('1', '2'), 3);
  assert.equal(wants.pair('2', '1'), 3);
  assert.equal(wants.pair('2', '3'), 0);
  assert.equal(wants.popularity('1'), 4);
  assert.equal(wants.popularity('3'), 1);
  const avoids = linkScores(history, 'avoids');
  assert.equal(avoids.pair('1', '3'), 4, 'wants and avoids are counted apart');
  assert.equal(avoids.pair('1', '2'), 0);
  assert.equal(linkScores(null, 'wants').popularity('1'), 0, 'no history at all');
});

test('opening B: marked first, then who marks B now, the usual ones both ways, the most linked, then by nickname', () => {
  // B is "2". Ana wants B now; Eli wanted B twice (the other way round); B wanted Caro once;
  // Ana and Fio wanted each other three times, so both are popular; Dani is already marked.
  const people = [
    candidate('1', 'Ana', ['2']),
    candidate('3', 'Caro'),
    candidate('4', 'Dani'),
    candidate('5', 'Eli'),
    candidate('6', 'Fio'),
    candidate('8', 'Hana'),
    candidate('7', 'Gabi'),
  ];
  const history = [entry('2', '3', 1), entry('5', '2', 2), entry('6', '1', 3)];

  const wants = orderLinkCandidates(people, '2', new Set(['4']), 'wants', linkScores(history, 'wants'));
  assert.deepEqual(nicknames(wants), ['Dani', 'Ana', 'Eli', 'Caro', 'Fio', 'Gabi', 'Hana']);
  assert.deepEqual(nicknames(people), ['Ana', 'Caro', 'Dani', 'Eli', 'Fio', 'Hana', 'Gabi'], 'the input list stays');
});

test('the avoids list goes by avoids only: whoever avoids B comes up, wants do not count', () => {
  const people = [candidate('1', 'Ana', ['2']), candidate('3', 'Caro', [], ['2']), candidate('5', 'Eli'), candidate('4', 'Dani')];
  const history = [entry('5', '2', 4), entry('4', '9', 0, 2)];

  const avoids = orderLinkCandidates(people, '2', new Set(), 'avoids', linkScores(history, 'avoids'));
  assert.deepEqual(nicknames(avoids), ['Caro', 'Dani', 'Ana', 'Eli']);
});

test('somebody new: no marks and no pairs yet, so the most linked first and then by nickname', () => {
  const people = [candidate('1', 'Ana'), candidate('2', 'Bea'), candidate('3', 'Caro'), candidate('6', 'Fio')];
  const history = [entry('6', '1', 3), entry('2', '3', 1)];

  const wants = orderLinkCandidates(people, '', new Set(), 'wants', linkScores(history, 'wants'));
  assert.deepEqual(nicknames(wants), ['Ana', 'Fio', 'Bea', 'Caro']);
});

test('a save counts each new want or avoid once, as the backend does', () => {
  const history = [entry('1', '2', 1)];

  const afterEdit = recordNewLinks(history, '1', { wantsWith: ['3'], avoidsWith: [] }, { wantsWith: ['3', '2', '2', '1'], avoidsWith: ['4'] });
  assert.deepEqual(afterEdit, [entry('1', '2', 2), entry('1', '4', 0, 1)], '3 was already a want; 1 is the player');
  assert.deepEqual(history, [entry('1', '2', 1)], 'the old history stays as it was');

  assert.deepEqual(recordNewLinks([], '9', undefined, { wantsWith: ['1'], avoidsWith: [] }), [entry('9', '1', 1)], 'somebody new');
  assert.deepEqual(
    recordNewLinks(history, '1', { wantsWith: ['2'], avoidsWith: [] }, { wantsWith: [], avoidsWith: [] }),
    history,
    'taking a link away counts nothing',
  );
});

test('the search in the lists: nickname or name, by word, without accents', () => {
  const ines = { nickname: 'Inés', name: 'Inés Bordigoni' };
  assert.ok(matchesLinkSearch(ines, 'ine'));
  assert.ok(matchesLinkSearch(ines, 'bordi'));
  assert.ok(matchesLinkSearch(ines, '  '), 'an empty search keeps everyone');
  assert.ok(!matchesLinkSearch(ines, 'nes'));
});
