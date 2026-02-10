import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonForm } from '../components/PersonForm';
import { PersonCard } from '../components/PersonCard';
import type { Person } from '../types';
import './PeoplePage.css';

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

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this player?')) {
            deletePerson(id);
        }
    };

    const handleClearAllRelationships = async () => {
        if (!confirm('Are you sure you want to clear ALL links (positive and negative) for every player?')) return;
        await clearAllRelationships();
    };

    const handleClearWantsRelationships = async () => {
        if (!confirm('Are you sure you want to clear all positive links (wants) for every player?')) return;
        await clearWantsRelationships();
    };

    const handleClearAvoidsRelationships = async () => {
        if (!confirm('Are you sure you want to clear all negative links (avoids) for every player?')) return;
        await clearAvoidsRelationships();
    };

    return (
        <div className="people-page">
            <div className="page-header">
                <h2>Players</h2>
                <div className="header-actions">
                    <div className="relationship-actions">
                        <button
                            className="btn btn-secondary relationship-btn relationship-btn-positive"
                            onClick={handleClearWantsRelationships}
                            disabled={people.length === 0}
                        >
                            Clear Wants
                        </button>
                        <button
                            className="btn btn-secondary relationship-btn relationship-btn-negative"
                            onClick={handleClearAvoidsRelationships}
                            disabled={people.length === 0}
                        >
                            Clear Avoids
                        </button>
                        <button
                            className="btn btn-secondary relationship-btn relationship-btn-all"
                            onClick={handleClearAllRelationships}
                            disabled={people.length === 0}
                        >
                            Clear All Links
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        + Add Player
                    </button>
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
        </div>
    );
}
