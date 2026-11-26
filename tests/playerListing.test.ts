import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Person, Role } from '../src/types/index.ts';
import {
  applyCatalogs,
  applyPrivacyMode,
  catalogFilter,
  DEFAULT_LISTING_CONTROLS,
  filterAndSortPeople,
  hasActiveFilters,
  NO_CATALOGS,
  sortAfterSelectionChange,
  type ListingCatalogs,
  type ListingControls,
} from '../src/utils/playerListing.ts';
import { mainTeamId } from '../src/utils/mainTeam.ts';

function person(id: string, nickname: string, role: Role, rating: number, name = ''): Person {
  return {
    id,
    name,
    nickname,
    role,
    rating,
    avatar: '',
    gkWillingness: 'no',
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
  };
}

const people = [
  person('1', 'Rana', 'ATT', 7, 'La Rana'),
  person('2', 'Inés', 'MID', 5, 'Inés Bordigoni'),
  person('3', 'Ana', 'GK', 7),
  person('4', 'Bea', 'MID', 5),
  person('5', 'Caro', 'DEF', 9),
  person('6', 'Dani', 'FLEX', 5),
];

const nicknames = (list: Person[]) => list.map((p) => p.nickname);
const controls = (patch: Partial<ListingControls>): ListingControls => ({ ...DEFAULT_LISTING_CONTROLS, ...patch });
const list = (patch: Partial<ListingControls>, selected: string[] = []) =>
  nicknames(filterAndSortPeople(people, controls(patch), new Set(selected)));

test('no search, filter or sort keeps the sheet order', () => {
  assert.deepEqual(list({}), ['Rana', 'Inés', 'Ana', 'Bea', 'Caro', 'Dani']);
});

test('search matches word prefixes of nickname or name, without accents', () => {
  assert.deepEqual(list({ query: 'ines' }), ['Inés']);
  assert.deepEqual(list({ query: 'bordi' }), ['Inés']);
  assert.deepEqual(list({ query: '  RA ' }), ['Rana']);
  assert.deepEqual(list({ query: 'an' }), ['Ana']);
});

test('role and score filters combine with the search', () => {
  assert.deepEqual(list({ role: 'MID' }), ['Inés', 'Bea']);
  assert.deepEqual(list({ score: '5' }), ['Inés', 'Bea', 'Dani']);
  assert.deepEqual(list({ role: 'MID', score: '5', query: 'b' }), ['Inés', 'Bea'], '"b" also matches Bordigoni');
  assert.deepEqual(list({ role: 'MID', score: '5', query: 'be' }), ['Bea']);
});

test('score sort: high to low or low to high, ties always by nickname A-Z', () => {
  assert.deepEqual(list({ sort: 'score' }), ['Caro', 'Ana', 'Rana', 'Bea', 'Dani', 'Inés']);
  assert.deepEqual(list({ sort: 'score', scoreDirection: 'asc' }), ['Bea', 'Dani', 'Inés', 'Ana', 'Rana', 'Caro']);
});

test('position sort goes GK, FLEX, DEF, MID, ATT, then nickname', () => {
  assert.deepEqual(list({ sort: 'position' }), ['Ana', 'Dani', 'Caro', 'Bea', 'Inés', 'Rana']);
});

test('selected sort puts the selected first and keeps the order inside each group', () => {
  assert.deepEqual(list({ sort: 'selected' }, ['4', '1']), ['Rana', 'Bea', 'Inés', 'Ana', 'Caro', 'Dani']);
});

test('never changes the input list', () => {
  const before = nicknames(people);
  filterAndSortPeople(people, controls({ sort: 'score' }), new Set());
  assert.deepEqual(nicknames(people), before);
});

