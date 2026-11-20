import type { Person } from '../types';
import useAppStore from '../store/useAppStore';
import './PersonCard.css';

interface PersonCardProps {
    person: Person;
    onEdit?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    selected?: boolean;
    selectable?: boolean;
    selectionDisabled?: boolean;
}

const DEFAULT_TEAM_COLOR_1 = '#3a3a3a';
const DEFAULT_TEAM_COLOR_2 = '#111111';

export function PersonCard({
    person,
    onEdit,
    onDelete,
    onSelect,
    selected,
    selectable,
    selectionDisabled,
}: PersonCardProps) {
    const privacyMode = useAppStore((state) => state.privacyMode);
    const teamsCatalog = useAppStore((state) => state.teamsCatalog);
    const mainTeamId = person.primaryTeam;
    const mainTeam = mainTeamId ? teamsCatalog.find((team) => team.teamId === mainTeamId) : undefined;
    const teamMarkerStyle = mainTeam ? {
        '--team-color-1': mainTeam.color1 || DEFAULT_TEAM_COLOR_1,
        '--team-color-2': mainTeam.color2 || mainTeam.color1 || DEFAULT_TEAM_COLOR_2,
    } as React.CSSProperties : undefined;

    const canSelect = Boolean(selectable && !selectionDisabled && onSelect);
    const hasActions = Boolean(onEdit || onDelete);

    return (
        <div
            className={`person-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''} ${selectionDisabled ? 'selection-disabled' : ''}`}
        >
            {selectable && (
                // Covers the whole card, under the edit and delete icons: a tap anywhere else selects.
                // A sibling of the icons, not their parent, so there are no buttons inside a button.
                <button
                    type="button"
                    className="card-select"
                    onClick={canSelect ? onSelect : undefined}
                    disabled={!canSelect}
                    aria-pressed={Boolean(selected)}
                    aria-label={`Select ${person.nickname}`}
                />
            )}

            {mainTeam && (
                <span
                    className="team-corner-marker"
                    style={teamMarkerStyle}
                    title={mainTeam.name}
                    aria-label={mainTeam.name}
                />
            )}

            <div className="card-content">
                <div className="avatar-stack">
                    {person.avatar && person.avatar.trim() !== '' ? (
                        <img src={person.avatar} alt={person.nickname} className="avatar" />
                    ) : (
                        <div className="avatar-placeholder">
                            {(Array.from(person.nickname)[0] ?? '?').toUpperCase()}
                        </div>
                    )}
                    <span className={`shirt-number ${person.shirtNumber?.trim() ? '' : 'is-empty'}`}>
                        {person.shirtNumber?.trim() ? `#${person.shirtNumber.trim()}` : '\u00A0'}
                    </span>
                </div>

                <div className="info">
                    <div className="nickname">{person.nickname}</div>
                    <div className="name">{person.name || '\u00A0'}</div>

                    <div className="tags">
                        <span className={`role ${person.role.toLowerCase()}`}>{person.role}</span>
                        {!privacyMode && <span className="rating">{person.rating}</span>}
                    </div>
                </div>
            </div>

            {hasActions && (
                <div className="actions">
                    {onEdit && (
                        <button type="button" onClick={onEdit} className="edit-btn" title="Edit" aria-label={`Edit ${person.nickname}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" onClick={onDelete} className="delete-btn" title="Delete" aria-label={`Delete ${person.nickname}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
