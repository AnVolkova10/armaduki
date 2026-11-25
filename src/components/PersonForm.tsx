import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import useAppStore from '../store/useAppStore';
import type { Person, Role, GKWillingness, AttributeLevel, Attributes, TeamCatalog } from '../types';
import { ageOn, birthDateParts, readBirthDateInput, type BirthDateParts } from '../utils/birthDate';
import { sameCatalogName } from '../utils/catalogIds';
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
// A second position is a real place on the pitch: FLEX already means "anywhere".
const secondRoles: Role[] = ['GK', 'DEF', 'MID', 'ATT'];
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
// A new team starts with the ball's red and black, until its own colours are picked.
const NEW_TEAM_COLOR_1 = '#dc2626';
const NEW_TEAM_COLOR_2 = '#000000';

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

/**
 * The chip that turns into a small form to make a team or a group without leaving the player.
 * It lives inside the player form: Enter creates without saving the player, and Escape closes
 * only this, not the whole form.
 */
function NewCatalogItem({
    kind,
    onCreate,
    onCancel,
}: {
    kind: 'team' | 'group';
    onCreate: (name: string, color1: string, color2: string) => void;
    onCancel: () => void;
}) {
    const t = useT();
    const [name, setName] = useState('');
    const [color1, setColor1] = useState(NEW_TEAM_COLOR_1);
    const [color2, setColor2] = useState(NEW_TEAM_COLOR_2);
    const label = kind === 'team' ? t.form.newTeam : t.form.newGroup;

    const create = () => {
        if (name.trim()) onCreate(name.trim(), color1, color2);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            create();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
        }
    };

    return (
        <div className="catalog-new-form" role="group" aria-label={label} onKeyDown={handleKeyDown}>
            {kind === 'team' && (
                <span className="catalog-new-colors">
                    <input
                        type="color"
                        value={color1}
                        onChange={(event) => setColor1(event.target.value)}
                        aria-label={t.form.teamColor1}
                        title={t.form.teamColor1}
                    />
                    <input
                        type="color"
                        value={color2}
                        onChange={(event) => setColor2(event.target.value)}
                        aria-label={t.form.teamColor2}
                        title={t.form.teamColor2}
                    />
                </span>
            )}
            <input
                type="text"
                className="catalog-new-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={kind === 'team' ? t.form.newTeamName : t.form.newGroupName}
                aria-label={kind === 'team' ? t.form.newTeamName : t.form.newGroupName}
                maxLength={40}
                autoFocus
            />
            <button
                type="button"
                className="catalog-new-btn catalog-new-btn--ok"
                onClick={create}
                disabled={!name.trim()}
                aria-label={t.form.create}
                title={t.form.create}
            >
                <Icon name="check" size={15} />
            </button>
            <button type="button" className="catalog-new-btn" onClick={onCancel} aria-label={t.common.cancel} title={t.common.cancel}>
                <Icon name="x" size={15} />
            </button>
        </div>
    );
}

