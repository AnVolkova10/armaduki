import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, birthDateParts, normalizeBirthDate, readBirthDateInput } from '../src/utils/birthDate.ts';
import { sameCatalogName, slugify, uniqueCatalogId } from '../src/utils/catalogIds.ts';

test('a birth date is kept as the year, the year and month, or the whole date', () => {
  assert.equal(normalizeBirthDate('1994'), '1994');
  assert.equal(normalizeBirthDate('1994-3'), '1994-03');
  assert.equal(normalizeBirthDate('1994-03-09'), '1994-03-09');
  assert.equal(normalizeBirthDate(1994), '1994', 'a year the sheet holds as a number');
  assert.equal(normalizeBirthDate("'1994-03"), '1994-03', 'a stray apostrophe from the sheet');
  assert.equal(normalizeBirthDate('1994-03-12T03:00:00.000Z'), '1994-03-12', 'an ISO date');
});

test('anything that is not a real date is no date', () => {
  for (const value of ['', 'hola', '94', '1994-13', '1994-02-30', '1850', '2999', '12/03/1994', null, undefined, {}]) {
    assert.equal(normalizeBirthDate(value), undefined, String(value));
  }
});

test('the form fields: the year is needed, a day needs its month', () => {
  assert.deepEqual(readBirthDateInput({ year: '', month: '', day: '' }), { kind: 'empty' });
  assert.deepEqual(readBirthDateInput({ year: '1994', month: '', day: '' }), { kind: 'date', value: '1994' });
  assert.deepEqual(readBirthDateInput({ year: '1994', month: '3', day: '' }), { kind: 'date', value: '1994-03' });
  assert.deepEqual(readBirthDateInput({ year: ' 1994', month: '3', day: '9 ' }), { kind: 'date', value: '1994-03-09' });
  assert.deepEqual(readBirthDateInput({ year: '', month: '3', day: '' }), { kind: 'invalid' });
  assert.deepEqual(readBirthDateInput({ year: '1994', month: '', day: '9' }), { kind: 'invalid' });
  assert.deepEqual(readBirthDateInput({ year: '1994', month: '2', day: '30' }), { kind: 'invalid' });
  assert.deepEqual(readBirthDateInput({ year: '94', month: '', day: '' }), { kind: 'invalid' });
  assert.deepEqual(birthDateParts('1994-03-09'), { year: '1994', month: '3', day: '9' });
  assert.deepEqual(birthDateParts(undefined), { year: '', month: '', day: '' });
});

test('the age is exact with the whole date and a close guess without the day', () => {
  const today = new Date(2026, 10, 25); // 25 November 2026
  assert.deepEqual(ageOn('1994-11-25', today), { years: 32, exact: true });
  assert.deepEqual(ageOn('1994-11-26', today), { years: 31, exact: true });
  assert.deepEqual(ageOn('1994-03', today), { years: 32, exact: false });
  assert.deepEqual(ageOn('1994-12', today), { years: 31, exact: false });
  assert.deepEqual(ageOn('1994', today), { years: 32, exact: false }, 'past the middle of the year');
  assert.deepEqual(ageOn('1994', new Date(2026, 1, 1)), { years: 31, exact: false });
  assert.equal(ageOn(undefined, today), null);
});

test('team and group ids come from the name, plain and unique', () => {
  assert.equal(slugify('Segurola 20hs Jueves'), 'segurola-20hs-jueves');
  assert.equal(slugify('  Las Piñas & Cía.  '), 'las-pinas-cia');
  assert.equal(slugify('¡¡!!'), '');
  assert.equal(uniqueCatalogId('Segurola', ['segurola', 'segurola-2'], 'group'), 'segurola-3');
  assert.equal(uniqueCatalogId('★', [], 'team'), 'team');
  assert.equal(uniqueCatalogId('★', ['team'], 'team'), 'team-2');
  assert.ok(sameCatalogName('Segurola ', 'segurola'));
  assert.ok(sameCatalogName('Belgrano Más', 'belgrano mas'));
  assert.ok(!sameCatalogName('Segurola', 'Segurola 2'));
});
