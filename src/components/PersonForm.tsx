import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import useAppStore from '../store/useAppStore';
import type { Person, Role, GKWillingness, AttributeLevel, Attributes, TeamCatalog } from '../types';
import { getSuggestedRating } from '../utils/ratingSuggestion';
import { ActionButton } from './ActionButton';
import { Icon } from './Icon';
import './PersonForm.css';

interface PersonFormProps {
    person?: Person;
    onSave: (person: Person) => void;
    onCancel: () => void;
}

const roles: Role[] = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
const gkValues: GKWillingness[] = ['good', 'low', 'no'];

const attributeKeys: (keyof Attributes)[] = [
    'shooting',
    'control',
    'passing',
    'defense',
    'pace',
    'vision',
    'grit',
    'stamina',
];

const LEVELS: AttributeLevel[] = ['low', 'mid', 'high'];

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

// Google Sheets cells hold at most 50,000 characters. A bigger avatar makes the whole
// row write fail, so photos are shrunk until the data URL fits with some margin.
const MAX_AVATAR_DATA_URL_LENGTH = 45_000;
const AVATAR_MAX_SIZES = [200, 160, 128, 96];
const AVATAR_JPEG_QUALITIES = [0.8, 0.65, 0.5];

function compressAvatar(img: HTMLImageElement): string | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (const maxSize of AVATAR_MAX_SIZES) {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        for (const quality of AVATAR_JPEG_QUALITIES) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            if (dataUrl.length <= MAX_AVATAR_DATA_URL_LENGTH) return dataUrl;
        }
    }

    return null;
}

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
    const t = useT();
    const personId = person?.id || '';
    const keepKnownIds = (ids: string[] | undefined) =>
        (ids || []).filter((id) => id !== personId && people.some((p) => p.id === id));
    const [name, setName] = useState(person?.name || '');
    const [nickname, setNickname] = useState(person?.nickname || '');
    const [role, setRole] = useState<Role>(person?.role || 'FLEX');

    // Rating is now manual
    const [rating, setRating] = useState(person?.rating || 5);

    // Attributes State
    const [attributes, setAttributes] = useState<Attributes>(person?.attributes || DEFAULT_ATTRIBUTES);
    const suggestedRating = useMemo(() => getSuggestedRating(attributes), [attributes]);

    const [avatar, setAvatar] = useState(person?.avatar || '');
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [gkWillingness, setGkWillingness] = useState<GKWillingness>(person?.gkWillingness || 'low');
    // Links to ids that are no longer in the sheet are dropped, so counts match the
    // highlighted buttons and saving cleans them up.
    const [wantsWith, setWantsWith] = useState<string[]>(() => keepKnownIds(person?.wantsWith));
    const [avoidsWith, setAvoidsWith] = useState<string[]>(() => keepKnownIds(person?.avoidsWith));
    const pointerDownOnOverlayRef = useRef(false);
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
    // Marked links first, in the order they had when the form opened: toggling one never makes
    // the buttons jump under the finger.
    const [linkedAtOpen] = useState(() => ({
        wants: new Set(keepKnownIds(person?.wantsWith)),
        avoids: new Set(keepKnownIds(person?.avoidsWith)),
    }));

    const otherPeople = useMemo(() => people.filter((p) => p.id !== personId), [people, personId]);
    const markedFirst = (marked: ReadonlySet<string>) =>
        [...otherPeople].sort((a, b) => Number(marked.has(b.id)) - Number(marked.has(a.id)));
    const wantsOrder = markedFirst(linkedAtOpen.wants);
    const avoidsOrder = markedFirst(linkedAtOpen.avoids);
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
        const input = e.target;
        const file = input.files?.[0];
        // Reset so picking the same file again still triggers onChange.
        input.value = '';
        if (!file) return;

        setAvatarError(null);
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const dataUrl = compressAvatar(img);
            if (dataUrl) {
                setAvatar(dataUrl);
            } else {
                setAvatarError(t.form.photoTooHeavy);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            setAvatarError(t.form.photoUnreadable);
        };

        img.src = objectUrl;
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

    // Team colours come from the sheet. The text over them is dark or light, whichever reads.
    const getTeamColors = (team: TeamCatalog): React.CSSProperties => {
        const color1 = team.color1 || DEFAULT_TEAM_COLOR_1;
        const color2 = team.color2 || team.color1 || DEFAULT_TEAM_COLOR_2;
        const luminanceValues = [getHexLuminance(color1), getHexLuminance(color2)]
            .filter((value): value is number => value !== null);
        const averageLuminance = luminanceValues.length > 0
            ? luminanceValues.reduce((sum, value) => sum + value, 0) / luminanceValues.length
            : 0;

        return {
            '--team-color-1': color1,
            '--team-color-2': color2,
            '--team-text-color': averageLuminance > 0.58 ? '#111111' : '#ffffff',
        } as React.CSSProperties;
    };

    // Three bars, like phone signal: one, two or three lit.
    const renderAttributeRow = (key: keyof Attributes) => {
        const label = t.common.attributes[key];
        const current = LEVELS.indexOf(attributes[key]);

        return (
            <div className="attribute-row" key={key}>
                <span className="attr-label">{label}</span>
                <div className="attr-level" role="radiogroup" aria-label={label}>
                    {LEVELS.map((level, index) => (
                        <button
                            key={level}
                            type="button"
                            role="radio"
                            aria-checked={current === index}
                            className={`attr-step attr-step--${level} ${index <= current ? 'is-lit' : ''}`}
                            aria-label={`${label} ${t.form.level[level]}`}
                            title={t.form.level[level]}
                            onClick={() => updateAttribute(key, level)}
                        >
                            <span className="attr-bar" aria-hidden="true" />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderLinks = (
        kind: 'wants' | 'avoids',
        order: Person[],
        marked: string[],
        inverse: ReadonlySet<string>,
        toggle: (id: string) => void,
    ) => (
        <div className={`relationship-column relationship-column--${kind}`}>
            <div className="relationship-title">
                <span className="form-label">{kind === 'wants' ? t.form.wants : t.form.avoids}</span>
                <span className="relationship-count">{marked.length}</span>
            </div>
            <div className="relationship-grid">
                {order.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        className={`relationship-btn ${kind} ${marked.includes(p.id) ? 'active' : ''} ${inverse.has(p.id) ? `inverse-hint-${kind}` : ''}`}
                        aria-pressed={marked.includes(p.id)}
                        title={inverse.has(p.id) ? (kind === 'wants' ? t.form.wantsYou(p.nickname) : t.form.avoidsYou(p.nickname)) : undefined}
                        onClick={() => toggle(p.id)}
                    >
                        {p.nickname}
                    </button>
                ))}
            </div>
        </div>
    );

    // Close only when the press both started and ended on the backdrop. Otherwise selecting
    // text in an input and releasing the mouse outside the modal would discard the form.
    const handleOverlayPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        pointerDownOnOverlayRef.current = event.target === event.currentTarget;
    };

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const startedOnOverlay = pointerDownOnOverlayRef.current;
        pointerDownOnOverlayRef.current = false;
        if (startedOnOverlay && event.target === event.currentTarget) {
            onCancel();
        }
    };

    const title = nickname.trim() || t.form.newPlayer;
    const hasLinks = otherPeople.length > 0;

    return (
        <div className="modal-overlay" onPointerDown={handleOverlayPointerDown} onClick={handleOverlayClick}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
                <form className="player-form" onSubmit={handleSubmit}>
                    <header className="modal-top">
                        <h3 className="modal-title">{title}</h3>
                        <button type="button" className="modal-close" onClick={onCancel} aria-label={t.common.close}>
                            <Icon name="x" size={18} />
                        </button>
                    </header>

                    {/* On a computer: who she is across the top; how she plays on the left; who she
                        plays with on the right, as tall as the left side, scrolling inside. The modal is
                        as tall as its content. On the phone, one under the other. */}
                    <div className={`modal-body ${hasLinks ? '' : 'modal-body--solo'}`}>
                        <section className="form-identity">
                            <div className="avatar-section">
                                <label className="avatar-frame">
                                    {avatar ? (
                                        <img src={avatar} alt={t.form.photoAlt} className="avatar-preview" />
                                    ) : (
                                        <span className="avatar-preview avatar-preview--empty">
                                            {(Array.from(nickname.trim())[0] ?? '?').toUpperCase()}
                                        </span>
                                    )}
                                    <span className="avatar-upload-overlay">
                                        {avatar ? t.form.photoChange : t.form.photoUpload}
                                    </span>
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} />
                                </label>
                                {shirtNumber.trim() && !avatarTeam && (
                                    <span className="modal-shirt-number">#{shirtNumber.trim()}</span>
                                )}
                                {avatarTeam && (
                                    <span
                                        className="modal-team-pill"
                                        style={getTeamColors(avatarTeam)}
                                        title={avatarTeam.name}
                                        aria-label={avatarTeam.name}
                                    >
                                        {shirtNumber.trim() ? `#${shirtNumber.trim()}` : avatarTeam.name}
                                    </span>
                                )}
                            </div>

                            <div className="identity-grid">
                                <div className="form-group field-nickname">
                                    <label className="form-label" htmlFor="player-nickname">{t.form.nickname} *</label>
                                    <input
                                        id="player-nickname"
                                        type="text"
                                        value={nickname}
                                        onChange={e => setNickname(e.target.value)}
                                        required
                                        pattern=".*\S.*"
                                        title={t.form.nicknameBlank}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group field-name">
                                    <label className="form-label" htmlFor="player-name">{t.form.name}</label>
                                    <input
                                        id="player-name"
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>

                                {/* On the phone the number and the teams stay folded, as before. */}
                                <button
                                    type="button"
                                    className="extra-info-toggle"
                                    aria-expanded={isExtraInfoOpen}
                                    onClick={() => setIsExtraInfoOpen((open) => !open)}
                                >
                                    <span>{t.form.extraInfo}</span>
                                    <span className={`extra-info-caret ${isExtraInfoOpen ? 'is-open' : ''}`} aria-hidden="true">
                                        <Icon name="chevronDown" size={14} />
                                    </span>
                                </button>

                                <div className="extra-info-content" data-open={isExtraInfoOpen || undefined}>
                                    <div className="form-group field-shirt">
                                        <label className="form-label" htmlFor="player-shirt">{t.form.shirtNumber}</label>
                                        <input
                                            id="player-shirt"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={shirtNumber}
                                            onChange={e => setShirtNumber(e.target.value)}
                                        />
                                    </div>

                                    <div className="teams-field">
                                        <span className="form-label">{t.form.teams}</span>
                                        <div className="team-options-list">
                                            {isTeamsCatalogLoading && (
                                                <div className="teams-empty-state">{t.form.teamsLoading}</div>
                                            )}

                                            {!isTeamsCatalogLoading && teamsCatalogError && (
                                                <div className="teams-empty-state is-error">{teamsCatalogError}</div>
                                            )}

                                            {!isTeamsCatalogLoading && !teamsCatalogError && teamsCatalog.length === 0 && (
                                                <div className="teams-empty-state">{t.form.teamsEmpty}</div>
                                            )}

                                            {!isTeamsCatalogLoading && !teamsCatalogError && sortedTeams.map((team) => {
                                                const isSelected = selectedTeamIdSet.has(team.teamId);
                                                const isPrimary = effectivePrimaryTeamId === team.teamId;

                                                return (
                                                    <div key={team.teamId} className="team-option-stack">
                                                        <button
                                                            type="button"
                                                            className={`team-option ${isSelected ? 'is-selected' : ''}`}
                                                            style={getTeamColors(team)}
                                                            aria-pressed={isSelected}
                                                            onClick={() => toggleTeam(team.teamId)}
                                                            title={team.name}
                                                        >
                                                            <span className="team-option-swatch" aria-hidden="true" />
                                                            <span className="team-option-name">{team.name}</span>
                                                            <span className="team-option-status">
                                                                {isSelected ? <Icon name="check" size={13} /> : null}
                                                                <span className="visually-hidden">
                                                                    {isSelected ? t.form.teamSelected : t.form.teamAdd}
                                                                </span>
                                                            </span>
                                                        </button>

                                                        {selectedTeamIds.length > 1 && isSelected && (
                                                            <button
                                                                type="button"
                                                                className={`team-main-ball ${isPrimary ? 'is-primary' : ''}`}
                                                                onClick={() => setPrimaryTeam(team.teamId)}
                                                                title={isPrimary ? t.form.teamIsMain(team.name) : t.form.teamSetMain(team.name)}
                                                                aria-label={isPrimary ? t.form.teamIsMain(team.name) : t.form.teamSetMain(team.name)}
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

                                {avatarError && (
                                    <span className="avatar-error" role="alert">{avatarError}</span>
                                )}
                            </div>
                        </section>

                        <section className="form-game">
                            <div className="game-row">
                                <div className="form-group">
                                    <span className="form-label">{t.form.position}</span>
                                    <div className="selector-group">
                                        {roles.map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                className={`role-btn ${r.toLowerCase()} ${role === r ? 'active' : ''}`}
                                                aria-pressed={role === r}
                                                onClick={() => handleRoleChange(r)}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {role !== 'GK' && (
                                    <div className="form-group">
                                        <span className="form-label">{t.form.goalkeeper}</span>
                                        <div className="gk-selector">
                                            {gkValues.map(value => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className={`gk-btn ${gkWillingness === value ? 'active' : ''}`}
                                                    aria-pressed={gkWillingness === value}
                                                    onClick={() => setGkWillingness(value)}
                                                >
                                                    {value === 'good' ? t.form.gkGood : value === 'low' ? t.form.gkLow : t.form.gkNo}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* The rating is hidden in privacy mode, and with it what the attributes suggest. */}
                            {!privacyMode && (
                                <div className="form-group rating-section-header">
                                    <div className="rating-heading">
                                        <span className="form-label">{t.form.rating}</span>
                                        <span className="rating-suggested" aria-live="polite">
                                            <span className="rating-suggested-dot" aria-hidden="true" />
                                            <span className="rating-suggested-label">{t.form.suggested}</span>
                                            <span className="rating-suggested-value">{suggestedRating}</span>
                                        </span>
                                    </div>
                                    <div className="rating-grid">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                className={`rating-num-btn ${rating === val ? 'active' : ''} ${suggestedRating === val ? 'is-suggested' : ''}`}
                                                aria-pressed={rating === val}
                                                onClick={() => setRating(val)}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group stats-section">
                                <span className="form-label">{t.form.attributes}</span>
                                <div className="attributes-grid">
                                    {attributeKeys.map(renderAttributeRow)}
                                </div>
                            </div>
                        </section>

                        {hasLinks && (
                            <section className="form-links">
                                <div className="form-links-inner">
                                    {renderLinks('wants', wantsOrder, wantsWith, inverseWants, toggleWantsWith)}
                                    {renderLinks('avoids', avoidsOrder, avoidsWith, inverseAvoids, toggleAvoidsWith)}
                                </div>
                            </section>
                        )}
                    </div>

                    <footer className="form-actions">
                        <ActionButton type="button" variant="neutral" onClick={onCancel}>
                            {t.common.cancel}
                        </ActionButton>
                        <ActionButton type="submit" variant="primary">
                            {person ? t.form.save : t.form.add}
                        </ActionButton>
                    </footer>
                </form>
            </div>
        </div>
    );
}
