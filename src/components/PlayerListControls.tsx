import { useMemo, type CSSProperties } from 'react';
import type { ListingControlsUpdate } from '../hooks/usePlayerListing';
import { useT } from '../i18n';
import type { GroupCatalog, TeamCatalog } from '../types';
import {
    catalogFilter,
    type CatalogFilter,
    type ListingControls,
    type RoleFilter,
    type ScoreFilter,
    type SortMode,
} from '../utils/playerListing';
import { DropdownMenuSelect, type DropdownMenuOption } from './DropdownMenuSelect';
import { Icon } from './Icon';
import './PlayerListControls.css';

const ROLE_VALUES = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
const SCORE_VALUES = Array.from({ length: 10 }, (_, index) => String(index + 1));

interface PlayerListControlsProps {
    /** Controls with privacy mode and the catalogs already applied (see usePlayerListing). */
    controls: ListingControls;
    onChange: (update: ListingControlsUpdate) => void;
    privacyMode: boolean;
    /** The Teams tab. Without teams there is no team filter or team sort. */
    teams: TeamCatalog[];
    /** The Groups tab; null with a backend older than Sprint 6. Without groups, no group filter. */
    groups: GroupCatalog[] | null;
}

const byName = (a: string, b: string) => a.localeCompare(b);

/** One option per id, the first one, even if the sheet repeats an id by hand. */
function firstOfEachId<T>(items: readonly T[], idOf: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        const id = idOf(item);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

/**
 * Search, the role, score, team and group filters, and sort. Each menu shows what it chooses over
 * its value. On the phone the team and group menus get a row of their own, half and half, so a
 * long name fits (Sprint 7).
 */
export function PlayerListControls({ controls, onChange, privacyMode, teams, groups }: PlayerListControlsProps) {
    const t = useT();
    const showScoreDirection = !privacyMode && controls.sort === 'score';
    const isDescending = controls.scoreDirection === 'desc';
    const showTeams = teams.length > 0;
    const showGroups = (groups?.length ?? 0) > 0;

    // Last, the players switched off (Sprint 6): the only place they show.
    const roleOptions = useMemo<DropdownMenuOption[]>(
        () => [
            { value: 'all', label: t.controls.all },
            ...ROLE_VALUES.map((role) => ({ value: role, label: role })),
            { value: 'inactive', label: t.controls.inactive },
        ],
        [t],
    );
    const scoreOptions = useMemo<DropdownMenuOption[]>(
        () => [{ value: 'all', label: t.controls.all }, ...SCORE_VALUES.map((score) => ({ value: score, label: score }))],
        [t],
    );
    // Each team with its colours, by name; last, who has none, to see who is left to load.
    const teamOptions = useMemo<DropdownMenuOption[]>(
        () => [
            { value: 'all', label: t.controls.all },
            ...firstOfEachId(teams, (team) => team.teamId)
                .sort((a, b) => byName(a.name || a.teamId, b.name || b.teamId) || byName(a.teamId, b.teamId))
                .map((team) => ({
                    value: catalogFilter(team.teamId),
                    label: team.name || team.teamId,
                    colors: [
                        team.color1 || 'var(--team-default-1)',
                        team.color2 || team.color1 || 'var(--team-default-2)',
                    ] as const,
                })),
            { value: 'none', label: t.controls.noTeam },
        ],
        [t, teams],
    );
    const groupOptions = useMemo<DropdownMenuOption[]>(
        () => [
            { value: 'all', label: t.controls.all },
            ...firstOfEachId(groups ?? [], (group) => group.groupId)
                .sort((a, b) => byName(a.name || a.groupId, b.name || b.groupId) || byName(a.groupId, b.groupId))
                .map((group) => ({ value: catalogFilter(group.groupId), label: group.name || group.groupId })),
            { value: 'none', label: t.controls.noGroup },
        ],
        [t, groups],
    );
    // Privacy mode hides ratings, so it cannot sort by them; without teams, no team sort.
    const sortOptions = useMemo<DropdownMenuOption[]>(
        () =>
            [
                { value: 'none', label: t.controls.sortDefault },
                { value: 'selected', label: t.controls.sortSelected },
                { value: 'score', label: t.controls.sortScore },
                { value: 'position', label: t.controls.sortPosition },
                { value: 'shirt', label: t.controls.sortShirt },
                { value: 'team', label: t.controls.sortTeam },
            ].filter(
                (option) => (!privacyMode || option.value !== 'score') && (showTeams || option.value !== 'team'),
            ),
        [t, privacyMode, showTeams],
    );

    // Desktop puts the search and every menu in one row: it needs to know how many menus there are.
    const menuCount = 2 + Number(!privacyMode) + Number(showTeams) + Number(showGroups);
    const gridClassName = [
        'list-controls-grid',
        privacyMode ? 'list-controls-grid--privacy' : '',
        showTeams !== showGroups ? 'list-controls-grid--one-catalog' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="list-controls">
            <div className={gridClassName} style={{ '--menus': menuCount } as CSSProperties}>
                <div className="list-search-field">
                    <span className="list-search-icon" aria-hidden="true">
                        <Icon name="search" size={15} />
                    </span>
                    <input
                        type="text"
                        className="list-search-input"
                        placeholder=""
                        value={controls.query}
                        onChange={(event) => onChange({ query: event.target.value })}
                        aria-label={t.controls.search}
                    />
                </div>

                <DropdownMenuSelect
                    className="list-control"
                    value={controls.role}
                    options={roleOptions}
                    onChange={(value) => onChange({ role: value as RoleFilter })}
                    ariaLabel={t.controls.filterByRole}
                    caption={t.controls.role}
                />

                {!privacyMode && (
                    <DropdownMenuSelect
                        className="list-control"
                        value={controls.score}
                        options={scoreOptions}
                        onChange={(value) => onChange({ score: value as ScoreFilter })}
                        ariaLabel={t.controls.filterByScore}
                        caption={t.controls.score}
                    />
                )}

                {showTeams && (
                    <DropdownMenuSelect
                        className="list-control list-control--catalog"
                        value={controls.team}
                        options={teamOptions}
                        onChange={(value) => onChange({ team: value as CatalogFilter })}
                        ariaLabel={t.controls.filterByTeam}
                        caption={t.controls.team}
                    />
                )}

                {showGroups && (
                    <DropdownMenuSelect
                        className="list-control list-control--catalog"
                        value={controls.group}
                        options={groupOptions}
                        onChange={(value) => onChange({ group: value as CatalogFilter })}
                        ariaLabel={t.controls.filterByGroup}
                        caption={t.controls.group}
                    />
                )}

                <div className={`list-control list-sort-group ${showScoreDirection ? 'list-sort-group--with-toggle' : ''}`}>
                    <DropdownMenuSelect
                        value={controls.sort}
                        options={sortOptions}
                        onChange={(value) => onChange({ sort: value as SortMode })}
                        ariaLabel={t.controls.sortPlayers}
                        caption={t.controls.sort}
                    />

                    {showScoreDirection && (
                        <button
                            type="button"
                            className="list-sort-direction-toggle"
                            onClick={() =>
                                onChange((current) => ({
                                    scoreDirection: current.scoreDirection === 'desc' ? 'asc' : 'desc',
                                }))
                            }
                            aria-label={isDescending ? t.controls.highToLow : t.controls.lowToHigh}
                            title={isDescending ? t.controls.highToLow : t.controls.lowToHigh}
                        >
                            <Icon name={isDescending ? 'arrowDown' : 'arrowUp'} size={15} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