test('privacy mode ignores the score filter and the score sort, and keeps the rest', () => {
  const chosen = controls({ query: 'a', role: 'MID', score: '5', sort: 'score', scoreDirection: 'asc' });
  assert.deepEqual(applyPrivacyMode(chosen, true), controls({ query: 'a', role: 'MID' }));
  assert.equal(applyPrivacyMode(controls({ sort: 'position' }), true).sort, 'position');
  assert.equal(applyPrivacyMode(chosen, false), chosen, 'without privacy mode the same object comes back');
});

test('only search and filters count as active, sorting does not', () => {
  assert.equal(hasActiveFilters(DEFAULT_LISTING_CONTROLS), false);
  assert.equal(hasActiveFilters(controls({ query: '   ' })), false);
  assert.equal(hasActiveFilters(controls({ sort: 'score' })), false);
  assert.equal(hasActiveFilters(controls({ query: 'a' })), true);
  assert.equal(hasActiveFilters(controls({ role: 'GK' })), true);
  assert.equal(hasActiveFilters(controls({ score: '3' })), true);
});

// ---------------------------------------------------------------------------
// The picks go to the top by themselves with the tenth (Sprint 5).
// ---------------------------------------------------------------------------

test('the tenth pick switches the sort to selected and remembers the one it replaced', () => {
    assert.deepEqual(sortAfterSelectionChange(9, 10, 10, { sort: 'position', restore: null }), {
        sort: 'selected',
        restore: 'position',
    });
    assert.deepEqual(sortAfterSelectionChange(9, 10, 10, { sort: 'none', restore: null }), {
        sort: 'selected',
        restore: 'none',
    });
});

test('picks below ten, and changes among them, leave the sort alone', () => {
    for (const [previous, count] of [[0, 1], [4, 5], [8, 9], [5, 4]]) {
        assert.deepEqual(sortAfterSelectionChange(previous, count, 10, { sort: 'score', restore: null }), {
            sort: 'score',
            restore: null,
        });
    }
});

test('taking one out keeps the picks on top, and the tenth again changes nothing more', () => {
    const atTen = sortAfterSelectionChange(9, 10, 10, { sort: 'score', restore: null });
    const atNine = sortAfterSelectionChange(10, 9, 10, atTen);
    assert.deepEqual(atNine, { sort: 'selected', restore: 'score' });
    assert.deepEqual(sortAfterSelectionChange(9, 10, 10, atNine), { sort: 'selected', restore: 'score' });
});

test('an empty selection gives the earlier sort back', () => {
    const atTen = sortAfterSelectionChange(9, 10, 10, { sort: 'position', restore: null });
    assert.deepEqual(sortAfterSelectionChange(10, 0, 10, atTen), { sort: 'position', restore: null });
    // Also when the picks leave one by one.
    assert.deepEqual(sortAfterSelectionChange(1, 0, 10, { sort: 'selected', restore: 'none' }), {
        sort: 'none',
        restore: null,
    });
});

test('a sort chosen by hand stays when the selection empties', () => {
    // The caller forgets `restore` when the sort is picked by hand.
    assert.deepEqual(sortAfterSelectionChange(10, 0, 10, { sort: 'score', restore: null }), {
        sort: 'score',
        restore: null,
    });
    assert.deepEqual(sortAfterSelectionChange(10, 0, 10, { sort: 'selected', restore: null }), {
        sort: 'selected',
        restore: null,
    });
});

test('sort already on selected: the tenth pick has nothing to remember', () => {
    assert.deepEqual(sortAfterSelectionChange(9, 10, 10, { sort: 'selected', restore: null }), {
        sort: 'selected',
        restore: null,
    });
});

