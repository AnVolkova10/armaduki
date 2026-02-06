import { useState, useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import type { Person, Role, GKWillingness, AttributeLevel, Attributes } from '../types';
import './PersonForm.css';

interface PersonFormProps {
    person?: Person;
    onSave: (person: Person) => void;
    onCancel: () => void;
}

const roles: Role[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX'];
const gkOptions: { value: GKWillingness; label: string }[] = [
    { value: 'yes', label: 'Sí' },
    { value: 'low', label: 'Poco' },
    { value: 'no', label: 'No' },
];

const attributesList: { key: keyof Attributes; label: string }[] = [
    { key: 'shooting', label: 'Remate' },
    { key: 'control', label: 'Control' },
    { key: 'passing', label: 'Pases' },
    { key: 'defense', label: 'Defensa' },
    { key: 'pace', label: 'Velocidad' },
    { key: 'vision', label: 'Visión' },
    { key: 'grit', label: 'Garra' },
    { key: 'stamina', label: 'Aire' },
];

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function PersonForm({ person, onSave, onCancel }: PersonFormProps) {
    const { people, privacyMode } = useAppStore();
    const [name, setName] = useState(person?.name || '');
    const [nickname, setNickname] = useState(person?.nickname || '');
    const [role, setRole] = useState<Role>(person?.role || 'FLEX');

    // Rating is now manual
    const [rating, setRating] = useState(person?.rating || 5);

    // Attributes State
    const [attributes, setAttributes] = useState<Attributes>(person?.attributes || {
        shooting: 'mid', control: 'mid', passing: 'mid', defense: 'mid',
        pace: 'mid', vision: 'mid', grit: 'mid', stamina: 'mid'
    });

    const [avatar, setAvatar] = useState(person?.avatar || '');
    const [gkWillingness, setGkWillingness] = useState<GKWillingness>(person?.gkWillingness || 'low');
    const [wantsWith, setWantsWith] = useState<string[]>(person?.wantsWith || []);
    const [avoidsWith, setAvoidsWith] = useState<string[]>(person?.avoidsWith || []);

    const otherPeople = people.filter(p => p.id !== person?.id);

    // Auto-Set GK Willingness if Role is GK
    useEffect(() => {
        if (role === 'GK') {
            setGkWillingness('yes');
        }
    }, [role]);

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
            attributes,
            avatar,
            gkWillingness,
            wantsWith,
            avoidsWith,
        });
    };

    const updateAttribute = (key: keyof Attributes, val: AttributeLevel) => {
        setAttributes(prev => ({ ...prev, [key]: val }));
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

    const renderAttributeRow = (key: keyof Attributes, label: string) => {
        const val = attributes[key];
        return (
            <div className="attribute-row" key={key}>
                <span className="attr-label">{label}</span>
                <div className="attr-buttons">
                    <button type="button"
                        className={`attr-btn low ${val === 'low' ? 'active' : ''}`}
                        onClick={() => updateAttribute(key, 'low')}>👎</button>
                    <button type="button"
                        className={`attr-btn mid ${val === 'mid' ? 'active' : ''}`}
                        onClick={() => updateAttribute(key, 'mid')}>🤏</button>
                    <button type="button"
                        className={`attr-btn high ${val === 'high' ? 'active' : ''}`}
                        onClick={() => updateAttribute(key, 'high')}>👍</button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>

                    {/* Header: Avatar + Names */}
                    <div className="modal-header">
                        <div className="avatar-section">
                            {avatar ? (
                                <img src={avatar} alt="Preview" className="avatar-preview" />
                            ) : (
                                <div className="avatar-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                                    ?
                                </div>
                            )}
                            <label className="avatar-upload-btn">
                                {avatar ? 'Cambiar Foto' : 'Subir Foto'}
                                <input type="file" accept="image/*" onChange={handleAvatarChange} />
                            </label>

                            {privacyMode && (
                                <div style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                                    🙈 Modo Privado
                                </div>
                            )}
                        </div>

                        <div className="header-inputs">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label>Apodo *</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    placeholder="Ej: Messi"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Nombre Real (Opcional)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ej: Lionel Andrés Messi"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Compact Selectors Row */}
                    <div className="form-row-compact">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Posición</label>
                            <div className="selector-group">
                                {roles.map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        className={`role-btn ${r.toLowerCase()} ${role === r ? 'active' : ''}`}
                                        onClick={() => setRole(r)}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {role !== 'GK' && (
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>¿Ataja?</label>
                                <div className="gk-selector">
                                    {gkOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`gk-btn ${gkWillingness === opt.value ? 'active' : ''}`}
                                            onClick={() => setGkWillingness(opt.value)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Manual Rating Slider */}
                    <div className="form-group">
                        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                            Nivel General (1-10)
                            {!privacyMode && <span style={{ color: 'var(--accent)' }}>{rating}</span>}
                        </label>
                        <input
                            type="range" min="1" max="10" step="1"
                            value={rating}
                            onChange={(e) => setRating(parseInt(e.target.value))}
                            className="stat-range"
                            style={{ marginTop: '0.5rem' }}
                        />
                    </div>

                    {/* Attributes Grid */}
                    <div className="stats-section">
                        <label style={{ marginBottom: '1rem' }}>Atributos</label>
                        <div className="attributes-grid">
                            {attributesList.map(attr => renderAttributeRow(attr.key, attr.label))}
                        </div>
                    </div>

                    {/* Relationships */}
                    {otherPeople.length > 0 && (
                        <div className="relationships-container">
                            <div className="relationship-column">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#22c55e', marginBottom: '0.5rem', display: 'block' }}>
                                    QUIERE JUGAR CON ({wantsWith.length})
                                </label>
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

                            <div className="relationship-column">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem', display: 'block' }}>
                                    EVITA JUGAR CON ({avoidsWith.length})
                                </label>
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
                        </div>
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
