import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionButton } from '../components/ActionButton';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import type { MatchRouteState } from '../components/MatchEditor';
import { SheetLoader } from '../components/SheetLoader';
import { useRosterLoad } from '../hooks/useRosterLoad';
import { useT, type Dict } from '../i18n';
import useAppStore from '../store/useAppStore';
import type { Match, TeamLabel } from '../types';
import { formatDay, outcomeOf } from '../utils/matches';
import './MatchesPage.css';

/** A sentence with {T1} and {T2} drawn as the sides' tags, as in the result. */
function TagText({ text, t }: { text: string; t: Dict }) {
    return (
        <>
            {text.split(/(\{T[12]\})/).map((part, index) => {
                if (part !== '{T1}' && part !== '{T2}') return part;
                const label: TeamLabel = part === '{T1}' ? 'T1' : 'T2';
                return (
                    <span key={index} className={`team-tag team-tag--small team-tag--${label === 'T1' ? 'red' : 'black'}`}>
                        {t.common.team(label)}
                    </span>
                );
            })}
        </>
    );
}

/** The result in words: who won and by how much, a draw, or no result yet. */
function Outcome({ match, t }: { match: Match; t: Dict }) {
    const outcome = outcomeOf(match);
    if (outcome.kind === 'none') return <span className="match-outcome match-outcome--none">{t.matches.noResult}</span>;
    if (outcome.kind === 'draw') return <span className="match-outcome">{t.matches.draw(outcome.goals)}</span>;
    return (
        <span className="match-outcome">
            <TagText text={t.matches.won(outcome.side === 1 ? 'T1' : 'T2', outcome.winner, outcome.loser)} t={t} />
        </span>
    );
}

/**
 * The matches as they were played (Sprint 9), newest first: the day, the group and the place, and
 * the result. Tapping one opens it over the list; «+ New Match» starts one by hand.
 */
export function MatchesPage() {
    useRosterLoad();
    const t = useT();
    const navigate = useNavigate();
    const location = useLocation();
    const isFresh = useAppStore((state) => state.isFresh);
    const peopleStatus = useAppStore((state) => state.peopleStatus);
    const isReading = useAppStore((state) => state.isReading);
    const fetchPeople = useAppStore((state) => state.fetchPeople);
    const matchesSupported = useAppStore((state) => state.matchesSupported);
    const matches = useAppStore((state) => state.matches);
    const matchesStatus = useAppStore((state) => state.matchesStatus);
    const matchesError = useAppStore((state) => state.matchesError);
    const fetchMatches = useAppStore((state) => state.fetchMatches);
    const deleteMatch = useAppStore((state) => state.deleteMatch);
    const groupsCatalog = useAppStore((state) => state.groupsCatalog);
    const [toDelete, setToDelete] = useState<Match | null>(null);

    const ready = isFresh && matchesSupported;
    useEffect(() => {
        if (ready && matchesStatus === 'idle') void fetchMatches();
    }, [ready, matchesStatus, fetchMatches]);

    const groupNames = useMemo(() => new Map((groupsCatalog ?? []).map((group) => [group.groupId, group.name])), [groupsCatalog]);
    const open = (path: string) => navigate(path, { state: { background: location } satisfies MatchRouteState });
    const dayOf = (match: Match) => formatDay(match.date, t.matches.weekdays);

    let content;
    if (!isFresh) {
        content =
            peopleStatus === 'error' || (!isReading && peopleStatus === 'loaded') ? (
                <div className="matches-error">
                    <span className="matches-error-text">{t.matches.waits}</span>
                    <button type="button" className="matches-error-btn" onClick={() => void fetchPeople()}>
                        {t.common.retry}
                    </button>
                </div>
            ) : (
                <div className="matches-loading">
                    <SheetLoader ariaLabel={t.page.loading} />
                </div>
            );
    } else if (!matchesSupported) {
        content = (
            <div className="matches-empty">
                <p>{t.matches.unsupported}</p>
            </div>
        );
    } else if (matchesStatus === 'error') {
        content = (
            <div className="matches-error">
                <span className="matches-error-text">{matchesError}</span>
                <button type="button" className="matches-error-btn" onClick={() => void fetchMatches()}>
                    {t.common.retry}
                </button>
            </div>
        );
    } else if (matchesStatus !== 'loaded' || !matches) {
        content = (
            <div className="matches-loading">
                <SheetLoader ariaLabel={t.matches.loading} />
            </div>
        );
    } else if (matches.length === 0) {
        content = (
            <div className="matches-empty">
                <p>{t.matches.empty}</p>
                <p className="hint">{t.matches.emptyHint}</p>
            </div>
        );
    } else {
        content = (
            <>
                <ul className="match-list">
                    {matches.map((match) => {
                        const where = [groupNames.get(match.groupId), match.place].filter(Boolean).join(' · ');
                        return (
                            <li key={match.matchId} className="match-row" data-match={match.matchId}>
                                <button type="button" className="match-row-open" onClick={() => open(`/matches/${match.matchId}`)}>
                                    <span className="match-row-day">{dayOf(match)}</span>
                                    <span className="match-row-where">{where}</span>
                                    <span className="match-row-outcome">
                                        <Outcome match={match} t={t} />
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="match-row-delete"
                                    aria-label={t.matches.deleteMatch(dayOf(match))}
                                    title={t.matches.deleteMatch(dayOf(match))}
                                    onClick={() => setToDelete(match)}
                                >
                                    <Icon name="trash" size={16} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="matches-count">{t.matches.count(matches.length)}</div>
            </>
        );
    }

    return (
        <div className="matches-page">
            <div className="matches-header">
                <h2>{t.matches.title}</h2>
                <ActionButton
                    variant="neutral"
                    className="new-match-btn"
                    onClick={() => open('/matches/new')}
                    disabled={!ready}
                    title={ready ? undefined : t.matches.waits}
                >
                    {t.matches.newMatch}
                </ActionButton>
            </div>

            {content}

            <ConfirmDialog
                open={Boolean(toDelete)}
                title={t.matches.deleteTitle}
                message={t.matches.deleteMessage}
                confirmLabel={t.matches.deleteLabel}
                tone="danger"
                onCancel={() => setToDelete(null)}
                onConfirm={() => {
                    if (toDelete) void deleteMatch(toDelete.matchId);
                    setToDelete(null);
                }}
            />
        </div>
    );
}