test('inactive players only show under their own filter, which still takes search and sort', () => {
  const withInactive = [...people, { ...person('7', 'Eli', 'MID', 4), active: false }, { ...person('8', 'Fio', 'ATT', 8), active: false }];
  const listOf = (patch: Partial<ListingControls>) => nicknames(filterAndSortPeople(withInactive, controls(patch), new Set()));

  assert.deepEqual(listOf({}), ['Rana', 'Inés', 'Ana', 'Bea', 'Caro', 'Dani']);
  assert.deepEqual(listOf({ role: 'MID' }), ['Inés', 'Bea']);
  assert.deepEqual(listOf({ role: 'inactive' }), ['Eli', 'Fio']);
  assert.deepEqual(listOf({ role: 'inactive', query: 'fi' }), ['Fio']);
  assert.deepEqual(listOf({ role: 'inactive', sort: 'score' }), ['Fio', 'Eli']);
  assert.equal(hasActiveFilters(controls({ role: 'inactive' })), true);
});

// ---------------------------------------------------------------------------
// Team and group filters, the second position in the role filter, and the shirt and team
// sorts (Sprint 7).
// ---------------------------------------------------------------------------

const catalogs: ListingCatalogs = {
  teams: new Map([['halcones', 'Halcones'], ['armaduki', 'Armaduki']]),
  groups: new Map([['segurola', 'Segurola 20hs Jueves'], ['amigxs', 'Amigxs']]),
};

const club: Person[] = [
  { ...person('1', 'Rana', 'ATT', 7), primaryTeam: 'armaduki', teams: ['armaduki', 'halcones'], groups: ['segurola'], shirtNumber: '9' },
  { ...person('2', 'Inés', 'MID', 5), secondaryRole: 'DEF', primaryTeam: 'halcones', teams: ['halcones'], groups: ['segurola', 'amigxs'], shirtNumber: '007' },
  // Only ids the tabs no longer have: a team and a group deleted in the sheet.
  { ...person('3', 'Ana', 'GK', 7), teams: ['viejo'], groups: ['borrado'], shirtNumber: '1' },
  // Teams but none marked as main, as a row edited in the sheet can be.
  { ...person('4', 'Bea', 'MID', 5), teams: ['halcones'], shirtNumber: '7' },
  { ...person('5', 'Caro', 'DEF', 9), groups: ['amigxs'] },
  { ...person('6', 'Dani', 'FLEX', 5), secondaryRole: 'DEF', shirtNumber: 'X' },
];

const clubList = (patch: Partial<ListingControls>, selected: string[] = []) =>
  nicknames(filterAndSortPeople(club, controls(patch), new Set(selected), catalogs));

test('team filter: anyone with that team, main or not', () => {
  assert.deepEqual(clubList({ team: catalogFilter('halcones') }), ['Rana', 'Inés', 'Bea']);
  assert.deepEqual(clubList({ team: catalogFilter('armaduki') }), ['Rana']);
});

test('group filter, combined with the team filter, the role and the search', () => {
  assert.deepEqual(clubList({ group: catalogFilter('segurola') }), ['Rana', 'Inés']);
  assert.deepEqual(clubList({ group: catalogFilter('amigxs') }), ['Inés', 'Caro']);
  assert.deepEqual(clubList({ group: catalogFilter('segurola'), team: catalogFilter('armaduki') }), ['Rana']);
  assert.deepEqual(clubList({ group: catalogFilter('amigxs'), role: 'MID' }), ['Inés']);
  assert.deepEqual(clubList({ group: catalogFilter('amigxs'), query: 'ca' }), ['Caro']);
});

test('"No team" and "No group": none the tabs know, so an id left by a deleted one counts as none', () => {
  assert.deepEqual(clubList({ team: 'none' }), ['Ana', 'Caro', 'Dani']);
  assert.deepEqual(clubList({ group: 'none' }), ['Ana', 'Bea', 'Dani']);
  assert.deepEqual(clubList({ team: 'none', group: 'none' }), ['Ana', 'Dani']);
});

