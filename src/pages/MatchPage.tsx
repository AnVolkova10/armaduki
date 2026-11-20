import { useEffect, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonCard } from '../components/PersonCard';
import { TeamResult } from '../components/TeamResult';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlayerListControls } from '../components/PlayerListControls';
import { SheetLoader } from '../components/SheetLoader';
import { usePlayerListing } from '../hooks/usePlayerListing';
import { generateTeams } from '../services/teamGenerator';
import './MatchPage.css';

interface ConfirmState {
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'default' | 'danger';
    onConfirm: () => Promise<void> | void;
}

export function MatchPage() {
    const {
        people,
        selectedIds,
        peopleStatus,
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
    } = useAppStore();
    const isLoading = peopleStatus === 'loading';
    const isLoaded = peopleStatus === 'loaded';

    const [localError, setLocalError] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [showClearMenu, setShowClearMenu] = useState(false);
    const clearMenuRef = useRef<HTMLDivElement | null>(null);
    const previousSelectedCountRef = useRef<number | null>(null);
    const resultRef = useRef<HTMLDivElement | null>(null);
    const shouldScrollToResultRef = useRef(false);
    const { controls, updateControls, resetControls, visiblePeople, isFiltered } = usePlayerListing(
        people,
        selectedIds,
        privacyMode,
    );

    const selectedCount = selectedIds.size;
    const canGenerate = selectedCount === 10;
    const selectionCountClassName = [
        'selection-count',
        selectedCount === 10 ? 'selection-count--complete' : '',
        selectedCount > 10 ? 'selection-count--over' : '',
    ].filter(Boolean).join(' ');

    // One request loads players and the Teams catalog (see fetchPeople).
    useEffect(() => {
        if (peopleStatus === 'idle') {
            void fetchPeople();
        }
    }, [fetchPeople, peopleStatus]);

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

    useEffect(() => {
        const previousSelectedCount = previousSelectedCountRef.current;
        previousSelectedCountRef.current = selectedCount;

        if (previousSelectedCount !== null && selectedCount === 10 && previousSelectedCount !== 10) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [selectedCount]);

    useEffect(() => {
        if (!generatedTeams || !shouldScrollToResultRef.current) return;

        shouldScrollToResultRef.current = false;
        window.requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [generatedTeams]);

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
            shouldScrollToResultRef.current = true;
            setGeneratedTeams(teams);
        } else {
            shouldScrollToResultRef.current = false;
            setLocalError('Could not generate valid teams. Check roles and goalkeeper availability.');
        }
    };

    const handlePersonSelect = (id: string) => {
        const alreadySelected = selectedIds.has(id);
        if (!alreadySelected && selectedCount >= 10) return;
        toggleSelection(id);
    };

    const handleClearSelection = () => {
        clearSelection();
        setLocalError(null);
        setShowClearMenu(false);
    };

    const handleClearFilters = () => {
        setShowClearMenu(false);
        resetControls();
    };

    const requestConfirm = (state: ConfirmState) => {
        setConfirmState(state);
        setShowClearMenu(false);
    };

    const handleConfirmCancel = () => {
        setConfirmState(null);
    };

    const handleConfirmAccept = () => {
        if (!confirmState) return;

        const confirmAction = confirmState.onConfirm;
        setConfirmState(null);

        void Promise.resolve()
            .then(() => confirmAction())
            .catch((confirmError) => {
                console.error('Confirm action failed:', confirmError);
            });
    };

    const handleClearAllRelationships = () => {
        requestConfirm({
            title: 'Clear Links?',
            message: 'This will remove every positive and negative relationship for all players.',
            confirmLabel: 'Clear Links',
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
                    <span className={selectionCountClassName} aria-live="polite">
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
                                    Clear Links
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

            <PlayerListControls controls={controls} onChange={updateControls} privacyMode={privacyMode} />

            {isLoading ? (
                <div className="loading-shell">
                    <SheetLoader ariaLabel="Loading players from Google Sheets" />
                </div>
            ) : people.length === 0 ? (
                isLoaded && (
                    <div className="empty-state">
                        <p>No players available. Go to the Players page to add some.</p>
                    </div>
                )
            ) : visiblePeople.length === 0 ? (
                <div className="empty-state">
                    <p>No players match current controls.</p>
                    <p>
                        {isFiltered
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
                                selectionDisabled={!selectedIds.has(person.id) && selectedCount >= 10}
                                onSelect={() => handlePersonSelect(person.id)}
                                selectable
                            />
                        ))}
                    </div>
                </>
            )}

            {isLoaded && people.length > 0 && (
                <div className="match-count">
                    {isFiltered
                        ? `Showing ${visiblePeople.length} of ${people.length} players`
                        : `Total: ${people.length} players`}
                </div>
            )}

            {error && (
                <div className="error">
                    {error}
                    {peopleStatus === 'error' && (
                        <button className="btn btn-secondary" onClick={() => void fetchPeople()}>
                            Retry
                        </button>
                    )}
                </div>
            )}
            {localError && <div className="error">{localError}</div>}
            {generatedTeams && (
                <div ref={resultRef} className="team-result-scroll-anchor">
                    <TeamResult result={generatedTeams} />
                </div>
            )}

            <ConfirmDialog
                open={Boolean(confirmState)}
                title={confirmState?.title || ''}
                message={confirmState?.message || ''}
                confirmLabel={confirmState?.confirmLabel || 'Confirm'}
                tone={confirmState?.tone || 'default'}
                onCancel={handleConfirmCancel}
                onConfirm={handleConfirmAccept}
            />
        </div>
    );
}
