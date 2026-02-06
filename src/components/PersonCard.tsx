import type { Person } from '../types';
import './PersonCard.css';

interface PersonCardProps {
    person: Person;
    onEdit?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    selected?: boolean;
    selectable?: boolean;
}

export function PersonCard({
    person,
    onEdit,
    onDelete,
    onSelect,
    selected,
    selectable
}: PersonCardProps) {

    return (
        <div
            className={`person-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
            onClick={selectable ? onSelect : undefined}
        >
            <div className="card-content">
                {person.avatar && person.avatar.trim() !== '' ? (
                    <img src={person.avatar} alt={person.nickname} className="avatar" />
                ) : (
                    <div className="avatar-placeholder">
                        {person.nickname[0].toUpperCase()}
                    </div>
                )}

                <div className="info">
                    <div className="nickname">{person.nickname}</div>
                    <div className="name">{person.name || '\u00A0'}</div>

                    <div className="tags">
                        <span className={`role ${person.role.toLowerCase()}`}>{person.role}</span>
                        <span className="rating">{person.rating}</span>
                    </div>
                </div>
            </div>

            {!selectable && (
                <div className="actions">
                    <button onClick={onEdit}>✎</button>
                    <button onClick={onDelete} className="delete">×</button>
                </div>
            )}
        </div>
    );
}
