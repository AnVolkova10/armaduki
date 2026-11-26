import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { matchPath, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useT, type Dict } from '../i18n';
import useAppStore from '../store/useAppStore';
import type { MatchPlayer, MatchSide, Person, TeamLabel } from '../types';
import { matchesLinkSearch } from '../utils/linkHistory';
import {
    addPlayer,
    analyzeDraft,
    buildMatch,
    cleanGoalsInput,
    draftOf,
    formatDay,
    hasResult,
    keeperIdOf,
    localDay,
    movePlayer,
    newDraft,
    newMatchId,
    originOf,
    parseDay,
    playersOn,
    removePlayer,
    scorerGap,
    setCounter,
    SIDES,
    type Counter as CounterName,
    type KeeperChoice,
    type MatchDraft,
} from '../utils/matches';
import { ActionButton } from './ActionButton';
import { DropdownMenuSelect } from './DropdownMenuSelect';
import { Icon } from './Icon';
import { SheetLoader } from './SheetLoader';
import { Analysis, RulesBlock, Summary, TeamText } from './TeamResult';
import './MatchEditor.css';

/** What the router carries when a match opens over another screen (Sprint 9). */
export interface MatchRouteState {
    /** The screen underneath: the players (from «Log Match») or the list of matches. */
    background?: Location;
    /** Started from the teams on screen, which it takes as they are. */
    fromResult?: boolean;
}

const LABEL: Record<MatchSide, TeamLabel> = { 1: 'T1', 2: 'T2' };
const COLOR: Record<MatchSide, 'red' | 'black'> = { 1: 'red', 2: 'black' };
const ROLE_ORDER: Record<string, number> = { GK: 0, FLEX: 1, DEF: 2, MID: 3, ATT: 4 };
const SEARCH_LIMIT = 6;
const ROTATE = 'rotate';

/** By position, like the teams in the result; the order of arrival within each. */
function byPosition(players: MatchPlayer[]): MatchPlayer[] {
    return [...players].sort((a, b) => (ROLE_ORDER[a.snapshot.role] ?? 9) - (ROLE_ORDER[b.snapshot.role] ?? 9));
}

/**
 * Opens a match over the screen underneath when the URL is /matches/<id> (or /matches/new). Back,
 * Cancel and Save all return to that screen; a match opened straight from a link goes to the list.
 */
export function MatchEditorHost() {
    const location = useLocation();
    const navigate = useNavigate();
    const access = useAppStore((state) => state.access);
    const route = matchPath('/matches/:matchId', location.pathname);
    if (!route || access === 'locked') return null;

    const state = (location.state ?? null) as MatchRouteState | null;
    const close = () => {
        if (state?.background) navigate(-1);
        else navigate('/matches', { replace: true });
    };

    return (
        <MatchEditorLoader
            key={location.key}
            matchId={route.params.matchId ?? 'new'}
            fromResult={Boolean(state?.fromResult)}
            onClose={close}
        />
    );
}

