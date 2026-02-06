import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import type { Person, Role, GKWillingness } from '../types';
import './PersonForm.css';

interface PersonFormProps {
    person?: Person;
    onSave: (person: Person) => void;
    onCancel: () => void;
}

const roles: Role[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX'];
const gkOptions: { value: GKWillingness; label: string }[] = [
    { value: 'yes', label: 'Sí' },
    { value: 'low', label: 'Pocas chances' },
    { value: 'no', label: 'No' },
];

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function PersonForm({ person, onSave, onCancel }: PersonFormProps) {
    const { people } = useAppStore();
    const [name, setName] = useState(person?.name || '');
    const [nickname, setNickname] = useState(person?.nickname || '');
    const [role, setRole] = useState<Role>(person?.role || 'FLEX');
    const [rating, setRating] = useState(person?.rating || 5);
    const [avatar, setAvatar] = useState(person?.avatar || '');
    const [gkWillingness, setGkWillingness] = useState<GKWillingness>(person?.gkWillingness || 'low');
    const [wantsWith, setWantsWith] = useState<string[]>(person?.wantsWith || []);
    const [avoidsWith, setAvoidsWith] = useState<string[]>(person?.avoidsWith || []);

    const otherPeople = people.filter(p => p.id !== person?.id);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        onSave({
            id: person?.id || generateId(),
            name: name.trim(),
            nickname: nickname.trim(),
            role,
            rating,
            avatar,
            gkWillingness,
            wantsWith,
            avoidsWith,
        });
    };

    const toggleWantsWith = (id: string) => {
        setWantsWith(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
        setAvoidsWith(prev => prev.filter(i => i !== id));
    };

    const toggleAvoidsWith = (id: string) => {
        setAvoidsWith(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
        setWantsWith(prev => prev.filter(i => i !== id));
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{person ? 'Editar Jugador' : 'Agregar Jugador'}</h2>
                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label>Nombre Completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nombre real (opcional)"
                        />
                    </div>

                    <div className="form-group">
                        <label>Apodo *</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder="Cómo le dicen"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Rol</label>
                            <select value={role} onChange={e => setRole(e.target.value as Role)}>
                                {roles.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Rating (1-10)</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={rating}
                                onChange={e => setRating(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                            />
                        </div>

                        <div className="form-group">
                            <label>Ataja?</label>
                            <select value={gkWillingness} onChange={e => setGkWillingness(e.target.value as GKWillingness)}>
                                {gkOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Avatar</label>
                        <div className="avatar-upload">
                            {avatar && <img src={avatar} alt="Avatar preview" className="avatar-preview" />}
                            <input type="file" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                    </div>

                    {otherPeople.length > 0 && (
                        <>
                            <div className="form-group">
                                <label>Quiere jugar con</label>
                                <div className="relationship-grid">
                                    {otherPeople.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className={`relationship-btn wants ${wantsWith.includes(p.id) ? 'active' : ''}`}
                                            onClick={() => toggleWantsWith(p.id)}
                                        >
                                            {p.nickname}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Evita jugar con</label>
                                <div className="relationship-grid">
                                    {otherPeople.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className={`relationship-btn avoids ${avoidsWith.includes(p.id) ? 'active' : ''}`}
                                            onClick={() => toggleAvoidsWith(p.id)}
                                        >
                                            {p.nickname}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {person ? 'Guardar Cambios' : 'Agregar Jugador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
