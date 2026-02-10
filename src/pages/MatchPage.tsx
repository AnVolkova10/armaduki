import { useEffect, useMemo, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonCard } from '../components/PersonCard';
import { TeamResult } from '../components/TeamResult';
import { ActionButton } from '../components/ActionButton';
import { DropdownMenuSelect } from '../components/DropdownMenuSelect';
import { generateTeams } from '../services/teamGenerator';
import { matchesWordPrefix, normalizeSearch } from '../utils/search';
import type { Person } from '../types';
import './MatchPage.css';

const ROLE_FILTER_OPTIONS = [
    { value: 'all', label: 'Filter: all roles' },
    { value: 'GK', label: 'Filter: GK' },
    { value: 'FLEX', label: 'Filter: FLEX' },
    { value: 'DEF', label: 'Filter: DEF' },
    { value: 'MID', label: 'Filter: MID' },
    { value: 'ATT', label: 'Filter: ATT' },
];

const SORT_OPTIONS = [
    { value: 'none', label: 'Sort: none' },
    { value: 'score', label: 'Sort: score' },
    { value: 'position', label: 'Sort: position' },
];

const SCORE_FILTER_OPTIONS = [
    { value: 'all', label: 'Score: all' },
    { value: '1', label: 'Score: 1' },
    { value: '2', label: 'Score: 2' },
    { value: '3', label: 'Score: 3' },
    { value: '4', label: 'Score: 4' },
    { value: '5', label: 'Score: 5' },
    { value: '6', label: 'Score: 6' },
    { value: '7', label: 'Score: 7' },
    { value: '8', label: 'Score: 8' },
    { value: '9', label: 'Score: 9' },
    { value: '10', label: 'Score: 10' },
];

const ROLE_SORT_PRIORITY: Record<Person['role'], number> = {
    GK: 0,
    FLEX: 1,
    DEF: 2,
    MID: 3,
    ATT: 4,
};

