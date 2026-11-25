import { useMemo } from 'react';
import type { ListingControlsUpdate } from '../hooks/usePlayerListing';
import { useT } from '../i18n';
import type { ListingControls, RoleFilter, ScoreFilter, SortMode } from '../utils/playerListing';
import { DropdownMenuSelect, type DropdownMenuOption } from './DropdownMenuSelect';
import { Icon } from './Icon';
import './PlayerListControls.css';

const ROLE_VALUES = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
const SCORE_VALUES = Array.from({ length: 10 }, (_, index) => String(index + 1));

interface PlayerListControlsProps {
    /** Controls with privacy mode already applied (see usePlayerListing). */
    controls: ListingControls;
    onChange: (update: ListingControlsUpdate) => void;
    privacyMode: boolean;
}

/** Search, role and score filters, and sort. Each menu shows what it chooses over its value. */
export function PlayerListControls({ controls, onChange, privacyMode }: PlayerListControlsProps) {
    const t = useT();
    const showScoreDirection = !privacyMode && controls.sort === 'score';
    const isDescending = controls.scoreDirection === 'desc';

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
    // Privacy mode hides ratings, so it cannot sort by them.
    const sortOptions = useMemo<DropdownMenuOption[]>(
        () =>
            [
                { value: 'none', label: t.controls.sortDefault },
                { value: 'selected', label: t.controls.sortSelected },
                { value: 'score', label: t.controls.sortScore },
                { value: 'position', label: t.controls.sortPosition },
            ].filter((option) => !privacyMode || option.value !== 'score'),
        [t, privacyMode],
    );

    return (
        <div className="list-controls">
            <div className={`list-controls-grid ${privacyMode ? 'list-controls-grid--privacy' : ''}`}>
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
                    value={controls.role}
                    options={roleOptions}
                    onChange={(value) => onChange({ role: value as RoleFilter })}
                    ariaLabel={t.controls.filterByRole}
                    caption={t.controls.role}
                />

                {!privacyMode && (
                    <DropdownMenuSelect
                        value={controls.score}
                        options={scoreOptions}
                        onChange={(value) => onChange({ score: value as ScoreFilter })}
                        ariaLabel={t.controls.filterByScore}
                        caption={t.controls.score}
                    />
                )}

                <div className={`list-sort-group ${showScoreDirection ? 'list-sort-group--with-toggle' : ''}`}>
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
