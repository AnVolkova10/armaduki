import type { Person } from '../types';
import { useT } from '../i18n';
import useAppStore from '../store/useAppStore';
import { Icon } from './Icon';
import './PersonCard.css';

interface PersonCardProps {
    person: Person;
    onEdit?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    selected?: boolean;
    selectable?: boolean;
    selectionDisabled?: boolean;
    /** Edit and delete stay in place but wait (the list is a saved copy until the sheet answers). */
    actionsDisabled?: boolean;
}

export function PersonCard({
    person,
    onEdit,
    onDelete,
    onSelect,
    selected,
    selectable,
    selectionDisabled,
    actionsDisabled,
}: PersonCardProps) {
    const t = useT();
    const privacyMode = useAppStore((state) => state.privacyMode);
    const teamsCatalog = useAppStore((state) => state.teamsCatalog);
    const mainTeamId = person.primaryTeam;
    const mainTeam = mainTeamId ? teamsCatalog.find((team) => team.teamId === mainTeamId) : undefined;
    // Team colours come from the sheet; a team without them gets the neutral pair.
    const teamMarkerStyle = mainTeam ? {
        '--team-color-1': mainTeam.color1 || 'var(--team-default-1)',
        '--team-color-2': mainTeam.color2 || mainTeam.color1 || 'var(--team-default-2)',
    } as React.CSSProperties : undefined;

    const canSelect = Boolean(selectable && !selectionDisabled && onSelect);
    const hasActions = Boolean(onEdit || onDelete);

    return (
        <div
            className={`person-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''} ${selectionDisabled ? 'selection-disabled' : ''}`}
            data-flip-id={person.id}
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
                    aria-label={t.card.select(person.nickname)}
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
                    <div className="card-avatar">
                        {person.avatar && person.avatar.trim() !== '' ? (
                            <img src={person.avatar} alt={person.nickname} className="avatar" />
                        ) : (
                            <div className="avatar-placeholder">
                                {(Array.from(person.nickname)[0] ?? '?').toUpperCase()}
                            </div>
                        )}
                        {selected && (
                            <span className="avatar-check" aria-hidden="true">
                                <Icon name="check" size={11} />
                            </span>
                        )}
                    </div>
                    <span className={`shirt-number ${person.shirtNumber?.trim() ? '' : 'is-empty'}`}>
                        {person.shirtNumber?.trim() ? `#${person.shirtNumber.trim()}` : ' '}
                    </span>
                </div>

                <div className="info">
                    <div className="nickname">{person.nickname}</div>
                    <div className="name">{person.name || ' '}</div>

                    <div className="tags">
                        <span className={`role ${person.role.toLowerCase()}`}>{person.role}</span>
                        {!privacyMode && <span className="rating">{person.rating}</span>}
                    </div>
                </div>
            </div>

            {hasActions && (
                <div className="actions">
                    {onEdit && (
                        <button type="button" onClick={onEdit} disabled={actionsDisabled} className="edit-btn" title={t.card.edit} aria-label={t.card.editPlayer(person.nickname)}>
                            <Icon name="pencil" size={15} />
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" onClick={onDelete} disabled={actionsDisabled} className="delete-btn" title={t.card.delete} aria-label={t.card.deletePlayer(person.nickname)}>
                            <Icon name="trash" size={15} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
