import { useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import type { Person } from '../types';
import './SelectedStrip.css';

const MATCH_SIZE = 10;

/**
 * The players picked for the match, shown in the sticky header on the Match page so the
 * selection stays visible while scrolling. Tapping a chip removes that player.
 */
export function SelectedStrip() {
    // Subscribe to the raw state and derive the list here: a selector that builds a new
    // array on every call makes zustand re-render forever.
    const people = useAppStore((state) => state.people);
    const selectedIds = useAppStore((state) => state.selectedIds);
    const toggleSelection = useAppStore((state) => state.toggleSelection);

    // A Set keeps insertion order, so chips appear in the order players were picked.
    const selectedPeople = useMemo(() => {
        const byId = new Map(people.map((person) => [person.id, person]));
        return [...selectedIds]
            .map((id) => byId.get(id))
            .filter((person): person is Person => Boolean(person));
    }, [people, selectedIds]);

    const count = selectedPeople.length;

    return (
        <div className="selected-strip" role="region" aria-label="Selected players">
            <span
                className={`selected-strip-count ${count === MATCH_SIZE ? 'is-complete' : ''}`}
                aria-live="polite"
            >
                {count}/{MATCH_SIZE}
            </span>

            {count === 0 ? (
                <span className="selected-strip-empty">Tap players to pick 10</span>
            ) : (
                <ul className="selected-strip-list">
                    {selectedPeople.map((person) => (
                        <li key={person.id}>
                            <button
                                type="button"
                                className="selected-chip"
                                onClick={() => toggleSelection(person.id)}
                                aria-label={`Remove ${person.nickname} from selection`}
                                title={`Remove ${person.nickname}`}
                            >
                                {person.avatar && person.avatar.trim() !== '' ? (
                                    <img className="selected-chip-avatar" src={person.avatar} alt="" />
                                ) : (
                                    <span className="selected-chip-avatar" aria-hidden="true">
                                        {(Array.from(person.nickname)[0] ?? '?').toUpperCase()}
                                    </span>
                                )}
                                <span className="selected-chip-name">{person.nickname}</span>
                                <span className="selected-chip-remove" aria-hidden="true">&times;</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
