import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortSelectedFirst } from '../src/utils/selection.ts';

const people = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((person) => person.id);

test('selected players go first, each group keeps its original order', () => {
  assert.deepEqual(ids(sortSelectedFirst(people, new Set(['d', 'b']))), ['b', 'd', 'a', 'c', 'e']);
});

test('no selection or everyone selected keeps the original order', () => {
  assert.deepEqual(ids(sortSelectedFirst(people, new Set())), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(ids(sortSelectedFirst(people, new Set(ids(people)))), ['a', 'b', 'c', 'd', 'e']);
});

test('does not change the input list', () => {
  const input = [...people];
  sortSelectedFirst(input, new Set(['e']));
  assert.deepEqual(ids(input), ['a', 'b', 'c', 'd', 'e']);
});
