import { useEffect, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PersonCard } from '../components/PersonCard';
import { PersonForm } from '../components/PersonForm';
import { PlayerListControls } from '../components/PlayerListControls';
import { SheetLoader } from '../components/SheetLoader';
import { TeamResult } from '../components/TeamResult';
import { usePlayerListing } from '../hooks/usePlayerListing';
import { generateTeams } from '../services/teamGenerator';
import type { Person } from '../types';
import './PlayersPage.css';

const MATCH_SIZE = 10;

interface ConfirmState {
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'default' | 'danger';
    onConfirm: () => Promise<void> | void;
}

/**
 * The app's only screen (Players and Match became one on 19/11/2026): tap a card to pick it
 * for the match, edit or delete it with the card icons, and the teams show up below the list.
 */
export function PlayersPage() {
    const {
        people,
        selectedIds,
        peopleStatus,
        error,
        fetchPeople,
        addPerson,
        updatePerson,
        deletePerson,
        toggleSelection,
        clearSelection,
        generatedTeams,
        setGeneratedTeams,
        clearAllRelationships,
        clearWantsRelationships,
        clearAvoidsRelationships,
        setError,
        privacyMode,
        access,
        isFresh,
        isReading,
    } = useAppStore();
    const isLoading = peopleStatus === 'loading';
    const isLoaded = peopleStatus === 'loaded';
    // Opened from the copy saved on this device: picking works at once, editing waits for the sheet.
    const canEdit = isLoaded && isFresh;

    const [showForm, setShowForm] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>();
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
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
    const canGenerate = selectedCount === MATCH_SIZE;
    const selectionCountClassName = [
        'selection-count',
        selectedCount === MATCH_SIZE ? 'selection-count--complete' : '',
        selectedCount > MATCH_SIZE ? 'selection-count--over' : '',
    ].filter(Boolean).join(' ');

    // One request loads players and the Teams catalog (see fetchPeople). It also runs behind a
    // saved copy, until the sheet has answered once in this visit.
    useEffect(() => {
        if (access !== 'locked' && !isFresh && peopleStatus !== 'loading' && peopleStatus !== 'error') {
            void fetchPeople();
        }
    }, [access, fetchPeople, isFresh, peopleStatus]);

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

    // With the tenth pick, go back up to "Generate Teams".
    useEffect(() => {
        const previousSelectedCount = previousSelectedCountRef.current;
        previousSelectedCountRef.current = selectedCount;

        if (previousSelectedCount !== null && selectedCount === MATCH_SIZE && previousSelectedCount !== MATCH_SIZE) {
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

        if (selectedCount !== MATCH_SIZE) {
            setLocalError(`Select exactly 10 players. Selected: ${selectedCount}`);
            return;
        }

        const selectedPeople = people.filter((person) => selectedIds.has(person.id));
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
        if (!alreadySelected && selectedCount >= MATCH_SIZE) return;
        toggleSelection(id);
    };

    const handleSave = (person: Person) => {
        if (editingPerson) {
            void updatePerson(person);
        } else {
            void addPerson(person);
        }
        setShowForm(false);
        setEditingPerson(undefined);
    };

    const handleEdit = (person: Person) => {
        setEditingPerson(person);
        setShowForm(true);
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

    const handleDelete = (id: string) => {
        requestConfirm({
            title: 'Delete player?',
            message: 'This will remove the player from this app and from the sheet.',
            confirmLabel: 'Delete',
            tone: 'danger',
            onConfirm: () => deletePerson(id),
        });
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
        <div className="players-page">
            <div className="page-header">
                <div className="page-title-row">
                    <h2>Players</h2>
                    <ActionButton
                        variant="primary"
                        onClick={() => setShowForm(true)}
                        disabled={!canEdit}
                        title={canEdit ? undefined : 'Players must load from Google Sheets first'}
                    >
                        + Add Player
                    </ActionButton>
                </div>
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
                                    disabled={!canEdit}
                                    onClick={handleClearWantsRelationships}
                                >
                                    Clear Wants
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--negative"
                                    disabled={!canEdit}
                                    onClick={handleClearAvoidsRelationships}
                                >
                                    Clear Avoids
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--light"
                                    disabled={!canEdit}
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

            {error && (
                <div className="error">
                    {error}
                    {(peopleStatus === 'error' || !isFresh) && (
                        <button className="btn btn-secondary" onClick={() => void fetchPeople()}>
                            Retry
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => setError(null)} aria-label="Dismiss error">
                        &times;
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="loading-shell">
                    <SheetLoader ariaLabel="Loading players from Google Sheets" />
                </div>
            ) : people.length === 0 ? (
                isLoaded && (
                    <div className="empty-state">
                        <p>No players yet.</p>
                        <p className="hint">
                            Data is loaded from Google Sheets. You can add players manually or edit the spreadsheet.
                        </p>
                    </div>
                )
            ) : visiblePeople.length === 0 ? (
                <div className="empty-state">
                    <p>No players match current controls.</p>
                    <p className="hint">
                        {isFiltered
                            ? 'Try another search prefix or role/score filter.'
                            : 'Try adjusting search, filter, or sort.'}
                    </p>
                </div>
            ) : (
                <div className="people-grid">
                    {visiblePeople.map((person) => (
                        <PersonCard
                            key={person.id}
                            person={person}
                            selectable
                            selected={selectedIds.has(person.id)}
                            selectionDisabled={!selectedIds.has(person.id) && selectedCount >= MATCH_SIZE}
                            onSelect={() => handlePersonSelect(person.id)}
                            onEdit={() => handleEdit(person)}
                            onDelete={() => handleDelete(person.id)}
                            actionsDisabled={!canEdit}
                        />
                    ))}
                </div>
            )}

            {isLoaded && people.length > 0 && (
                <div className="players-count">
                    {/* On a saved copy: either the refresh is running, or it failed and can be asked again here. */}
                    {!isFresh && isReading && <span className="players-refreshing">Updating from Google Sheets... </span>}
                    {!isFresh && !isReading && (
                        <button type="button" className="players-refresh" onClick={() => void fetchPeople()}>
                            Saved copy · Refresh
                        </button>
                    )}
                    {isFiltered
                        ? `Showing ${visiblePeople.length} of ${people.length} players`
                        : `Total: ${people.length} players`}
                </div>
            )}

            {localError && <div className="error">{localError}</div>}
            {generatedTeams && (
                <div ref={resultRef} className="team-result-scroll-anchor">
                    <TeamResult result={generatedTeams} />
                </div>
            )}

            {showForm && (
                <PersonForm
                    person={editingPerson}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingPerson(undefined);
                    }}
                />
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
