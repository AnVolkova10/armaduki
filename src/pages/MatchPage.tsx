import { useEffect, useMemo, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonCard } from '../components/PersonCard';
import { TeamResult } from '../components/TeamResult';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DropdownMenuSelect } from '../components/DropdownMenuSelect';
import { generateTeams } from '../services/teamGenerator';
import { matchesWordPrefix, normalizeSearch } from '../utils/search';
import type { Person } from '../types';
import './MatchPage.css';

interface ConfirmState {
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'default' | 'danger';
    onConfirm: () => Promise<void> | void;
}

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

const SORT_OPTIONS_PRIVACY = [
    { value: 'none', label: 'Sort: none' },
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
        setGeneratedTeams,
        clearAllRelationships,
        clearWantsRelationships,
        clearAvoidsRelationships,
        privacyMode,
        syncStatus,
        syncMessage,
        clearSyncState,
    } = useAppStore();

    const [localError, setLocalError] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [uiRoleFilter, setUiRoleFilter] = useState<'all' | Person['role']>('all');
    const [uiScoreFilter, setUiScoreFilter] = useState<'all' | `${number}`>('all');
    const [uiSortMode, setUiSortMode] = useState('none');
    const [uiScoreSortDirection, setUiScoreSortDirection] = useState<'desc' | 'asc'>('desc');
    const [showClearMenu, setShowClearMenu] = useState(false);
    const clearMenuRef = useRef<HTMLDivElement | null>(null);

    const selectedCount = selectedIds.size;
    const canGenerate = selectedCount === 10;

    useEffect(() => {
        if (people.length === 0) {
            fetchPeople();
        }
    }, [fetchPeople, people.length]);

    useEffect(() => {
        if (!privacyMode) return;
        if (uiScoreFilter !== 'all') setUiScoreFilter('all');
        if (uiSortMode === 'score') setUiSortMode('none');
        if (uiScoreSortDirection !== 'desc') setUiScoreSortDirection('desc');
    }, [privacyMode, uiScoreFilter, uiScoreSortDirection, uiSortMode]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!showClearMenu) return;
            const target = event.target as Node;
            if (!clearMenuRef.current?.contains(target)) {
                setShowClearMenu(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, [showClearMenu]);

    const normalizedQuery = normalizeSearch(searchQuery);
    const availableSortOptions = privacyMode ? SORT_OPTIONS_PRIVACY : SORT_OPTIONS;

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
        if (privacyMode || uiScoreFilter === 'all') return roleFilteredPeople;
        const targetScore = Number(uiScoreFilter);
        return roleFilteredPeople.filter((person) => person.rating === targetScore);
    }, [privacyMode, roleFilteredPeople, uiScoreFilter]);

    const visiblePeople = useMemo(() => {
        if (uiSortMode === 'none' || (privacyMode && uiSortMode === 'score')) return filteredPeople;

        const sorted = [...filteredPeople];
        if (uiSortMode === 'score' && !privacyMode) {
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
    }, [filteredPeople, privacyMode, uiScoreSortDirection, uiSortMode]);

    const hasActiveSearchOrFilter =
        Boolean(normalizedQuery) || uiRoleFilter !== 'all' || (!privacyMode && uiScoreFilter !== 'all');

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

    const handleClearSelection = () => {
        clearSelection();
        setLocalError(null);
        setShowClearMenu(false);
    };

    const handleClearFilters = () => {
        setShowClearMenu(false);
        setSearchQuery('');
        setUiRoleFilter('all');
        setUiScoreFilter('all');
        setUiSortMode('none');
        setUiScoreSortDirection('desc');
    };

    const requestConfirm = (state: ConfirmState) => {
        setConfirmState(state);
        setShowClearMenu(false);
    };

    const handleConfirmCancel = () => {
        if (isConfirming) return;
        setConfirmState(null);
    };

    const handleConfirmAccept = async () => {
        if (!confirmState) return;
        setIsConfirming(true);
        try {
            await confirmState.onConfirm();
        } finally {
            setIsConfirming(false);
            setConfirmState(null);
        }
    };

    const handleClearAllRelationships = () => {
        requestConfirm({
            title: 'Clear all links?',
            message: 'This will remove every positive and negative relationship for all players.',
            confirmLabel: 'Clear All',
            tone: 'danger',
            onConfirm: () => clearAllRelationships(),
        });
    };

    const handleClearWantsRelationships = () => {
        requestConfirm({
            title: 'Clear positive links?',
            message: 'This will remove all wants links for every player.',
            confirmLabel: 'Clear Wants',
            tone: 'danger',
            onConfirm: () => clearWantsRelationships(),
        });
    };

    const handleClearAvoidsRelationships = () => {
        requestConfirm({
            title: 'Clear negative links?',
            message: 'This will remove all avoids links for every player.',
            confirmLabel: 'Clear Avoids',
            tone: 'danger',
            onConfirm: () => clearAvoidsRelationships(),
        });
    };

    return (
        <div className="match-page">
            <div className="page-header">
                <h2>Match Setup</h2>
                <div className="header-actions">
                    <span className="selection-count">
                        {selectedCount}/10 selected
                    </span>
                    <div className="relationship-actions" ref={clearMenuRef}>
                        <ActionButton
                            variant="neutral"
                            tone="light"
                            className="clear-links-trigger"
                            onClick={() => setShowClearMenu((prev) => !prev)}
                            disabled={people.length === 0 && selectedCount === 0}
                            aria-expanded={showClearMenu}
                            aria-haspopup="menu"
                        >
                            Clear
                            <span className="clear-links-caret" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </span>
                        </ActionButton>

                        {showClearMenu && (
                            <div className="clear-links-menu" role="menu">
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--light"
                                    onClick={handleClearSelection}
                                >
                                    Clear Selection
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--light"
                                    onClick={handleClearFilters}
                                >
                                    Clear Filters
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--positive"
                                    onClick={handleClearWantsRelationships}
                                >
                                    Clear Wants
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--negative"
                                    onClick={handleClearAvoidsRelationships}
                                >
                                    Clear Avoids
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--light"
                                    onClick={handleClearAllRelationships}
                                >
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>
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
                <div className={`match-controls-grid ${privacyMode ? 'match-controls-grid--privacy' : ''}`}>
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

                    {!privacyMode && (
                        <DropdownMenuSelect
                            value={uiScoreFilter}
                            options={SCORE_FILTER_OPTIONS}
                            onChange={(value) => setUiScoreFilter(value as 'all' | `${number}`)}
                            ariaLabel="Filter by score"
                        />
                    )}

                    <div
                        className={`match-sort-group ${
                            !privacyMode && uiSortMode === 'score' ? 'match-sort-group--with-toggle' : ''
                        }`}
                    >
                        <DropdownMenuSelect
                            value={uiSortMode}
                            options={availableSortOptions}
                            onChange={setUiSortMode}
                            ariaLabel="Sort players"
                        />

                        {!privacyMode && uiSortMode === 'score' && (
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
                    {normalizedQuery || uiRoleFilter !== 'all' || (!privacyMode && uiScoreFilter !== 'all')
                        ? `Showing ${visiblePeople.length} of ${people.length} players`
                        : `Total: ${people.length} players`}
                </div>
            )}

            {error && <div className="error">{error}</div>}
            {localError && <div className="error">{localError}</div>}
            {syncStatus === 'error' && syncMessage && (
                <div className="error">
                    {syncMessage}
                    <button className="btn btn-secondary" onClick={clearSyncState}>
                        &times;
                    </button>
                </div>
            )}
            {generatedTeams && <TeamResult result={generatedTeams} />}

            <ConfirmDialog
                open={Boolean(confirmState)}
                title={confirmState?.title || ''}
                message={confirmState?.message || ''}
                confirmLabel={confirmState?.confirmLabel || 'Confirm'}
                tone={confirmState?.tone || 'default'}
                loading={isConfirming}
                onCancel={handleConfirmCancel}
                onConfirm={handleConfirmAccept}
            />
        </div>
    );
}
