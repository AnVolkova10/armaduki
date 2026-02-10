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
    const [uiRoleFilter, setUiRoleFilter] = useState('all');
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

    const visiblePeople = useMemo(() => {
        if (uiSortMode === 'none') return searchedPeople;

        const sorted = [...searchedPeople];
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
    }, [searchedPeople, uiScoreSortDirection, uiSortMode]);

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
                    <input
                        type="text"
                        className="match-search-input"
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        aria-label="Search players by nickname or name"
                    />

                    <DropdownMenuSelect
                        value={uiRoleFilter}
                        options={ROLE_FILTER_OPTIONS}
                        onChange={setUiRoleFilter}
                        ariaLabel="Filter by role"
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
                    <p>No players match this search.</p>
                    <p>Try another prefix (for example: a, an, ma).</p>
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
                    {normalizedQuery
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
