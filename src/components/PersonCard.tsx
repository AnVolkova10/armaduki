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
}

export function PersonCard({
    person,
    onEdit,
    onDelete,
    onSelect,
    selected,
    selectable
}: PersonCardProps) {
    const { privacyMode } = useAppStore();

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
                        {!privacyMode && <span className="rating">{person.rating}</span>}
                    </div>
                </div>
            </div>

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