export function PersonForm({ person, onSave, onCancel }: PersonFormProps) {
    const {
        people,
        privacyMode,
        teamsCatalog,
        isTeamsCatalogLoading,
        teamsCatalogError,
        groupsCatalog,
        groupsCatalogError,
        createTeam,
        createGroup,
    } = useAppStore();
    const t = useT();
    const personId = person?.id || '';
    const keepKnownIds = (ids: string[] | undefined) =>
        (ids || []).filter((id) => id !== personId && people.some((p) => p.id === id));
    // A backend from Sprint 6 on answers the groups; an older one would lose the groups, the
    // birth date and the teams and groups made here, so the form does not offer them.
    const extrasReady = groupsCatalog !== null;
    const [name, setName] = useState(person?.name || '');
    const [nickname, setNickname] = useState(person?.nickname || '');
    const [role, setRole] = useState<Role>(person?.role || 'FLEX');
    const [secondaryRole, setSecondaryRole] = useState<Role | undefined>(person?.secondaryRole);
    const [active, setActive] = useState(person?.active !== false);

    // Rating is now manual
    const [rating, setRating] = useState(person?.rating || 5);

    // Attributes State
    const [attributes, setAttributes] = useState<Attributes>(person?.attributes || DEFAULT_ATTRIBUTES);
    const suggestedRating = useMemo(() => getSuggestedRating(attributes), [attributes]);

    const [avatar, setAvatar] = useState(person?.avatar || '');
    const [avatarError, setAvatarError] = useState<string | null>(null);
    // Somebody new keeps goal only once it is marked (Sprint 6): unknown is "no", like the sheet.
    const [gkWillingness, setGkWillingness] = useState<GKWillingness>(person?.gkWillingness || 'no');
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
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(person?.groups || []);
    const [creating, setCreating] = useState<'team' | 'group' | null>(null);
    const [notes, setNotes] = useState(person?.notes || '');
    const [birth, setBirth] = useState<BirthDateParts>(() => birthDateParts(person?.birthDate));
    const [birthInvalid, setBirthInvalid] = useState(false);
    const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);
    // Marked links first, in the order they had when the form opened: toggling one never makes
    // the buttons jump under the finger.
    const [linkedAtOpen] = useState(() => ({
        wants: new Set(keepKnownIds(person?.wantsWith)),
        avoids: new Set(keepKnownIds(person?.avoidsWith)),
    }));

    // Privacy mode hides the notes and the birth date here too; saving keeps them as they were.
    const showNotes = !privacyMode;
    const showBirth = extrasReady && !privacyMode;
    const birthInput = readBirthDateInput(birth);
    const age = birthInput.kind === 'date' ? ageOn(birthInput.value, new Date()) : null;

    const otherPeople = useMemo(() => people.filter((p) => p.id !== personId), [people, personId]);
    // Inactive players leave the lists, unless they were already marked.
    const markedFirst = (marked: ReadonlySet<string>) =>
        otherPeople
            .filter((p) => p.active !== false || marked.has(p.id))
            .sort((a, b) => Number(marked.has(b.id)) - Number(marked.has(a.id)));
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
    const sortedGroups = useMemo(() => {
        return [...(groupsCatalog ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    }, [groupsCatalog]);
    // A group id with no row in Groups still shows, as its id, so it can be seen and taken off.
    const unknownGroupIds = selectedGroupIds.filter((id) => !groupsCatalog?.some((group) => group.groupId === id));

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
        if (showBirth && birthInput.kind === 'invalid') {
            setBirthInvalid(true);
            setIsExtraInfoOpen(true);
            return;
        }

        const second = secondaryRole && secondaryRole !== role ? secondaryRole : undefined;
        onSave({
            id: person?.id || '',  // Empty string for new - addPerson will generate sequential ID
            name: name.trim(),
            nickname: nickname.trim(),
            role,
            rating,
            attributes,
            avatar,
            // In goal as main or second position: keeps goal well.
            gkWillingness: role === 'GK' || second === 'GK' ? 'good' : gkWillingness,
            wantsWith,
            avoidsWith,
            shirtNumber: shirtNumber.trim(),
            primaryTeam: effectivePrimaryTeamId || undefined,
            teams: selectedTeamIds,
            groups: extrasReady ? selectedGroupIds : person?.groups || [],
            availability: person?.availability || [],
            secondaryRole: second,
            active,
            notes: showNotes ? notes.trim() || undefined : person?.notes,
            birthDate: showBirth ? (birthInput.kind === 'date' ? birthInput.value : undefined) : person?.birthDate,
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
        // The same position twice is just the main one.
        if (secondaryRole === nextRole) {
            setSecondaryRole(undefined);
        }
    };

    // Tapping the marked second position again takes it off. GK there hides the keeper question
    // and saves "good"; taking it off brings back the answer it had.
    const toggleSecondaryRole = (nextRole: Role) => {
        setSecondaryRole((current) => (current === nextRole ? undefined : nextRole));
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

    const toggleGroup = (groupId: string) => {
        setSelectedGroupIds((current) =>
            current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
        );
    };

    // A name that already exists is that team or group, marked; a new one is made and marked.
    const handleCreateTeam = (teamName: string, color1: string, color2: string) => {
        const existing = teamsCatalog.find((team) => sameCatalogName(team.name, teamName));
        const teamId = existing?.teamId ?? createTeam(teamName, color1, color2);
        if (!selectedTeamIds.includes(teamId)) toggleTeam(teamId);
        setCreating(null);
    };

    const handleCreateGroup = (groupName: string) => {
        const existing = groupsCatalog?.find((group) => sameCatalogName(group.name, groupName));
        const groupId = existing?.groupId ?? createGroup(groupName);
        setSelectedGroupIds((current) => (current.includes(groupId) ? current : [...current, groupId]));
        setCreating(null);
    };

    const updateBirth = (part: keyof BirthDateParts, value: string) => {
        setBirth((current) => ({ ...current, [part]: value.replace(/\D/g, '') }));
        setBirthInvalid(false);
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

    const renderNewChip = (kind: 'team' | 'group') =>
        creating === kind ? (
            <NewCatalogItem
                kind={kind}
                onCreate={(itemName, color1, color2) =>
                    kind === 'team' ? handleCreateTeam(itemName, color1, color2) : handleCreateGroup(itemName)
                }
                onCancel={() => setCreating(null)}
            />
        ) : (
            <button
                type="button"
                className="catalog-new"
                onClick={() => setCreating(kind)}
                aria-label={kind === 'team' ? t.form.newTeam : t.form.newGroup}
            >
                {t.form.newItem}
            </button>
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
    const canMakeTeams = extrasReady && !isTeamsCatalogLoading && !teamsCatalogError;
    const identityClassName = [
        'identity-grid',
        showBirth ? 'has-born' : '',
        extrasReady ? 'has-groups' : '',
        showNotes ? 'has-notes' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="modal-overlay" onPointerDown={handleOverlayPointerDown} onClick={handleOverlayClick}>
            <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
                <form className="player-form" onSubmit={handleSubmit}>
                    <header className="modal-top">
                        <h3 className="modal-title">{title}</h3>
                        <div className="modal-top-actions">
                            {person && (
                                <label className={`active-switch ${active ? 'is-on' : ''}`} title={t.form.activeHint}>
                                    <input
                                        type="checkbox"
                                        role="switch"
                                        checked={active}
                                        onChange={(event) => setActive(event.target.checked)}
                                    />
                                    <span className="active-switch-track" aria-hidden="true">
                                        <span className="active-switch-knob" />
                                    </span>
                                    <span className="active-switch-label">{t.form.active}</span>
                                </label>
                            )}
                            <button type="button" className="modal-close" onClick={onCancel} aria-label={t.common.close}>
                                <Icon name="x" size={18} />
                            </button>
                        </div>
                    </header>

                    {/* On a computer: who they are across the top; how they play on the left; who they
                        play with on the right, as tall as the left side, scrolling inside. The modal is
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

                            <div className={identityClassName}>
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

                                {/* On the phone the rest stays folded, as before. */}
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

                                    {showBirth && (
                                        <div className="form-group field-born">
                                            <div className="born-heading">
                                                <span className="form-label" id="player-born-label">{t.form.birthDate}</span>
                                                {age && <span className="born-age">{t.form.age(age.years, age.exact)}</span>}
                                            </div>
                                            <div
                                                className={`born-inputs ${birthInvalid ? 'is-invalid' : ''}`}
                                                role="group"
                                                aria-labelledby="player-born-label"
                                            >
                                                {(['day', 'month', 'year'] as const).map((part) => (
                                                    <input
                                                        key={part}
                                                        type="text"
                                                        inputMode="numeric"
                                                        className={`born-${part}`}
                                                        maxLength={part === 'year' ? 4 : 2}
                                                        placeholder={t.form.birthPlaceholder[part]}
                                                        aria-label={part === 'day' ? t.form.birthDay : part === 'month' ? t.form.birthMonth : t.form.birthYear}
                                                        aria-invalid={birthInvalid || undefined}
                                                        value={birth[part]}
                                                        onChange={(event) => updateBirth(part, event.target.value)}
                                                    />
                                                ))}
                                            </div>
                                            {birthInvalid && (
                                                <span className="field-error" role="alert">{t.form.birthDateInvalid}</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="teams-field">
                                        <span className="form-label">{t.form.teams}</span>
                                        <div className="team-options-list">
                                            {isTeamsCatalogLoading && (
                                                <div className="teams-empty-state">{t.form.teamsLoading}</div>
                                            )}

                                            {!isTeamsCatalogLoading && teamsCatalogError && (
                                                <div className="teams-empty-state is-error">{teamsCatalogError}</div>
                                            )}

                                            {!isTeamsCatalogLoading && !teamsCatalogError && teamsCatalog.length === 0 && creating !== 'team' && (
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

                                            {canMakeTeams && renderNewChip('team')}
                                        </div>
                                    </div>

                                    {extrasReady && (
                                        <div className="groups-field">
                                            <span className="form-label">{t.form.groups}</span>
                                            <div className="team-options-list">
                                                {groupsCatalogError && (
                                                    <div className="teams-empty-state is-error">{groupsCatalogError}</div>
                                                )}

                                                {!groupsCatalogError && sortedGroups.length === 0 && unknownGroupIds.length === 0 && creating !== 'group' && (
                                                    <div className="teams-empty-state">{t.form.groupsEmpty}</div>
                                                )}

                                                {[
                                                    ...sortedGroups.map((group) => ({ id: group.groupId, label: group.name })),
                                                    ...unknownGroupIds.map((id) => ({ id, label: id })),
                                                ].map(({ id, label }) => {
                                                    const isSelected = selectedGroupIds.includes(id);
                                                    return (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            className={`team-option group-option ${isSelected ? 'is-selected' : ''}`}
                                                            aria-pressed={isSelected}
                                                            onClick={() => toggleGroup(id)}
                                                            title={label}
                                                        >
                                                            <span className="team-option-name">{label}</span>
                                                            <span className="team-option-status">
                                                                {isSelected ? <Icon name="check" size={13} /> : null}
                                                            </span>
                                                        </button>
                                                    );
                                                })}

                                                {!groupsCatalogError && renderNewChip('group')}
                                            </div>
                                        </div>
                                    )}

                                    {showNotes && (
                                        <div className="form-group field-notes">
                                            <label className="form-label" htmlFor="player-notes">{t.form.notes}</label>
                                            <textarea
                                                id="player-notes"
                                                rows={1}
                                                maxLength={500}
                                                value={notes}
                                                placeholder={t.form.notesHint}
                                                onChange={(event) => setNotes(event.target.value)}
                                            />
                                        </div>
                                    )}
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

                                <div className="form-group">
                                    <span className="form-label">{t.form.secondPosition}</span>
                                    <div className="selector-group">
                                        {secondRoles.filter((r) => r !== role).map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                className={`role-btn is-second ${r.toLowerCase()} ${secondaryRole === r ? 'active' : ''}`}
                                                aria-pressed={secondaryRole === r}
                                                onClick={() => toggleSecondaryRole(r)}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* In goal as main or second position: it keeps goal, nothing to ask. */}
                                {role !== 'GK' && secondaryRole !== 'GK' && (
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
