import { useEffect, useMemo, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { PersonCard } from '../components/PersonCard';
import { PersonForm } from '../components/PersonForm';
import { PlayerListControls } from '../components/PlayerListControls';
import { SheetLoader } from '../components/SheetLoader';
import { TeamResult } from '../components/TeamResult';
import { useFlipList } from '../hooks/useFlipList';
import { usePlayerListing } from '../hooks/usePlayerListing';
import { useT } from '../i18n';
import { generateTeams } from '../services/teamGenerator';
import type { Person } from '../types';
import { scrollBehavior } from '../utils/motion';
import type { ListingCatalogs } from '../utils/playerListing';
import './PlayersPage.css';

const MATCH_SIZE = 10;
const DOTS = Array.from({ length: MATCH_SIZE }, (_, index) => index);

interface ConfirmState {
    title: string;
    message: string;
    confirmLabel: string;
    tone: 'default' | 'danger';
    onConfirm: () => Promise<void> | void;
}

/** A problem with the selection itself, kept as data so it follows the language. */
type LocalError = { kind: 'count'; selected: number } | { kind: 'noTeams' };

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
        teamsCatalog,
        groupsCatalog,
    } = useAppStore();
    const t = useT();
    const isLoading = peopleStatus === 'loading';
    const isLoaded = peopleStatus === 'loaded';
    // Opened from the copy saved on this device: picking works at once, editing waits for the sheet.
    const canEdit = isLoaded && isFresh;

    const [showForm, setShowForm] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>();
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [localError, setLocalError] = useState<LocalError | null>(null);
    const [showClearMenu, setShowClearMenu] = useState(false);
    // Counts the results generated, so each one is dealt again even with the same players.
    const [generation, setGeneration] = useState(0);
    const clearMenuRef = useRef<HTMLDivElement | null>(null);
    const previousSelectedCountRef = useRef<number | null>(null);
    const resultRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const shouldScrollToResultRef = useRef(false);
    // Team and group names for the filters and the team sort (Sprint 7).
    const catalogs = useMemo<ListingCatalogs>(
        () => ({
            teams: new Map(teamsCatalog.map((team) => [team.teamId, team.name])),
            groups: new Map((groupsCatalog ?? []).map((group) => [group.groupId, group.name])),
        }),
        [teamsCatalog, groupsCatalog],
    );
    const { controls, updateControls, resetControls, visiblePeople, isFiltered } = usePlayerListing(
        people,
        selectedIds,
        privacyMode,
        MATCH_SIZE,
        catalogs,
    );
    // The same cards in another order travel to their new place (the picks going to the top).
    useFlipList(gridRef, visiblePeople.map((person) => person.id).join(','));

    const selectedCount = selectedIds.size;
    const canGenerate = selectedCount === MATCH_SIZE;
    // The total counts who can play: the inactive ones have their own filter.
    const activeCount = people.filter((person) => person.active !== false).length;
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

    // With the tenth pick, go back up to "Generate Teams" (the picks go to the top of the list too).
    useEffect(() => {
        const previousSelectedCount = previousSelectedCountRef.current;
        previousSelectedCountRef.current = selectedCount;

        if (previousSelectedCount !== null && selectedCount === MATCH_SIZE && previousSelectedCount !== MATCH_SIZE) {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
        }
    }, [selectedCount]);

    useEffect(() => {
        if (!generatedTeams || !shouldScrollToResultRef.current) return;

        shouldScrollToResultRef.current = false;
        window.requestAnimationFrame(() => {
            resultRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        });
    }, [generatedTeams]);

    const handleGenerate = () => {
        setLocalError(null);
        setGeneratedTeams(null);

        if (selectedCount !== MATCH_SIZE) {
            setLocalError({ kind: 'count', selected: selectedCount });
            return;
        }

        const selectedPeople = people.filter((person) => selectedIds.has(person.id));
        const teams = generateTeams(selectedPeople);

        if (teams) {
            shouldScrollToResultRef.current = true;
            setGeneration((count) => count + 1);
            setGeneratedTeams(teams);
        } else {
            shouldScrollToResultRef.current = false;
            setLocalError({ kind: 'noTeams' });
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
            title: t.confirm.deleteTitle,
            message: t.confirm.deleteMessage,
            confirmLabel: t.confirm.deleteLabel,
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
            title: t.confirm.linksTitle,
            message: t.confirm.linksMessage,
            confirmLabel: t.confirm.linksLabel,
            tone: 'danger',
            onConfirm: () => clearAllRelationships(),
        });
    };

    const handleClearWantsRelationships = () => {
        requestConfirm({
            title: t.confirm.wantsTitle,
            message: t.confirm.wantsMessage,
            confirmLabel: t.confirm.wantsLabel,
            tone: 'danger',
            onConfirm: () => clearWantsRelationships(),
        });
    };

    const handleClearAvoidsRelationships = () => {
        requestConfirm({
            title: t.confirm.avoidsTitle,
            message: t.confirm.avoidsMessage,
            confirmLabel: t.confirm.avoidsLabel,
            tone: 'danger',
            onConfirm: () => clearAvoidsRelationships(),
        });
    };

    return (
        <div className="players-page">
            <div className="page-header">
                <div className="page-title-row">
                    <h2>{t.page.title}</h2>
                    <ActionButton
                        variant="neutral"
                        className="add-player-btn"
                        onClick={() => setShowForm(true)}
                        disabled={!canEdit}
                        title={canEdit ? undefined : t.page.addPlayerWaits}
                    >
                        {t.page.addPlayer}
                    </ActionButton>
                </div>
                <div className="header-actions">
                    <span className={selectionCountClassName} aria-live="polite">
                        <span className="selection-count-num">{selectedCount}/10</span>{' '}
                        <span className="selection-count-label">{t.page.selected}</span>
                        <span className="selection-dots" aria-hidden="true">
                            {DOTS.map((dot) => (
                                <i key={dot} className={dot < selectedCount ? 'is-on' : undefined} />
                            ))}
                        </span>
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
                            {t.page.clear}
                            <span className="clear-links-caret" aria-hidden="true">
                                <Icon name="chevronDown" size={13} />
                            </span>
                        </ActionButton>

                        {showClearMenu && (
                            <div className="clear-links-menu" role="menu">
                                <button
                                    type="button"
                                    className="clear-links-option"
                                    onClick={handleClearSelection}
                                >
                                    {t.page.clearSelection}
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option"
                                    onClick={handleClearFilters}
                                >
                                    {t.page.clearFilters}
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--danger"
                                    disabled={!canEdit}
                                    onClick={handleClearWantsRelationships}
                                >
                                    {t.page.clearWants}
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--danger"
                                    disabled={!canEdit}
                                    onClick={handleClearAvoidsRelationships}
                                >
                                    {t.page.clearAvoids}
                                </button>
                                <button
                                    type="button"
                                    className="clear-links-option clear-links-option--danger"
                                    disabled={!canEdit}
                                    onClick={handleClearAllRelationships}
                                >
                                    {t.page.clearLinks}
                                </button>
                            </div>
                        )}
                    </div>
                    <ActionButton
                        variant="primary"
                        className={`generate-teams-btn ${canGenerate ? 'is-ready' : ''}`}
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                    >
                        {t.page.generate}
                    </ActionButton>
                </div>
            </div>

            <PlayerListControls
                controls={controls}
                onChange={updateControls}
                privacyMode={privacyMode}
                teams={teamsCatalog}
                groups={groupsCatalog}
            />

            {error && (
                <div className="error">
                    <span className="error-text">{error}</span>
                    {(peopleStatus === 'error' || !isFresh) && (
                        <button className="btn btn-secondary" onClick={() => void fetchPeople()}>
                            {t.common.retry}
                        </button>
                    )}
                    <button className="btn btn-secondary btn-icon" onClick={() => setError(null)} aria-label={t.page.dismissError}>
                        &times;
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="loading-shell">
                    <SheetLoader ariaLabel={t.page.loading} />
                </div>
            ) : people.length === 0 ? (
                isLoaded && (
                    <div className="empty-state">
                        <p>{t.page.empty}</p>
                        <p className="hint">{t.page.emptyHint}</p>
                    </div>
                )
            ) : visiblePeople.length === 0 ? (
                <div className="empty-state">
                    <p>{t.page.noMatch}</p>
                    <p className="hint">{isFiltered ? t.page.noMatchFiltered : t.page.noMatchSorted}</p>
                </div>
            ) : (
                <div className="people-grid" ref={gridRef}>
                    {visiblePeople.map((person) => (
                        <PersonCard
                            key={person.id}
                            person={person}
                            // Inactive players are only shown to be edited back on, not picked.
                            selectable={person.active !== false}
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
                    {!isFresh && isReading && <span className="players-refreshing">{t.page.updating} </span>}
                    {!isFresh && !isReading && (
                        <button type="button" className="players-refresh" onClick={() => void fetchPeople()}>
                            {t.page.savedCopyRefresh}
                        </button>
                    )}
                    <span className="players-total">
                        {controls.role === 'inactive'
                            ? t.page.inactiveTotal(visiblePeople.length)
                            : isFiltered
                                ? t.page.showing(visiblePeople.length, activeCount)
                                : t.page.total(activeCount)}
                    </span>
                </div>
            )}

            {localError && (
                <div className="error">
                    <span className="error-text">
                        {localError.kind === 'count' ? t.page.selectExactly(localError.selected) : t.page.couldNotGenerate}
                    </span>
                </div>
            )}
            {generatedTeams && (
                <div ref={resultRef} className="team-result-scroll-anchor">
                    <TeamResult key={generation} result={generatedTeams} />
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
                confirmLabel={confirmState?.confirmLabel}
                tone={confirmState?.tone || 'default'}
                onCancel={handleConfirmCancel}
                onConfirm={handleConfirmAccept}
            />
        </div>
    );
}
