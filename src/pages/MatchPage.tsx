import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonCard } from '../components/PersonCard';
import { TeamResult } from '../components/TeamResult';
import { generateTeams } from '../services/teamGenerator';
import './MatchPage.css';

export function MatchPage() {
    const {
        people,
        selectedIds,
        toggleSelection,
        clearSelection,
        generatedTeams,
        setGeneratedTeams
    } = useAppStore();

    const [localError, setLocalError] = useState<string | null>(null);

    const selectedCount = selectedIds.size;
    const canGenerate = selectedCount === 10;

    const handleGenerate = () => {
        setLocalError(null);
        setGeneratedTeams(null);

        if (selectedCount !== 10) {
            setLocalError(`Seleccioná exactamente 10 jugadores. Seleccionados: ${selectedCount}`);
            return;
        }

        const selectedPeople = people.filter(p => selectedIds.has(p.id));
        const teams = generateTeams(selectedPeople);

        if (teams) {
            setGeneratedTeams(teams);
        } else {
            setLocalError('No se pudieron generar equipos válidos. Revisá los roles y disponibilidad de arquero.');
        }
    };

    const handleClear = () => {
        clearSelection();
        setLocalError(null);
    };

    return (
        <div className="match-page">
            <div className="page-header">
                <h2>Armar Partido</h2>
                <div className="header-actions">
                    <span className="selection-count">
                        {selectedCount}/10 seleccionados
                    </span>
                    <button className="btn btn-secondary" onClick={handleClear}>
                        Limpiar Selección
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                    >
                        Generar Equipos
                    </button>
                </div>
            </div>

            {people.length === 0 ? (
                <div className="empty-state">
                    <p>No hay jugadores disponibles. Andá a la página de Jugadores para agregar.</p>
                </div>
            ) : (
                <>
                    <div className="instructions">
                        Seleccioná exactamente 10 jugadores para generar equipos balanceados.
                    </div>

                    <div className="people-grid">
                        {people.map(person => (
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

            {localError && <div className="error">{localError}</div>}
            {generatedTeams && <TeamResult result={generatedTeams} />}
        </div>
    );
}
