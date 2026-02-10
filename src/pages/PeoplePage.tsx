import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonForm } from '../components/PersonForm';
import { PersonCard } from '../components/PersonCard';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
        isLoading,
        error,
        fetchPeople,
        addPerson,
        updatePerson,
        deletePerson,
        clearAllRelationships,
        clearWantsRelationships,
        clearAvoidsRelationships,
        setError,
    } = useAppStore();

    const [showForm, setShowForm] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>();
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    // Fetch data from Google Sheets on mount
    useEffect(() => {
        if (people.length === 0) {
            fetchPeople();
        }
    }, []);

    const handleSave = (person: Person) => {
        if (editingPerson) {
            updatePerson(person);
        } else {
            addPerson(person);
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
        <div className="people-page">
            <div className="page-header">
                <h2>Players</h2>
                <div className="header-actions">
                    <div className="relationship-actions">
                        <ActionButton
                            variant="neutral"
                            tone="positive"
                            onClick={handleClearWantsRelationships}
                            disabled={people.length === 0}
                        >
                            Clear Wants
                        </ActionButton>
                        <ActionButton
                            variant="neutral"
                            tone="negative"
                            onClick={handleClearAvoidsRelationships}
                            disabled={people.length === 0}
                        >
                            Clear Avoids
                        </ActionButton>
                        <ActionButton
                            variant="neutral"
                            tone="light"
                            onClick={handleClearAllRelationships}
                            disabled={people.length === 0}
                        >
                            Clear All Links
                        </ActionButton>
                    </div>
                    <ActionButton variant="primary" onClick={() => setShowForm(true)}>
                        + Add Player
                    </ActionButton>
                </div>
            </div>

            {isLoading && <div className="loading">Loading from Google Sheets...</div>}
            {error && (
                <div className="error">
                    {error}
                    <button className="btn btn-secondary" onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {!isLoading && people.length === 0 ? (
                <div className="empty-state">
                    <p>No players yet.</p>
                    <p className="hint">
                        Data is loaded from Google Sheets. You can add players manually or edit the spreadsheet.
                    </p>
                </div>
            ) : (
                <div className="people-grid">
                    {people.map(person => (
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

            <div className="people-count">
                Total: {people.length} players
            </div>

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
                loading={isConfirming}
                onCancel={handleConfirmCancel}
                onConfirm={handleConfirmAccept}
            />
        </div>
    );
}
