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
                    <button className="btn btn-secondary" onClick={handleClear}>
                        Clear Selection
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                    >
                        Generate Teams
                    </button>
                </div>
            </div>

            {people.length === 0 ? (
                <div className="empty-state">
                    <p>No players available. Go to the Players page to add some.</p>
                </div>
            ) : (
                <>
                    <div className="instructions">
                        Select exactly 10 players to generate balanced teams.
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
