import { useEffect, useMemo, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { PersonCard } from '../components/PersonCard';
import { TeamResult } from '../components/TeamResult';
import { ActionButton } from '../components/ActionButton';
import { generateTeams } from '../services/teamGenerator';
import { matchesWordPrefix, normalizeSearch } from '../utils/search';
import './MatchPage.css';

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
        setGeneratedTeams
    } = useAppStore();

    const [localError, setLocalError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedCount = selectedIds.size;
    const canGenerate = selectedCount === 10;

    useEffect(() => {
        if (people.length === 0) {
            fetchPeople();
        }
    }, [fetchPeople, people.length]);

    const normalizedQuery = normalizeSearch(searchQuery);

    const filteredPeople = useMemo(() => {
        if (!normalizedQuery) return people;

        return people.filter((person) => {
            return (
                matchesWordPrefix(person.nickname || '', normalizedQuery) ||
                matchesWordPrefix(person.name || '', normalizedQuery)
            );
        });
    }, [normalizedQuery, people]);

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
                    <ActionButton variant="neutral" tone="light" onClick={handleClear}>
                        Clear Selection
                    </ActionButton>
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
                <input
                    type="text"
                    className="match-search-input"
                    placeholder="Search players (prefix)..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label="Search players by nickname or name"
                />
            </div>

            {isLoading ? (
                <div className="loading">Loading from Google Sheets...</div>
            ) : people.length === 0 ? (
                <div className="empty-state">
                    <p>No players available. Go to the Players page to add some.</p>
                </div>
            ) : filteredPeople.length === 0 ? (
                <div className="empty-state">
                    <p>No players match this search.</p>
                    <p>Try another prefix (for example: a, an, ma).</p>
                </div>
            ) : (
                <>
                    <div className="people-grid">
                        {filteredPeople.map(person => (
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
                    {normalizedQuery
                        ? `Showing ${filteredPeople.length} of ${people.length} players`
                        : `Total: ${people.length} players`}
                </div>
            )}

            {error && <div className="error">{error}</div>}
            {localError && <div className="error">{localError}</div>}
            {generatedTeams && <TeamResult result={generatedTeams} />}
        </div>
    );
}
