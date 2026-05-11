import { useEffect, useMemo, useState } from 'react';
import useAppStore from '../store/useAppStore';
import type { Person, Role, GKWillingness, AttributeLevel, Attributes, TeamCatalog } from '../types';
import { getSuggestedRating } from '../utils/ratingSuggestion';
import './PersonForm.css';

interface PersonFormProps {
    person?: Person;
    onSave: (person: Person) => void;
    onCancel: () => void;
}

const roles: Role[] = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
const gkOptions: { value: GKWillingness; label: string }[] = [
    { value: 'good', label: 'Good' },
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

const DEFAULT_ATTRIBUTES: Attributes = {
    shooting: 'mid',
    control: 'mid',
    passing: 'mid',
    defense: 'mid',
    pace: 'mid',
    vision: 'mid',
    grit: 'mid',
    stamina: 'mid',
};

const DEFAULT_TEAM_COLOR_1 = '#3a3a3a';
const DEFAULT_TEAM_COLOR_2 = '#111111';

function getHexLuminance(hex: string): number | null {
    const value = hex.trim().replace(/^#/, '');
    if (!/^[a-f\d]{3}$|^[a-f\d]{6}$/i.test(value)) return null;

    const expanded = value.length === 3
        ? value.split('').map((char) => char + char).join('')
        : value;
    const red = parseInt(expanded.slice(0, 2), 16);
    const green = parseInt(expanded.slice(2, 4), 16);
    const blue = parseInt(expanded.slice(4, 6), 16);

    return ((red * 0.299) + (green * 0.587) + (blue * 0.114)) / 255;
}

export function PersonForm({ person, onSave, onCancel }: PersonFormProps) {
    const {
        people,
        privacyMode,
        teamsCatalog,
        isTeamsCatalogLoading,
        teamsCatalogError,
    } = useAppStore();
    const personId = person?.id || '';
    const [name, setName] = useState(person?.name || '');
    const [nickname, setNickname] = useState(person?.nickname || '');
    const [role, setRole] = useState<Role>(person?.role || 'FLEX');

    // Rating is now manual
    const [rating, setRating] = useState(person?.rating || 5);

    // Attributes State
    const [attributes, setAttributes] = useState<Attributes>(person?.attributes || DEFAULT_ATTRIBUTES);
    const suggestedRating = useMemo(() => getSuggestedRating(attributes), [attributes]);

    const [avatar, setAvatar] = useState(person?.avatar || '');
    const [gkWillingness, setGkWillingness] = useState<GKWillingness>(person?.gkWillingness || 'low');
    const [wantsWith, setWantsWith] = useState<string[]>(person?.wantsWith || []);
    const [avoidsWith, setAvoidsWith] = useState<string[]>(person?.avoidsWith || []);
    const [shirtNumber, setShirtNumber] = useState(person?.shirtNumber || '');
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(person?.teams || []);
    const [primaryTeamId, setPrimaryTeamId] = useState(() => {
        const initialTeams = person?.teams || [];
        if (person?.primaryTeam && initialTeams.includes(person.primaryTeam)) {
            return person.primaryTeam;
        }
        return initialTeams[0] || '';
    });
    const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

    const otherPeople = useMemo(() => people.filter((p) => p.id !== personId), [people, personId]);
    const selectedTeamIdSet = useMemo(() => new Set(selectedTeamIds), [selectedTeamIds]);
    const teamsById = useMemo(() => {
        return new Map(teamsCatalog.map((team) => [team.teamId, team]));
    }, [teamsCatalog]);
    const effectivePrimaryTeamId = selectedTeamIdSet.has(primaryTeamId) ? primaryTeamId : '';
    const avatarTeam = effectivePrimaryTeamId ? teamsById.get(effectivePrimaryTeamId) : undefined;
    const sortedTeams = useMemo(() => {
        return [...teamsCatalog].sort((a, b) => a.name.localeCompare(b.name));
    }, [teamsCatalog]);

    const inverseWants = useMemo(() => {
        if (!personId) return new Set<string>();
        return new Set(otherPeople.filter((p) => p.wantsWith.includes(personId)).map((p) => p.id));
    }, [otherPeople, personId]);

    const inverseAvoids = useMemo(() => {
        if (!personId) return new Set<string>();
        return new Set(otherPeople.filter((p) => p.avoidsWith.includes(personId)).map((p) => p.id));
    }, [otherPeople, personId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

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
            gkWillingness: role === 'GK' ? 'good' : gkWillingness,
            wantsWith,
            avoidsWith,
            shirtNumber: shirtNumber.trim(),
            primaryTeam: effectivePrimaryTeamId || undefined,
            teams: selectedTeamIds,
            groups: person?.groups || [],
            availability: person?.availability || [],
            birthYear: person?.birthYear,
            secondaryRole: person?.secondaryRole,
            active: person?.active,
            notes: person?.notes,
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

    const handleRoleChange = (nextRole: Role) => {
        setRole(nextRole);
        if (nextRole === 'GK') {
            setGkWillingness('good');
        }
    };

    const toggleTeam = (teamId: string) => {
        const nextSelectedTeamIds = selectedTeamIds.includes(teamId)
            ? selectedTeamIds.filter(id => id !== teamId)
            : [...selectedTeamIds, teamId];

        setSelectedTeamIds(nextSelectedTeamIds);
        setPrimaryTeamId((currentPrimaryTeamId) => {
            if (nextSelectedTeamIds.length === 0) return '';
            if (!currentPrimaryTeamId || !nextSelectedTeamIds.includes(currentPrimaryTeamId)) {
                return nextSelectedTeamIds[0];
            }
            return currentPrimaryTeamId;
        });
    };

    const setPrimaryTeam = (teamId: string) => {
        if (!selectedTeamIdSet.has(teamId)) return;
        setPrimaryTeamId(teamId);
    };

    const getTeamOptionStyle = (team: TeamCatalog): React.CSSProperties => {
        const color1 = team.color1 || DEFAULT_TEAM_COLOR_1;
        const color2 = team.color2 || team.color1 || DEFAULT_TEAM_COLOR_2;
        const luminanceValues = [getHexLuminance(color1), getHexLuminance(color2)]
            .filter((value): value is number => value !== null);
        const averageLuminance = luminanceValues.length > 0
            ? luminanceValues.reduce((sum, value) => sum + value, 0) / luminanceValues.length
            : 0;
        const textColor = averageLuminance > 0.58 ? '#111111' : '#ffffff';

        return {
            '--team-color-1': color1,
            '--team-color-2': color2,
            '--team-text-color': textColor,
            '--team-text-shadow': textColor === '#ffffff'
                ? '0 1px 2px rgba(0, 0, 0, 0.75)'
                : '0 1px 1px rgba(255, 255, 255, 0.32)',
        } as React.CSSProperties;
    };

    const renderAttributeRow = (key: keyof Attributes, label: string) => {
        const val = attributes[key];
        return (
            <div className="attribute-row" key={key}>
                <span className="attr-label">{label}</span>
                <div className="attr-buttons">
                    <button type="button"
                        className={`attr-btn low ${val === 'low' ? 'active' : ''}`}
                        aria-label={`${label} low`}
                        title="Low"
                        onClick={() => updateAttribute(key, 'low')}>🔴</button>
                    <button type="button"
                        className={`attr-btn mid ${val === 'mid' ? 'active' : ''}`}
                        aria-label={`${label} mid`}
                        title="Mid"
                        onClick={() => updateAttribute(key, 'mid')}>🟡</button>
                    <button type="button"
                        className={`attr-btn high ${val === 'high' ? 'active' : ''}`}
                        aria-label={`${label} high`}
                        title="High"
                        onClick={() => updateAttribute(key, 'high')}>🟢</button>
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
                            <label className="avatar-frame">
                                {avatar ? (
                                    <img src={avatar} alt="Preview" className="avatar-preview" />
                                ) : (
                                    <div className="avatar-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                                        ?
                                    </div>
                                )}
                                <span className="avatar-upload-overlay">
                                    {avatar ? 'Change' : 'Upload'}
                                </span>
                                <input type="file" accept="image/*" onChange={handleAvatarChange} />
                            </label>
                            {shirtNumber.trim() && !avatarTeam && (
                                <span className="modal-shirt-number">#{shirtNumber.trim()}</span>
                            )}
                            {avatarTeam && (
                                <span
                                    className="modal-team-pill"
                                    style={getTeamOptionStyle(avatarTeam)}
                                    title={avatarTeam.name}
                                    aria-label={avatarTeam.name}
                                >
                                    {shirtNumber.trim() ? `#${shirtNumber.trim()}` : avatarTeam.name}
                                </span>
                            )}
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
                                <div className="rating-suggested" aria-live="polite">
                                    <span className="rating-suggested-label">suggested:</span>
                                    <span className="rating-suggested-value">{suggestedRating}</span>
                                </div>
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
                                        onClick={() => handleRoleChange(r)}
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
                                            className={`relationship-btn wants ${wantsWith.includes(p.id) ? 'active' : ''} ${inverseWants.has(p.id) ? 'inverse-hint-wants' : ''}`}
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
                                            className={`relationship-btn avoids ${avoidsWith.includes(p.id) ? 'active' : ''} ${inverseAvoids.has(p.id) ? 'inverse-hint-avoids' : ''}`}
                                            onClick={() => toggleAvoidsWith(p.id)}
                                        >
                                            {p.nickname}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="extra-info-section">
                        <button
                            type="button"
                            className="extra-info-toggle"
                            aria-expanded={isExtraInfoOpen}
                            onClick={() => setIsExtraInfoOpen((open) => !open)}
                        >
                            <span>Extra info</span>
                            <span className={`extra-info-caret ${isExtraInfoOpen ? 'is-open' : ''}`} aria-hidden="true" />
                        </button>

                        {isExtraInfoOpen && (
                            <div className="extra-info-content">
                                <div className="form-group extra-info-field">
                                    <label>Shirt number</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={shirtNumber}
                                        onChange={e => setShirtNumber(e.target.value)}
                                    />
                                </div>

                                <div className="teams-field">
                                    <div className="teams-field-header">
                                        <label>Teams</label>
                                        {selectedTeamIds.length > 0 && (
                                            <span>{selectedTeamIds.length} selected</span>
                                        )}
                                    </div>

                                    <div className="team-options-list">
                                        {isTeamsCatalogLoading && (
                                            <div className="teams-empty-state">Loading teams...</div>
                                        )}

                                        {!isTeamsCatalogLoading && teamsCatalogError && (
                                            <div className="teams-empty-state is-error">{teamsCatalogError}</div>
                                        )}

                                        {!isTeamsCatalogLoading && !teamsCatalogError && teamsCatalog.length === 0 && (
                                            <div className="teams-empty-state">No teams loaded yet</div>
                                        )}

                                        {!isTeamsCatalogLoading && !teamsCatalogError && sortedTeams.map((team) => {
                                            const isSelected = selectedTeamIdSet.has(team.teamId);
                                            const isPrimary = effectivePrimaryTeamId === team.teamId;

                                            return (
                                                <div key={team.teamId} className="team-option-stack">
                                                    <button
                                                        type="button"
                                                        className={`team-option ${isSelected ? 'is-selected' : ''}`}
                                                        style={getTeamOptionStyle(team)}
                                                        aria-pressed={isSelected}
                                                        onClick={() => toggleTeam(team.teamId)}
                                                        title={team.name}
                                                    >
                                                        <span className="team-option-name">{team.name}</span>
                                                        <span className="team-option-status">
                                                            {isSelected ? 'Selected' : 'Add'}
                                                        </span>
                                                    </button>

                                                    {selectedTeamIds.length > 1 && isSelected && (
                                                        <button
                                                            type="button"
                                                            className={`team-main-ball ${isPrimary ? 'is-primary' : ''}`}
                                                            onClick={() => setPrimaryTeam(team.teamId)}
                                                            title={isPrimary ? `${team.name} is main team` : `Set ${team.name} as main team`}
                                                            aria-label={isPrimary ? `${team.name} is main team` : `Set ${team.name} as main team`}
                                                        >
                                                            <img src="/ball.svg" alt="" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

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
