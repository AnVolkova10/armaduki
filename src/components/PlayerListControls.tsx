import type { ListingControlsUpdate } from '../hooks/usePlayerListing';
import type { ListingControls, RoleFilter, ScoreFilter, SortMode } from '../utils/playerListing';
import { DropdownMenuSelect, type DropdownMenuOption } from './DropdownMenuSelect';
import './PlayerListControls.css';

const ROLE_FILTER_OPTIONS: DropdownMenuOption[] = [
    { value: 'all', label: 'Filter: all roles' },
    { value: 'GK', label: 'Filter: GK' },
    { value: 'FLEX', label: 'Filter: FLEX' },
    { value: 'DEF', label: 'Filter: DEF' },
    { value: 'MID', label: 'Filter: MID' },
    { value: 'ATT', label: 'Filter: ATT' },
];

const SCORE_FILTER_OPTIONS: DropdownMenuOption[] = [
    { value: 'all', label: 'Score: all' },
    ...Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: `Score: ${index + 1}` })),
];

const SORT_OPTIONS: DropdownMenuOption[] = [
    { value: 'none', label: 'Sort: none' },
    { value: 'selected', label: 'Sort: selected' },
    { value: 'score', label: 'Sort: score' },
    { value: 'position', label: 'Sort: position' },
];

// Privacy mode hides ratings, so it cannot sort by them.
const SORT_OPTIONS_PRIVACY = SORT_OPTIONS.filter((option) => option.value !== 'score');

interface PlayerListControlsProps {
    /** Controls with privacy mode already applied (see usePlayerListing). */
    controls: ListingControls;
    onChange: (update: ListingControlsUpdate) => void;
    privacyMode: boolean;
}

/** Search, role and score filters, and sort, shared by Players and Match. */
export function PlayerListControls({ controls, onChange, privacyMode }: PlayerListControlsProps) {
    const showScoreDirection = !privacyMode && controls.sort === 'score';
    const isDescending = controls.scoreDirection === 'desc';

    return (
        <div className="list-controls">
            <div className={`list-controls-grid ${privacyMode ? 'list-controls-grid--privacy' : ''}`}>
                <div className="list-search-field">
                    <span className="list-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M20 20l-4-4" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="list-search-input"
                        placeholder=""
                        value={controls.query}
                        onChange={(event) => onChange({ query: event.target.value })}
                        aria-label="Search players by nickname or name"
                    />
                </div>

                <DropdownMenuSelect
                    value={controls.role}
                    options={ROLE_FILTER_OPTIONS}
                    onChange={(value) => onChange({ role: value as RoleFilter })}
                    ariaLabel="Filter by role"
                />

                {!privacyMode && (
                    <DropdownMenuSelect
                        value={controls.score}
                        options={SCORE_FILTER_OPTIONS}
                        onChange={(value) => onChange({ score: value as ScoreFilter })}
                        ariaLabel="Filter by score"
                    />
                )}

                <div className={`list-sort-group ${showScoreDirection ? 'list-sort-group--with-toggle' : ''}`}>
                    <DropdownMenuSelect
                        value={controls.sort}
                        options={privacyMode ? SORT_OPTIONS_PRIVACY : SORT_OPTIONS}
                        onChange={(value) => onChange({ sort: value as SortMode })}
                        ariaLabel="Sort players"
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
                            aria-label={isDescending ? 'Score direction: high to low' : 'Score direction: low to high'}
                            title={isDescending ? 'Score: high -> low' : 'Score: low -> high'}
                        >
                            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                {isDescending ? (
                                    <path d="M12 5v14m0 0l5-5m-5 5l-5-5" />
                                ) : (
                                    <path d="M12 19V5m0 0l5 5m-5-5l-5 5" />
                                )}
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
