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
    { value: 'yes', label: 'Yes' },
    { value: 'low', label: 'Low' },
    { value: 'no', label: 'No' },
];

const attributesList: { key: keyof Attributes; label: string }[] = [
    { key: 'shooting', label: 'Shooting' },
    { key: 'control', label: 'Control' },
    { key: 'passing', label: 'Passing' },
    { key: 'defense', label: 'Defense' },
    { key: 'pace', label: 'Pace' },
    { key: 'vision', label: 'Vision' },
    { key: 'grit', label: 'Grit' },
    { key: 'stamina', label: 'Stamina' },
];



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
            // Compress Image Logic
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 200; // Increased size again per user request

                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions (keeping aspect ratio, although we force 32x32 mostly for icons)
                    // For avatars, square is usually best. Let's force fit to 32x32 or keep aspect within 32x32
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to lightweight JPG (or PNG if transparency needed, but JPG is smaller)
                        // Using high quality for such small size is fine
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        setAvatar(dataUrl);
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        onSave({
            id: person?.id || '',  // Empty string for new - addPerson will generate sequential ID
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
                                {avatar ? 'Change Photo' : 'Upload Photo'}
                                <input type="file" accept="image/*" onChange={handleAvatarChange} />
                            </label>




                        </div>

                        <div className="header-inputs">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                <label>Nickname *</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Name or description</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Col 3: Rating Manual (Hidden in Privacy Mode) */}
                        {!privacyMode && (
                            <div className="rating-section-header">
                                {/* Label Removed per request, just grid with Gold accent */}
                                <div className="rating-grid">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            className={`rating-num-btn ${rating === val ? 'active' : ''}`}
                                            onClick={() => setRating(val)}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Compact Selectors Row */}
                    <div className="form-row-compact">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Position</label>
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
                                <label>Goalkeeper?</label>
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



                    {/* Attributes Grid */}
                    <div className="stats-section">
                        <div className="attributes-grid">
                            {attributesList.map(attr => renderAttributeRow(attr.key, attr.label))}
                        </div>
                    </div>

                    {/* Relationships */}
                    {otherPeople.length > 0 && (
                        <div className="relationships-container">
                            <div className="relationship-column">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#22c55e', marginBottom: '0.5rem', display: 'block' }}>
                                    WANTS TO PLAY WITH ({wantsWith.length})
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
                                    AVOIDS PLAYING WITH ({avoidsWith.length})
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
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {person ? 'Save Changes' : 'Add Player'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
