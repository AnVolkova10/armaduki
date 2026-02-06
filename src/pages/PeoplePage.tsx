import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonForm } from '../components/PersonForm';
import { PersonCard } from '../components/PersonCard';
import type { Person } from '../types';
import './PeoplePage.css';

export function PeoplePage() {
    const {
        people,
        isLoading,
        error,
        fetchPeople,
        addPerson,
        updatePerson,
        deletePerson,
        setError,
        privacyMode,
        togglePrivacyMode
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

    const handleRefresh = () => {
        fetchPeople();
    };

    return (
        <div className="people-page">
            <div className="page-header">
                <h2>Players</h2>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleRefresh} disabled={isLoading}>
                        🔄 {isLoading ? 'Cargando...' : 'Refrescar'}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={togglePrivacyMode}
                        title={privacyMode ? "Mostrar puntajes" : "Ocultar puntajes"}
                    >
                        {privacyMode ? '🙈 Oculto' : '👁️ Visible'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        + Agregar Jugador
                    </button>
                </div>
            </div>

            {isLoading && <div className="loading">Cargando desde Google Sheets...</div>}
            {error && (
                <div className="error">
                    {error}
                    <button className="btn btn-secondary" onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {!isLoading && people.length === 0 ? (
                <div className="empty-state">
                    <p>No hay jugadores todavía.</p>
                    <p className="hint">
                        Los datos se cargan desde Google Sheets. Podés agregar jugadores manualmente o editar la hoja de cálculo.
                    </p>
                </div>
            ) : (
                <div className="people-grid">
                    {people.map(person => (
                        <PersonCard
                            key={person.id}
                            person={person}
                            onEdit={() => handleEdit(person)}
                            onDelete={() => handleDelete(person.id)}
                        />
                    ))}
                </div>
            )}

            <div className="people-count">
                Total: {people.length} jugadores
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