test('a team whose id is "none" or "all" is still that team', () => {
  const odd: ListingCatalogs = { teams: new Map([['none', 'None FC'], ['all', 'All Stars']]), groups: new Map() };
  const players = [
    { ...person('1', 'Uno', 'MID', 5), teams: ['none'] },
    { ...person('2', 'Dos', 'MID', 5), teams: ['all'] },
    person('3', 'Tres', 'MID', 5),
  ];
  const of = (patch: Partial<ListingControls>) => nicknames(filterAndSortPeople(players, controls(patch), new Set(), odd));
  assert.deepEqual(of({ team: catalogFilter('none') }), ['Uno']);
  assert.deepEqual(of({ team: catalogFilter('all') }), ['Dos']);
  assert.deepEqual(of({ team: 'none' }), ['Tres']);
});

test('a role also brings who has it as second position, after the ones who play it as main', () => {
  assert.deepEqual(clubList({ role: 'DEF' }), ['Caro', 'Inés', 'Dani']);
  // Also when a second-position one would sort first.
  assert.deepEqual(clubList({ role: 'DEF', sort: 'score', scoreDirection: 'asc' }), ['Caro', 'Dani', 'Inés']);
  assert.deepEqual(clubList({ role: 'MID' }), ['Inés', 'Bea'], 'nobody has MID as second position');
  // The selected sort is the one exception: the picks go first.
  assert.deepEqual(clubList({ role: 'DEF', sort: 'selected' }, ['6']), ['Dani', 'Caro', 'Inés']);
});

test('shirt sort: numbers as numbers (007 ties with 7), other text after them, no number last', () => {
  assert.deepEqual(clubList({ sort: 'shirt' }), ['Ana', 'Bea', 'Inés', 'Rana', 'Dani', 'Caro']);
});

test('team sort: by the name of the main team, or the first team when none is marked; no team last', () => {
  assert.deepEqual(clubList({ sort: 'team' }), ['Rana', 'Bea', 'Inés', 'Ana', 'Caro', 'Dani']);
});

test('the main team is the marked one, or else the first one the Teams tab knows', () => {
  const known = (id: string) => catalogs.teams.has(id);
  assert.equal(mainTeamId({ primaryTeam: 'armaduki', teams: ['halcones', 'armaduki'] }, known), 'armaduki');
  assert.equal(mainTeamId({ teams: ['viejo', 'halcones'] }, known), 'halcones');
  assert.equal(mainTeamId({ primaryTeam: 'viejo', teams: ['armaduki'] }, known), 'armaduki', 'a main team the tab lost');
  assert.equal(mainTeamId({ teams: ['viejo'] }, known), undefined);
});

test('without teams or groups there is no such filter or team sort; a team or group that left stops filtering', () => {
  const chosen = controls({ team: catalogFilter('halcones'), group: catalogFilter('segurola'), sort: 'team' });
  assert.equal(applyCatalogs(chosen, catalogs), chosen, 'all offered: the same object comes back');
  assert.deepEqual(applyCatalogs(chosen, NO_CATALOGS), controls({}));
  assert.deepEqual(applyCatalogs(controls({ team: catalogFilter('viejo'), group: 'none' }), catalogs), controls({ group: 'none' }));
  assert.deepEqual(
    applyCatalogs(controls({ team: 'none', group: 'none' }), { teams: catalogs.teams, groups: new Map() }),
    controls({ team: 'none' }),
  );
});

test('team and group filters count as active, and the inactive filter still works with them', () => {
  assert.equal(hasActiveFilters(controls({ team: catalogFilter('halcones') })), true);
  assert.equal(hasActiveFilters(controls({ group: 'none' })), true);
  const withInactive = [...club, { ...person('7', 'Eli', 'MID', 4), active: false, groups: ['segurola'] }];
  const of = (patch: Partial<ListingControls>) =>
    nicknames(filterAndSortPeople(withInactive, controls(patch), new Set(), catalogs));
  assert.deepEqual(of({ group: catalogFilter('segurola') }), ['Rana', 'Inés']);
  assert.deepEqual(of({ group: catalogFilter('segurola'), role: 'inactive' }), ['Eli']);
});