/** The modal frame, also for the moments before a match can be shown. */
function MatchModal({ title, caption, onClose, children }: { title: string; caption?: string; onClose: () => void; children: ReactNode }) {
    const t = useT();
    const pointerDownOnOverlayRef = useRef(false);

    // Escape closes, like the player form. A search with text takes it first (see the editor).
    useEffect(() => {
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="modal-overlay"
            onPointerDown={(event) => {
                pointerDownOnOverlayRef.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
                const startedOnOverlay = pointerDownOnOverlayRef.current;
                pointerDownOnOverlayRef.current = false;
                if (startedOnOverlay && event.target === event.currentTarget) onClose();
            }}
        >
            <div className="modal modal--match" role="dialog" aria-modal="true" aria-label={title}>
                <div className="match-form">
                    <header className="modal-top">
                        <div className="match-top-text">
                            <h3 className="modal-title">{title}</h3>
                            {caption && <span className="match-origin">{caption}</span>}
                        </div>
                        <button type="button" className="modal-close" onClick={onClose} aria-label={t.common.close}>
                            <Icon name="x" size={18} />
                        </button>
                    </header>
                    {children}
                </div>
            </div>
        </div>
    );
}

function MatchMessage({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    const t = useT();
    return (
        <MatchModal title={title} onClose={onClose}>
            <div className="match-body match-body--message">{children}</div>
            <footer className="form-actions">
                <ActionButton type="button" variant="neutral" onClick={onClose}>
                    {t.common.close}
                </ActionButton>
            </footer>
        </MatchModal>
    );
}

/** Waits for what the match needs: the players, the backend's word that it saves matches, and the match. */
function MatchEditorLoader({ matchId, fromResult, onClose }: { matchId: string; fromResult: boolean; onClose: () => void }) {
    const t = useT();
    const isFresh = useAppStore((state) => state.isFresh);
    const peopleStatus = useAppStore((state) => state.peopleStatus);
    const isReading = useAppStore((state) => state.isReading);
    const matchesSupported = useAppStore((state) => state.matchesSupported);
    const matches = useAppStore((state) => state.matches);
    const matchesStatus = useAppStore((state) => state.matchesStatus);
    const matchesError = useAppStore((state) => state.matchesError);
    const fetchMatches = useAppStore((state) => state.fetchMatches);
    const fetchPeople = useAppStore((state) => state.fetchPeople);
    const isNew = matchId === 'new';

    // A new match takes the teams on screen when it opened, and today's date; they never change under her.
    const [fresh] = useState<MatchDraft>(() => {
        const date = localDay();
        const primary = fromResult ? useAppStore.getState().generatedTeams?.primary : undefined;
        return newDraft({
            matchId: newMatchId(date),
            createdAt: new Date().toISOString(),
            date,
            fromApp: primary
                ? { team1: primary.team1.players, team2: primary.team2.players, stage: primary.stage }
                : undefined,
        });
    });

    const ready = isFresh && matchesSupported;
    useEffect(() => {
        if (ready && !isNew && matchesStatus === 'idle') void fetchMatches();
    }, [ready, isNew, matchesStatus, fetchMatches]);

    const title = isNew ? t.matches.newTitle : t.matches.title;
    if (!isFresh) {
        return peopleStatus === 'error' || (!isReading && peopleStatus === 'loaded') ? (
            <MatchMessage title={title} onClose={onClose}>
                <p>{t.matches.waits}</p>
                <ActionButton type="button" variant="neutral" onClick={() => void fetchPeople()}>
                    {t.common.retry}
                </ActionButton>
            </MatchMessage>
        ) : (
            <MatchModal title={title} onClose={onClose}>
                <div className="match-body match-body--message">
                    <SheetLoader ariaLabel={t.page.loading} />
                </div>
            </MatchModal>
        );
    }
    if (!matchesSupported) {
        return (
            <MatchMessage title={title} onClose={onClose}>
                <p>{t.matches.unsupported}</p>
            </MatchMessage>
        );
    }
    if (isNew) return <MatchEditor initialDraft={fresh} isNew fromResult={fromResult} onClose={onClose} />;

    if (matchesStatus === 'error') {
        return (
            <MatchMessage title={title} onClose={onClose}>
                <p>{matchesError}</p>
                <ActionButton type="button" variant="neutral" onClick={() => void fetchMatches()}>
                    {t.common.retry}
                </ActionButton>
            </MatchMessage>
        );
    }
    if (matchesStatus !== 'loaded' || !matches) {
        return (
            <MatchModal title={title} onClose={onClose}>
                <div className="match-body match-body--message">
                    <SheetLoader ariaLabel={t.matches.loading} />
                </div>
            </MatchModal>
        );
    }
    const match = matches.find((candidate) => candidate.matchId === matchId);
    if (!match) {
        return (
            <MatchMessage title={title} onClose={onClose}>
                <p>{t.matches.notFound}</p>
            </MatchMessage>
        );
    }
    return <MatchEditor initialDraft={draftOf(match)} isNew={false} fromResult={false} onClose={onClose} />;
}

function Avatar({ person, nickname }: { person: Person | undefined; nickname: string }) {
    return person?.avatar && person.avatar.trim() !== '' ? (
        <img className="team-player-avatar match-player-avatar" src={person.avatar} alt="" />
    ) : (
        <span className="team-player-avatar team-player-avatar--empty match-player-avatar" aria-hidden="true">
            {(Array.from(nickname)[0] ?? '?').toUpperCase()}
        </span>
    );
}

/** − n +, for one count of one player. Each tap is one step on the count as it is then. */
function Counter({ what, value, nickname, onStep, t }: { what: string; value: number; nickname: string; onStep: (step: 1 | -1) => void; t: Dict }) {
    return (
        <span className="counter">
            <span className="counter-label">{what}</span>
            <button
                type="button"
                className="counter-btn"
                aria-label={t.matches.less(what, nickname)}
                disabled={value === 0}
                onClick={() => onStep(-1)}
            >
                <Icon name="minus" size={14} />
            </button>
            <span className="counter-value">{value}</span>
            <button type="button" className="counter-btn" aria-label={t.matches.more(what, nickname)} onClick={() => onStep(1)}>
                <Icon name="plus" size={14} />
            </button>
        </span>
    );
}

/**
 * A match being built or changed by hand: the day, the group and the place; the result; the two
 * sides, with who keeps goal and each one's counts once there is a result; and how even it is.
 */
function MatchEditor({
    initialDraft,
    isNew,
    fromResult,
    onClose,
}: {
    initialDraft: MatchDraft;
    isNew: boolean;
    fromResult: boolean;
    onClose: () => void;
}) {
    const t = useT();
    const people = useAppStore((state) => state.people);
    const groupsCatalog = useAppStore((state) => state.groupsCatalog);
    const privacyMode = useAppStore((state) => state.privacyMode);
    const saveMatch = useAppStore((state) => state.saveMatch);
    const [draft, setDraft] = useState<MatchDraft>(initialDraft);
    const [query, setQuery] = useState('');
    const [showAnalysis, setShowAnalysis] = useState(false);
    const searchRef = useRef<HTMLInputElement | null>(null);

    const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
    const groups = useMemo(() => groupsCatalog ?? [], [groupsCatalog]);
    const analysis = useMemo(() => analyzeDraft(draft.players), [draft.players]);
    const sides: Record<MatchSide, MatchPlayer[]> = { 1: playersOn(draft.players, 1), 2: playersOn(draft.players, 2) };
    const keeperIds: Record<MatchSide, string> = {
        1: keeperIdOf(draft.keepers[1], sides[1]),
        2: keeperIdOf(draft.keepers[2], sides[2]),
    };
    const resultTyped = hasResult(draft);
    const origin = draft.players.length > 0 ? t.matches.origin[originOf(draft).origin] : undefined;
    const missing = sides[1].length === 0 || sides[2].length === 0 ? t.matches.needsPlayers : !parseDay(draft.date) ? t.matches.needsDate : null;

    // Search: nickname or name, without accents; whoever is not in the match yet, the active ones first.
    const inMatch = new Set(draft.players.map((player) => player.playerId));
    const found = query.trim() ? people.filter((person) => matchesLinkSearch(person, query)) : [];
    const results = found
        .filter((person) => !inMatch.has(person.id))
        .sort((a, b) => Number(a.active === false) - Number(b.active === false) || a.nickname.localeCompare(b.nickname))
        .slice(0, SEARCH_LIMIT);

    const placeOf = (groupId: string) => groups.find((group) => group.groupId === groupId)?.place ?? '';
    // The place starts with the group's own and can change; a place typed by hand stays.
    const setGroup = (groupId: string) =>
        setDraft((current) => {
            const place = current.place.trim() === '' || current.place === placeOf(current.groupId) ? placeOf(groupId) : current.place;
            return { ...current, groupId, place };
        });
    const setKeeper = (side: MatchSide, value: string) =>
        setDraft((current) => {
            const choice: KeeperChoice = value === ROTATE ? { kind: 'rotate' } : { kind: 'player', playerId: value };
            return { ...current, keepers: { ...current.keepers, [side]: choice } };
        });
    // On the count as it is when the tap lands, so quick taps all count.
    const step = (playerId: string, counter: CounterName, delta: 1 | -1) =>
        setDraft((current) => {
            const player = current.players.find((candidate) => candidate.playerId === playerId);
            return player ? setCounter(current, playerId, counter, player[counter] + delta) : current;
        });
    const add = (person: Person, side: MatchSide) => {
        setDraft((current) => addPlayer(current, person, side));
        setQuery('');
        searchRef.current?.focus();
    };
    // Enter does nothing here; Escape clears the search before it closes the match.
    const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') event.preventDefault();
        if (event.key === 'Escape' && query) {
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            setQuery('');
        }
    };
    const handleSave = () => {
        if (missing) return;
        void saveMatch(buildMatch(draft), { fromResult: isNew && fromResult });
        onClose();
    };

    const title = isNew ? t.matches.newTitle : formatDay(draft.date, t.matches.weekdays);

    return (
        <MatchModal title={title} caption={origin} onClose={onClose}>
            <div className="match-body">
                <div className="match-details">
                    <label className="match-field">
                        <span className="form-label">{t.matches.date}</span>
                        <input
                            type="date"
                            className="match-input match-date"
                            value={draft.date}
                            onChange={(event) => {
                                const date = event.target.value;
                                setDraft((current) => ({ ...current, date }));
                            }}
                        />
                    </label>
                    <div className="match-field">
                        <span className="form-label">{t.matches.group}</span>
                        <DropdownMenuSelect
                            value={draft.groupId}
                            options={[
                                { label: t.matches.noGroup, value: '' },
                                ...groups.map((group) => ({ label: group.name, value: group.groupId })),
                            ]}
                            onChange={setGroup}
                            ariaLabel={t.matches.group}
                            className="match-group-select"
                        />
                    </div>
                    <label className="match-field match-field--place">
                        <span className="form-label">{t.matches.place}</span>
                        <input
                            type="text"
                            className="match-input"
                            value={draft.place}
                            placeholder={t.matches.placeHint}
                            onChange={(event) => {
                                const place = event.target.value;
                                setDraft((current) => ({ ...current, place }));
                            }}
                        />
                    </label>
                </div>

                <div className="match-entry">
                    <div className="match-result">
                        <span className="form-label">{t.matches.result}</span>
                        <div className="match-score">
                            {SIDES.map((side) => (
                                <span key={side} className={`match-score-side match-score-side--${COLOR[side]}`}>
                                    <span className={`team-tag team-tag--${COLOR[side]}`}>{t.common.team(LABEL[side])}</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        autoComplete="off"
                                        className="match-score-input"
                                        aria-label={t.matches.goalsOf(LABEL[side])}
                                        placeholder="–"
                                        value={side === 1 ? draft.team1Goals : draft.team2Goals}
                                        onChange={(event) => {
                                            const goals = cleanGoalsInput(event.target.value);
                                            setDraft((current) =>
                                                side === 1 ? { ...current, team1Goals: goals } : { ...current, team2Goals: goals },
                                            );
                                        }}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="match-add">
                        <label className="form-label" htmlFor="match-search">
                            {t.matches.addPlayers}
                        </label>
                        <div className="match-search">
                            <Icon name="search" size={16} />
                            <input
                                id="match-search"
                                ref={searchRef}
                                type="text"
                                className="match-input match-search-input"
                                autoComplete="off"
                                placeholder={t.matches.search}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={handleSearchKey}
                            />
                        </div>
                        {query.trim() !== '' &&
                            (results.length > 0 ? (
                                <ul className="match-search-results">
                                    {results.map((person) => (
                                        <li key={person.id} className={`match-search-result ${person.active === false ? 'is-inactive' : ''}`}>
                                            <span className="match-search-name">
                                                {person.nickname}
                                                {person.name && <small>{person.name}</small>}
                                            </span>
                                            <span className={`role ${person.role.toLowerCase()}`}>{person.role}</span>
                                            {SIDES.map((side) => (
                                                <button
                                                    key={side}
                                                    type="button"
                                                    className={`match-add-btn match-add-btn--${COLOR[side]}`}
                                                    aria-label={`${t.matches.addTo(LABEL[side])}: ${person.nickname}`}
                                                    onClick={() => add(person, side)}
                                                >
                                                    {t.common.team(LABEL[side])}
                                                </button>
                                            ))}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="match-search-empty">{found.length > 0 ? t.matches.allIn : t.matches.noOneFound}</p>
                            ))}
                    </div>
                </div>

                <div className="match-teams">
                    {SIDES.map((side) => {
                        const sidePlayers = byPosition(sides[side]);
                        const keeperId = keeperIds[side];
                        const gap = scorerGap(draft, side);
                        return (
                            <section key={side} className={`match-team match-team--${COLOR[side]}`} aria-label={t.common.team(LABEL[side])}>
                                <header className="match-team-head">
                                    <span className={`team-tag team-tag--${COLOR[side]}`}>{t.common.team(LABEL[side])}</span>
                                    {sidePlayers.length > 0 && (
                                        <DropdownMenuSelect
                                            value={keeperId || ROTATE}
                                            options={[
                                                { label: t.matches.rotate, value: ROTATE },
                                                ...sidePlayers.map((player) => ({ label: player.nickname, value: player.playerId })),
                                            ]}
                                            onChange={(value) => setKeeper(side, value)}
                                            ariaLabel={`${t.matches.keeper}: ${t.common.team(LABEL[side])}`}
                                            caption={t.matches.keeper}
                                            className="match-keeper"
                                        />
                                    )}
                                </header>
                                {sidePlayers.length === 0 ? (
                                    <p className="match-team-empty">{t.matches.nobodyYet}</p>
                                ) : (
                                    <ul className="match-team-players">
                                        {sidePlayers.map((player) => {
                                            const { role, secondaryRole, rating } = player.snapshot;
                                            const inGoal = keeperId === player.playerId;
                                            return (
                                                <li key={player.playerId} className="match-player" data-player={player.playerId}>
                                                    <div className="match-player-line">
                                                        <Avatar person={peopleById.get(player.playerId)} nickname={player.nickname} />
                                                        <span className="match-player-name">{player.nickname}</span>
                                                        <span className={`role ${role.toLowerCase()}`}>{role}</span>
                                                        {secondaryRole && (
                                                            <span
                                                                className={`role role--second ${secondaryRole.toLowerCase()}`}
                                                                title={t.card.secondRole(secondaryRole)}
                                                                aria-label={t.card.secondRole(secondaryRole)}
                                                            >
                                                                {secondaryRole}
                                                            </span>
                                                        )}
                                                        {inGoal && <span className="match-player-keeper">{t.matches.keeperTag}</span>}
                                                        <span className="match-player-end">
                                                            {!privacyMode && <span className="match-player-rating">{rating}</span>}
                                                            <button
                                                                type="button"
                                                                className="icon-btn match-player-move"
                                                                aria-label={t.matches.move(player.nickname)}
                                                                title={t.matches.move(player.nickname)}
                                                                onClick={() => setDraft((current) => movePlayer(current, player.playerId))}
                                                            >
                                                                <Icon name="arrowsBoth" size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="icon-btn match-player-remove"
                                                                aria-label={t.matches.remove(player.nickname)}
                                                                title={t.matches.remove(player.nickname)}
                                                                onClick={() => setDraft((current) => removePlayer(current, player.playerId))}
                                                            >
                                                                <Icon name="x" size={16} />
                                                            </button>
                                                        </span>
                                                    </div>
                                                    {/* The counts come with the result: before the match there is nothing to count. */}
                                                    {resultTyped && (
                                                        <div className="match-player-counters">
                                                            <Counter
                                                                what={t.matches.goals}
                                                                value={player.goals}
                                                                nickname={player.nickname}
                                                                onStep={(delta) => step(player.playerId, 'goals', delta)}
                                                                t={t}
                                                            />
                                                            {!keeperId && (
                                                                <Counter
                                                                    what={t.matches.conceded}
                                                                    value={player.conceded}
                                                                    nickname={player.nickname}
                                                                    onStep={(delta) => step(player.playerId, 'conceded', delta)}
                                                                    t={t}
                                                                />
                                                            )}
                                                            {/* Whose error it was stays private: hidden, and kept as it was, with privacy mode. */}
                                                            {!privacyMode && (
                                                                <Counter
                                                                    what={t.matches.errors}
                                                                    value={player.errors}
                                                                    nickname={player.nickname}
                                                                    onStep={(delta) => step(player.playerId, 'errors', delta)}
                                                                    t={t}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                {gap && gap.named !== gap.total && <p className="match-team-hint">{t.matches.scorers(gap.named, gap.total)}</p>}
                            </section>
                        );
                    })}
                </div>

                <section className="match-measure">
                    <h4 className="match-section-title">{t.matches.measureTitle}</h4>
                    {analysis ? (
                        <>
                            <Summary report={analysis.report} privacyMode={privacyMode} t={t} rules={analysis.rules} />
                            <RulesBlock rules={analysis.rules} privacyMode={privacyMode} t={t} />
                            <button
                                type="button"
                                className="result-btn analysis-toggle-btn"
                                onClick={() => setShowAnalysis((shown) => !shown)}
                                aria-expanded={showAnalysis}
                            >
                                {showAnalysis ? t.result.hideAnalysis : t.result.showAnalysis}
                                <span className={`result-btn-caret ${showAnalysis ? 'is-open' : ''}`}>
                                    <Icon name="chevronDown" size={14} />
                                </span>
                            </button>
                            {showAnalysis && (
                                <div className="result-panel">
                                    <Analysis option={analysis} privacyMode={privacyMode} t={t} />
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="match-measure-note">
                            <TeamText text={t.matches.needsFive(sides[1].length, sides[2].length)} t={t} />
                        </p>
                    )}
                </section>
            </div>

            <footer className="form-actions match-actions">
                {missing && <span className="match-missing">{missing}</span>}
                <ActionButton type="button" variant="neutral" onClick={onClose}>
                    {t.common.cancel}
                </ActionButton>
                <ActionButton type="button" variant="primary" onClick={handleSave} disabled={Boolean(missing)}>
                    {t.matches.save}
                </ActionButton>
            </footer>
        </MatchModal>
    );
}
