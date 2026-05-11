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
    showMatchBadge?: boolean;
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
    showMatchBadge,
}: PersonCardProps) {
    const { privacyMode, teamsCatalog } = useAppStore();
    const mainTeamId = person.teams?.[0];
    const mainTeam = mainTeamId ? teamsCatalog.find((team) => team.teamId === mainTeamId) : undefined;
    const teamMarkerStyle = mainTeam ? {
        '--team-color-1': mainTeam.color1 || DEFAULT_TEAM_COLOR_1,
        '--team-color-2': mainTeam.color2 || mainTeam.color1 || DEFAULT_TEAM_COLOR_2,
    } as React.CSSProperties : undefined;

    return (
        <div
            className={`person-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''} ${selectionDisabled ? 'selection-disabled' : ''}`}
            onClick={selectable && !selectionDisabled ? onSelect : undefined}
        >
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
                            {person.nickname[0].toUpperCase()}
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

            {showMatchBadge && selected && (
                <div className="match-selected-badge">selected</div>
            )}

            {!selectable && (
                <div className="actions">
                    <button onClick={onEdit} className="edit-btn" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </button>
                    <button onClick={onDelete} className="delete-btn" title="Borrar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
