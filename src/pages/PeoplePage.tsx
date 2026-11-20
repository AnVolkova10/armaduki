import { useEffect, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonForm } from '../components/PersonForm';
import { PersonCard } from '../components/PersonCard';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlayerListControls } from '../components/PlayerListControls';
import { SheetLoader } from '../components/SheetLoader';
import { usePlayerListing } from '../hooks/usePlayerListing';
import type { Person } from '../types';
import './PeoplePage.css';

interface ConfirmState {
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'default' | 'danger';
    onConfirm: () => Promise<void> | void;
}

export function PeoplePage() {
    const {
        people,
        selectedIds,
        peopleStatus,
        error,
        fetchPeople,
        fetchTeamsCatalog,
        teamsCatalogLoaded,
        isTeamsCatalogLoading,
        addPerson,
        updatePerson,
        deletePerson,
        clearAllRelationships,
        clearWantsRelationships,
        clearAvoidsRelationships,
        setError,
        privacyMode,
    } = useAppStore();
    const isLoading = peopleStatus === 'loading';
    const isLoaded = peopleStatus === 'loaded';

    const [showForm, setShowForm] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>();
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [showClearLinksMenu, setShowClearLinksMenu] = useState(false);
    const clearLinksMenuRef = useRef<HTMLDivElement | null>(null);
    const { controls, updateControls, resetControls, visiblePeople, isFiltered } = usePlayerListing(
        people,
        selectedIds,
        privacyMode,
    );

    useEffect(() => {
        if (peopleStatus === 'idle') {
            void fetchPeople();
        }
    }, [fetchPeople, peopleStatus]);

    useEffect(() => {
        if (!teamsCatalogLoaded && !isTeamsCatalogLoading) {
            fetchTeamsCatalog();
        }
    }, [fetchTeamsCatalog, isTeamsCatalogLoading, teamsCatalogLoaded]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!showClearLinksMenu) return;

            const target = event.target as Node;
            if (!clearLinksMenuRef.current?.contains(target)) {
                setShowClearLinksMenu(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, [showClearLinksMenu]);

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

    const handleClearAllRelationships = () => {
        setShowClearLinksMenu(false);
        requestConfirm({
            title: 'Clear Links?',
            message: 'This will remove every positive and negative relationship for all players.',
            confirmLabel: 'Clear Links',
            tone: 'danger',
            onConfirm: () => clearAllRelationships(),
        });
    };

    const handleClearWantsRelationships = () => {
        setShowClearLinksMenu(false);
        requestConfirm({
            title: 'Clear positive links?',
            message: 'This will remove all wants links for every player.',
            confirmLabel: 'Clear Wants',
            tone: 'danger',
            onConfirm: () => clearWantsRelationships(),
        });
    };

    const handleClearAvoidsRelationships = () => {
        setShowClearLinksMenu(false);
        requestConfirm({
            title: 'Clear negative links?',
            message: 'This will remove all avoids links for every player.',
            confirmLabel: 'Clear Avoids',
            tone: 'danger',
            onConfirm: () => clearAvoidsRelationships(),
        });
    };

    const handleClearFilters = () => {
        setShowClearLinksMenu(false);
        resetControls();
    };

    return (
        <div className="people-page">
            <div className="page-header">
                <h2>Players</h2>
                <div className="header-actions">
                    <div className="relationship-actions" ref={clearLinksMenuRef}>
                        <ActionButton
                            variant="neutral"
                            tone="light"
                            className="clear-links-trigger"
                            onClick={() => setShowClearLinksMenu((prev) => !prev)}
                            disabled={people.length === 0}
                            aria-expanded={showClearLinksMenu}
                            aria-haspopup="menu"
                        >
                            Clear
                            <span className="clear-links-caret" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </span>
                        </ActionButton>

                        {showClearLinksMenu && (
                            <div className="clear-links-menu" role="menu">
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
                        onClick={() => setShowForm(true)}
                        disabled={!isLoaded}
                        title={isLoaded ? undefined : 'Players must load from Google Sheets first'}
                    >
                        + Add Player
                    </ActionButton>
                </div>
            </div>

            <PlayerListControls controls={controls} onChange={updateControls} privacyMode={privacyMode} />

            {isLoading && (
                <div className="loading-shell">
                    <SheetLoader ariaLabel="Loading players from Google Sheets" />
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
                    <button className="btn btn-secondary" onClick={() => setError(null)} aria-label="Dismiss error">
                        &times;
                    </button>
                </div>
            )}

            {isLoaded && people.length === 0 ? (
                <div className="empty-state">
                    <p>No players yet.</p>
                    <p className="hint">
                        Data is loaded from Google Sheets. You can add players manually or edit the spreadsheet.
                    </p>
                </div>
            ) : people.length > 0 && visiblePeople.length === 0 ? (
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
                            selected={selectedIds.has(person.id)}
                            showMatchBadge
                            onEdit={() => handleEdit(person)}
                            onDelete={() => handleDelete(person.id)}
                        />
                    ))}
                </div>
            )}

            {isLoaded && (
                <div className="people-count">
                    {isFiltered
                        ? `Showing ${visiblePeople.length} of ${people.length} players`
                        : `Total: ${people.length} players`}
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