export function MatchPage() {
    const {
        people,
        selectedIds,
        isLoading,
        error,
        fetchPeople,
        toggleSelection,
        clearSelection,
        generatedTeams,
        setGeneratedTeams
    } = useAppStore();

    const [localError, setLocalError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [uiRoleFilter, setUiRoleFilter] = useState<'all' | Person['role']>('all');
    const [uiScoreFilter, setUiScoreFilter] = useState<'all' | `${number}`>('all');
    const [uiSortMode, setUiSortMode] = useState('none');
    const [uiScoreSortDirection, setUiScoreSortDirection] = useState<'desc' | 'asc'>('desc');

    const selectedCount = selectedIds.size;
    const canGenerate = selectedCount === 10;

    useEffect(() => {
        if (people.length === 0) {
            fetchPeople();
        }
    }, [fetchPeople, people.length]);

    const normalizedQuery = normalizeSearch(searchQuery);

    const searchedPeople = useMemo(() => {
        if (!normalizedQuery) return people;

        return people.filter((person) => {
            return (
                matchesWordPrefix(person.nickname || '', normalizedQuery) ||
                matchesWordPrefix(person.name || '', normalizedQuery)
            );
        });
    }, [normalizedQuery, people]);

    const roleFilteredPeople = useMemo(() => {
        if (uiRoleFilter === 'all') return searchedPeople;
        return searchedPeople.filter((person) => person.role === uiRoleFilter);
    }, [searchedPeople, uiRoleFilter]);

    const filteredPeople = useMemo(() => {
        if (uiScoreFilter === 'all') return roleFilteredPeople;
        const targetScore = Number(uiScoreFilter);
        return roleFilteredPeople.filter((person) => person.rating === targetScore);
    }, [roleFilteredPeople, uiScoreFilter]);

    const visiblePeople = useMemo(() => {
        if (uiSortMode === 'none') return filteredPeople;

        const sorted = [...filteredPeople];
        if (uiSortMode === 'score') {
            if (uiScoreSortDirection === 'desc') {
                sorted.sort((a, b) => (b.rating - a.rating) || a.nickname.localeCompare(b.nickname));
                return sorted;
            }
            sorted.sort((a, b) => (a.rating - b.rating) || a.nickname.localeCompare(b.nickname));
            return sorted;
        }

        if (uiSortMode === 'position') {
            sorted.sort((a, b) => {
                const roleDiff = ROLE_SORT_PRIORITY[a.role] - ROLE_SORT_PRIORITY[b.role];
                if (roleDiff !== 0) return roleDiff;
                return a.nickname.localeCompare(b.nickname);
            });
            return sorted;
        }

        return sorted;
    }, [filteredPeople, uiScoreSortDirection, uiSortMode]);

    const hasActiveSearchOrFilter =
        Boolean(normalizedQuery) || uiRoleFilter !== 'all' || uiScoreFilter !== 'all';

    const handleGenerate = () => {
        setLocalError(null);
        setGeneratedTeams(null);

        if (selectedCount !== 10) {
            setLocalError(`Select exactly 10 players. Selected: ${selectedCount}`);
            return;
        }

        const selectedPeople = people.filter(p => selectedIds.has(p.id));
        const teams = generateTeams(selectedPeople);

        if (teams) {
            setGeneratedTeams(teams);
        } else {
            setLocalError('Could not generate valid teams. Check roles and goalkeeper availability.');
        }
    };

    const handleClear = () => {
        clearSelection();
        setLocalError(null);
    };

    return (
        <div className="match-page">
            <div className="page-header">
                <h2>Match Setup</h2>
                <div className="header-actions">
                    <span className="selection-count">
                        {selectedCount}/10 selected
                    </span>
                    <ActionButton variant="neutral" tone="light" onClick={handleClear}>
                        Clear Selection
                    </ActionButton>
                    <ActionButton
                        variant="primary"
                        className="generate-teams-btn"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                    >
                        Generate Teams
                    </ActionButton>
                </div>
            </div>

            <div className="match-controls">
                <div className="match-controls-grid">
                    <div className="match-search-field">
                        <span className="match-search-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="M20 20l-4-4" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            className="match-search-input"
                            placeholder=""
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            aria-label="Search players by nickname or name"
                        />
                    </div>

                    <DropdownMenuSelect
                        value={uiRoleFilter}
                        options={ROLE_FILTER_OPTIONS}
                        onChange={(value) => setUiRoleFilter(value as 'all' | Person['role'])}
                        ariaLabel="Filter by role"
                    />

                    <DropdownMenuSelect
                        value={uiScoreFilter}
                        options={SCORE_FILTER_OPTIONS}
                        onChange={(value) => setUiScoreFilter(value as 'all' | `${number}`)}
                        ariaLabel="Filter by score"
                    />

                    <div
                        className={`match-sort-group ${
                            uiSortMode === 'score' ? 'match-sort-group--with-toggle' : ''
                        }`}
                    >
                        <DropdownMenuSelect
                            value={uiSortMode}
                            options={SORT_OPTIONS}
                            onChange={setUiSortMode}
                            ariaLabel="Sort players"
                        />

                        {uiSortMode === 'score' && (
                            <button
                                type="button"
                                className="match-sort-direction-toggle"
                                onClick={() =>
                                    setUiScoreSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                                }
                                aria-label={
                                    uiScoreSortDirection === 'desc'
                                        ? 'Score direction: high to low'
                                        : 'Score direction: low to high'
                                }
                                title={
                                    uiScoreSortDirection === 'desc'
                                        ? 'Score: high -> low'
                                        : 'Score: low -> high'
                                }
                            >
                                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                    {uiScoreSortDirection === 'desc' ? (
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

            {isLoading ? (
                <div className="loading">Loading from Google Sheets...</div>
            ) : people.length === 0 ? (
                <div className="empty-state">
                    <p>No players available. Go to the Players page to add some.</p>
                </div>
            ) : visiblePeople.length === 0 ? (
                <div className="empty-state">
                    <p>No players match current controls.</p>
                    <p>
                        {hasActiveSearchOrFilter
                            ? 'Try another search prefix or role/score filter.'
                            : 'Try adjusting search, filter, or sort.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="people-grid">
                        {visiblePeople.map(person => (
                            <PersonCard
                                key={person.id}
                                person={person}
                                selected={selectedIds.has(person.id)}
                                onSelect={() => toggleSelection(person.id)}
                                selectable
                            />
                        ))}
                    </div>
                </>
            )}

            {!isLoading && people.length > 0 && (
                <div className="match-count">
                    {normalizedQuery || uiRoleFilter !== 'all' || uiScoreFilter !== 'all'
                        ? `Showing ${visiblePeople.length} of ${people.length} players`
                        : `Total: ${people.length} players`}
                </div>
            )}

            {error && <div className="error">{error}</div>}
            {localError && <div className="error">{localError}</div>}
            {generatedTeams && <TeamResult result={generatedTeams} />}
        </div>
    );
}
