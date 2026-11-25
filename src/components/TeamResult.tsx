import { useState, type CSSProperties } from 'react';
import type {
    AnalysisReport,
    Attributes,
    FallbackReport,
    Favors,
    GeneratedTeams,
    GeneratedTeamOption,
    LinkRef,
    Person,
    TeamLabel,
} from '../types';
import { useT, type Dict } from '../i18n';
import useAppStore from '../store/useAppStore';
import { calculateTeamPower } from '../services/teamGenerator';
import { Icon } from './Icon';
import { NoteTip } from './NoteTip';
import './TeamResult.css';

interface TeamResultProps {
    result: GeneratedTeams;
}

const ROLE_PRIORITY: Record<string, number> = { GK: 0, FLEX: 1, DEF: 2, MID: 3, ATT: 4 };
const RELAX_ORDER = ['avoids', 'wants', 'ownerBias', 'roleSpread', 'roleLimits'] as const;

function sortPlayers(players: Person[]): Person[] {
    return [...players].sort((a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99));
}

/** What "Copy Teams" puts on the clipboard: one line of nicknames per team. It leaves the app, so it never changes. */
function buildCopyText(option: GeneratedTeamOption): string {
    const team1Text = sortPlayers(option.team1.players).map((player) => player.nickname).join(' ');
    const team2Text = sortPlayers(option.team2.players).map((player) => player.nickname).join(' ');
    return `${team1Text}\n${team2Text}`;
}

async function copyText(text: string): Promise<boolean> {
    try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API not available');
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (!successful) console.error('Fallback copy failed.');
            return successful;
        } catch (fallbackError) {
            console.error('All copy attempts failed:', fallbackError);
            return false;
        }
    }
}

function formatValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** With its sign, and a real minus. */
function formatSigned(value: number): string {
    if (value > 0) return `+${formatValue(value)}`;
    if (value < 0) return `−${formatValue(-value)}`;
    return '0';
}

/** A sentence from the dictionaries, with {T1} and {T2} drawn as the sides' names in their colours. */
function TeamText({ text, t }: { text: string; t: Dict }) {
    return (
        <>
            {text.split(/(\{T[12]\})/).map((part, index) => {
                if (part !== '{T1}' && part !== '{T2}') return part;
                const label: TeamLabel = part === '{T1}' ? 'T1' : 'T2';
                return (
                    <span key={index} className={`team-word team-word--${label === 'T1' ? 'red' : 'black'}`}>
                        {t.common.team(label)}
                    </span>
                );
            })}
        </>
    );
}

function Avatar({ player }: { player: Person }) {
    return player.avatar && player.avatar.trim() !== '' ? (
        <img className="team-player-avatar" src={player.avatar} alt="" />
    ) : (
        <span className="team-player-avatar team-player-avatar--empty" aria-hidden="true">
            {(Array.from(player.nickname)[0] ?? '?').toUpperCase()}
        </span>
    );
}

function TeamPanel({
    label,
    players,
    privacyMode,
    moved,
    t,
}: {
    label: TeamLabel;
    players: Person[];
    privacyMode: boolean;
    /** Nicknames that changed team against the first option (second option only). */
    moved?: ReadonlySet<string>;
    t: Dict;
}) {
    const sorted = sortPlayers(players);
    // Dealt like cards: one to Team 1, one to Team 2, and so on.
    const dealOffset = label === 'T1' ? 0 : 1;

    return (
        <div className={`team-box team-box--${label === 'T1' ? 'red' : 'black'}`}>
            <div className="team-header">
                <span className={`team-name team-tag team-tag--${label === 'T1' ? 'red' : 'black'}`}>{t.common.team(label)}</span>
                {!privacyMode && (
                    <span className="team-power">
                        <span className="team-power-label">{t.result.power}</span>
                        {formatValue(calculateTeamPower(players))}
                    </span>
                )}
            </div>
            <ul className="team-players">
                {sorted.map((player, index) => {
                    // The note shows on hover, never with privacy mode (Sprint 6).
                    const note = privacyMode ? '' : player.notes?.trim() ?? '';
                    return (
                        <li
                            key={player.id}
                            className={`team-player ${moved?.has(player.nickname) ? 'is-moved' : ''} ${note ? 'has-note' : ''}`}
                            style={{ '--deal': index * 2 + dealOffset } as CSSProperties}
                        >
                            <Avatar player={player} />
                            <span className="team-player-name">{player.nickname}</span>
                            <span className={`role ${player.role.toLowerCase()}`}>{player.role}</span>
                            {player.secondaryRole && (
                                <span
                                    className={`role role--second ${player.secondaryRole.toLowerCase()}`}
                                    title={t.card.secondRole(player.secondaryRole)}
                                    aria-label={t.card.secondRole(player.secondaryRole)}
                                >
                                    {player.secondaryRole}
                                </span>
                            )}
                            {!privacyMode && <span className="team-player-rating">{player.rating}</span>}
                            {note && <NoteTip text={note} />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function FallbackBlock({ fallback, t }: { fallback: FallbackReport; t: Dict }) {
    const broken = fallback.rules.filter((status) => !status.kept);
    const kept = fallback.rules.filter((status) => status.kept);
    const applies = new Set(fallback.rules.map((status) => status.rule));
    const hasCause = fallback.causes.length > 0;

    return (
        <div className={`fallback-block ${hasCause ? '' : 'fallback-block--no-cause'}`} role="status">
            <div className="fallback-title">{t.result.fallbackTitle}</div>

            {hasCause && (
                <div className="fallback-group">
                    <div className="fallback-label">{t.result.why}</div>
                    <ul className="fallback-why">
                        {fallback.causes.map((cause, index) => (
                            <li key={index}>{t.result.cause(cause)}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="fallback-group">
                <div className="fallback-label">{t.result.broken}</div>
                <ul className="fallback-broken">
                    {broken.map((status) => (
                        <li key={status.rule}>
                            <span className="fallback-mark" aria-hidden="true">
                                <Icon name="x" size={13} />
                            </span>
                            <span>
                                <strong>{t.result.rule[status.rule]}.</strong>{' '}
                                <TeamText text={status.issues.map((issue) => t.result.issue(issue)).join(' ')} t={t} />
                            </span>
                        </li>
                    ))}
                </ul>
                {!hasCause && <p className="fallback-note">{t.result.noSingleCause}</p>}
            </div>

            {kept.length > 0 && (
                <div className="fallback-group">
                    <div className="fallback-label">{t.result.kept}</div>
                    <ul className="fallback-kept">
                        {kept.map((status) => (
                            <li key={status.rule}>
                                <Icon name="check" size={13} />
                                {t.result.rule[status.rule]}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="fallback-order">
                {t.result.relaxOrder}:{' '}
                {RELAX_ORDER.filter((rule) => applies.has(rule))
                    .map((rule) => t.result.rule[rule])
                    .join(' › ')}
            </p>
        </div>
    );
}

function Summary({ report, privacyMode, t }: { report: AnalysisReport; privacyMode: boolean; t: Dict }) {
    const { social, fallback } = report;
    const brokenRules = fallback ? fallback.rules.filter((status) => !status.kept).length : 0;
    const hasLinks = social.wantsTotal + social.avoidsTotal > 0;
    // Privacy mode: the label and the score say how even it is, with no rating numbers.
    const ratingNote = privacyMode
        ? null
        : report.rating.favors === 'Even'
          ? t.result.ratingEven
          : t.result.ratingDiff(report.rating.diff, report.rating.favors);

    return (
        <dl className="result-summary">
            <div className="summary-cell">
                <dt>{t.result.balance}</dt>
                <dd className="summary-value">{t.result.balanceLabel[report.balanceLabel]}</dd>
                <dd className="summary-note">
                    {t.result.score(Math.round(report.score))}
                    {ratingNote && <> · <TeamText text={ratingNote} t={t} /></>}
                </dd>
            </div>
            <div className="summary-cell">
                <dt>{t.result.social}</dt>
                <dd className="summary-value">{social.pct}%</dd>
                <dd className="summary-note">
                    {hasLinks
                        ? [
                              social.wantsTotal > 0 ? t.result.wantsKept(social.wantsMet, social.wantsTotal) : null,
                              social.avoidsTotal > 0 ? t.result.avoidsKept(social.avoidsMet, social.avoidsTotal) : null,
                          ]
                              .filter(Boolean)
                              .join(' · ')
                        : t.result.noLinks}
                </dd>
            </div>
            <div className={`summary-cell ${fallback ? 'summary-cell--broken' : 'summary-cell--ok'}`}>
                <dt>{t.result.rules}</dt>
                <dd className="summary-value">{fallback ? t.result.brokenCount(brokenRules) : t.result.allKept}</dd>
                <dd className="summary-note">{fallback ? t.result.fallbackNote : t.result.strictNote}</dd>
            </div>
        </dl>
    );
}

/** One line of the comparison: the bar leans to the side it favours, as far as the gap is wide. */
function TapeRow({ name, diff, favors, scale, t }: { name: string; diff: number; favors: Favors; scale: number; t: Dict }) {
    const width = `${Math.min(100, (diff / scale) * 100)}%`;

    return (
        <div className="tape-row" data-favors={favors}>
            <span className="tape-name">{name}</span>
            <span className="tape-bar" aria-hidden="true">
                <span className="tape-half tape-half--t1">
                    {favors === 'T1' && <span className="tape-fill" style={{ width }} />}
                </span>
                <span className="tape-half tape-half--t2">
                    {favors === 'T2' && <span className="tape-fill" style={{ width }} />}
                </span>
            </span>
            <span className="visually-hidden">{favors === 'Even' ? t.result.even : t.common.team(favors)}</span>
        </div>
    );
}

function LinkList({ links, kind }: { links: LinkRef[]; kind: 'want' | 'avoid' }) {
    return (
        <ul className="link-list">
            {links.map((link) => (
                <li key={`${link.from}-${link.to}`} className={`link-chip link-chip--${kind}`}>
                    {link.from}
                    <Icon name={kind === 'avoid' ? 'x' : link.mutual ? 'arrowsBoth' : 'arrowRight'} size={12} />
                    {link.to}
                </li>
            ))}
        </ul>
    );
}

/** Who can keep goal in a team without a GK: those who do it well, and the others who can. */
function emergencyKeepers(players: Person[]): { good: string[]; others: string[] } {
    const outfield = players.filter((player) => player.role !== 'GK');
    return {
        good: outfield.filter((player) => player.gkWillingness === 'good').map((player) => player.nickname),
        others: outfield.filter((player) => player.gkWillingness === 'low').map((player) => player.nickname),
    };
}

type ScoreTerm = { short: keyof Dict['result']['scoreShort']; name: string; detail: string; value: number };

/**
 * The full analysis: first in words, then the comparison as bars and the score explained line
 * by line. Numbers only where they say something on their own.
 */
function Analysis({ option, privacyMode, t }: { option: GeneratedTeamOption; privacyMode: boolean; t: Dict }) {
    const { report } = option;
    const { formula, keepers, att, social } = report;
    const attributeName = (key: keyof Attributes) => t.common.attributes[key].toLocaleLowerCase();
    const leaders = (side: Favors) =>
        report.attributes.filter((attribute) => attribute.favors === side).map((attribute) => attributeName(attribute.key));
    const attributeScale = Math.max(3, ...report.attributes.map((attribute) => attribute.diff));
    // Privacy mode hides each team's rating total; the gap stays (Sprint 4).
    const ratingTotals = privacyMode ? null : ([report.rating.team1, report.rating.team2] as const);

    const keeperLine = (label: TeamLabel, gkCount: number, players: Person[]) => {
        const { good, others } = emergencyKeepers(players);
        return t.result.keepersTeam(label, gkCount, good, others, keepers.neededWithoutGK);
    };
    const keeperSentence =
        keepers.team1.gkCount === 1 && keepers.team2.gkCount === 1
            ? t.result.keepersEach
            : [
                  keeperLine('T1', keepers.team1.gkCount, option.team1.players),
                  keeperLine('T2', keepers.team2.gkCount, option.team2.players),
              ].join(' ');
    // A team without a DEF or an ATT as main position, when someone among the ten plays it as
    // second position: who covers it, if anyone (Sprint 6).
    const coverSentence = (report.cover?.roles ?? [])
        .flatMap((cover) =>
            (['T1', 'T2'] as const)
                .map((label) => ({ label, side: label === 'T1' ? cover.team1 : cover.team2 }))
                .filter(({ side }) => side.main === 0)
                .map(({ label, side }) => t.result.coverSentence(label, cover.role, side.second)),
        )
        .join(' ');

    const times = (value: number, weight: number) => t.result.scoreTimes(formatValue(value), weight);
    const terms: ScoreTerm[] = [
        { short: 'rating', name: t.result.scoreRating, detail: times(formula.ratingDiff, 10), value: -formula.ratingPenalty },
        { short: 'attributes', name: t.result.scoreAttributes, detail: times(formula.attrDiff, 5), value: -formula.attrPenalty },
        { short: 'pace', name: t.result.scorePace, detail: times(formula.paceDiff, 10), value: -formula.pacePenalty },
        { short: 'stamina', name: t.result.scoreStamina, detail: times(formula.staminaDiff, 8), value: -formula.staminaPenalty },
        { short: 'defense', name: t.result.scoreDefense, detail: times(formula.defenseDiff, 5), value: -formula.defensePenalty },
        ...(formula.gkPref !== null
            ? [{ short: 'keepers' as const, name: t.result.scoreKeepers, detail: t.result.scoreKeepersHelp, value: formula.gkPref }]
            : []),
        { short: 'att', name: t.result.scoreAtt, detail: t.result.scoreAttHelp, value: formula.attPref },
        ...(formula.wantsPref !== null && social.oneWay
            ? [{
                  short: 'wants' as const,
                  name: t.result.scoreWants,
                  detail: times(social.oneWay.broken, social.oneWay.penaltyEach),
                  value: formula.wantsPref,
              }]
            : []),
        ...(formula.coverPref !== null && report.cover
            ? [{
                  short: 'cover' as const,
                  name: t.result.scoreCover,
                  detail: times(report.cover.roles.reduce((sum, cover) => sum + cover.avoidable, 0), report.cover.penaltyEach),
                  value: formula.coverPref,
              }]
            : []),
    ];
    // Only what moved the score gets a line; the rest is named in one sentence.
    const counted = terms.filter((term) => term.value !== 0);
    const noEffect = terms.filter((term) => term.value === 0).map((term) => t.result.scoreShort[term.short]);
    const brokenOneWay = social.oneWay?.brokenLinks ?? [];

    return (
        <div className="analysis">
            <section className="analysis-section analysis-words">
                <h4 className="analysis-title">{t.result.inWords}</h4>
                <ul className="analysis-points">
                    <li>
                        <strong>{t.result.lead.balance}.</strong>{' '}
                        {t.result.balanceSentence(report.balanceLabel, Math.round(report.score))}
                    </li>
                    <li>
                        <strong>{t.result.lead.rating}.</strong>{' '}
                        <TeamText text={t.result.ratingSentence(report.rating.diff, report.rating.favors, ratingTotals)} t={t} />
                    </li>
                    <li>
                        <strong>{t.result.lead.attributes}.</strong>{' '}
                        <TeamText text={t.result.attributesSentence(leaders('T1'), leaders('T2'), leaders('Even'))} t={t} />
                    </li>
                    <li>
                        <strong>{t.result.lead.keepers}.</strong> <TeamText text={keeperSentence} t={t} />
                    </li>
                    {att.total > 0 && (
                        <li>
                            <strong>{t.result.lead.att}.</strong> <TeamText text={t.result.attSentence(att.team1, att.team2)} t={t} />
                        </li>
                    )}
                    {coverSentence && (
                        <li>
                            <strong>{t.result.lead.cover}.</strong> <TeamText text={coverSentence} t={t} />
                        </li>
                    )}
                    <li>
                        <strong>{t.result.lead.links}.</strong>{' '}
                        {t.result.linksSentence(social.wantsMet, social.wantsTotal, social.avoidsMet, social.avoidsTotal)}
                        {(social.metWants.length > 0 || social.metAvoids.length > 0) && (
                            <div className="link-groups">
                                {social.metWants.length > 0 && (
                                    <div className="link-group">
                                        <span className="link-group-name">{t.result.wantsTogether}</span>
                                        <LinkList links={social.metWants} kind="want" />
                                    </div>
                                )}
                                {social.metAvoids.length > 0 && (
                                    <div className="link-group">
                                        <span className="link-group-name">{t.result.avoidsApart}</span>
                                        <LinkList links={social.metAvoids} kind="avoid" />
                                    </div>
                                )}
                            </div>
                        )}
                        {social.oneWay && brokenOneWay.length > 0 && (
                            <div className="link-groups">
                                <p className="link-note">{t.result.oneWaySplit(social.oneWay.penaltyEach)}</p>
                                <LinkList links={brokenOneWay} kind="want" />
                            </div>
                        )}
                    </li>
                </ul>
            </section>

            <section className="analysis-section analysis-tape">
                <h4 className="analysis-title">
                    <TeamText text={t.result.comparison} t={t} />
                </h4>
                <p className="analysis-caption">{t.result.comparisonHelp}</p>
                <div className="tape">
                    <div className="tape-head" aria-hidden="true">
                        <span />
                        <span className="tape-sides">
                            <span className="team-word team-word--red">{t.common.team('T1')}</span>
                            <span className="team-word team-word--black">{t.common.team('T2')}</span>
                        </span>
                    </div>
                    <TapeRow
                        name={t.result.rating}
                        diff={report.rating.diff}
                        favors={report.rating.favors}
                        scale={Math.max(4, report.rating.diff)}
                        t={t}
                    />
                    {report.attributes.map((attribute) => (
                        <TapeRow
                            key={attribute.key}
                            name={t.common.attributes[attribute.key]}
                            diff={attribute.diff}
                            favors={attribute.favors}
                            scale={attributeScale}
                            t={t}
                        />
                    ))}
                </div>
            </section>

            <section className="analysis-section analysis-score">
                <h4 className="analysis-title">{t.result.scoreTitle}</h4>
                <p className="analysis-caption">{t.result.scoreHelp}</p>
                <ul className="score-rows">
                    <li className="score-row">
                        <span className="score-name">{t.result.scoreStart}</span>
                        <span className="score-value">{formatValue(formula.base)}</span>
                    </li>
                    {counted.map((term) => (
                        <li key={term.short} className="score-row">
                            <span className="score-name">
                                {term.name}
                                <small>{term.detail}</small>
                            </span>
                            <span className="score-value">{formatSigned(term.value)}</span>
                        </li>
                    ))}
                    <li className="score-row score-row--total">
                        <span className="score-name">
                            {t.result.scoreTotal}
                            <small>{t.result.balanceLabel[report.balanceLabel]}</small>
                        </span>
                        <span className="score-value">{formula.total < 0 ? formatSigned(formula.total) : formatValue(formula.total)}</span>
                    </li>
                </ul>
                {noEffect.length > 0 && <p className="score-none">{t.result.scoreNoEffect(noEffect)}</p>}
            </section>
        </div>
    );
}

export function TeamResult({ result }: TeamResultProps) {
    const privacyMode = useAppStore((state) => state.privacyMode);
    const t = useT();
    const [copied, setCopied] = useState<'primary' | 'secondary' | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showSecond, setShowSecond] = useState(false);

    const { primary, secondary, comparison } = result;
    const { report } = primary;
    const moved = comparison ? new Set([...comparison.movedToTeam1, ...comparison.movedToTeam2]) : undefined;

    const handleCopy = async (option: GeneratedTeamOption, which: 'primary' | 'secondary') => {
        if (await copyText(buildCopyText(option))) {
            setCopied(which);
            window.setTimeout(() => setCopied((current) => (current === which ? null : current)), 1600);
        }
    };

    return (
        <section className="team-result">
            <header className="result-header">
                <h3>{t.result.title}</h3>
                <span className={`result-badge ${report.fallback ? 'result-badge--fallback' : 'result-badge--ok'}`}>
                    {report.fallback ? t.result.fallback : t.result.allRulesKept}
                </span>
            </header>

            {report.fallback && <FallbackBlock fallback={report.fallback} t={t} />}

            <div className="teams-container">
                <TeamPanel label="T1" players={primary.team1.players} privacyMode={privacyMode} t={t} />
                <TeamPanel label="T2" players={primary.team2.players} privacyMode={privacyMode} t={t} />
            </div>

            <Summary report={report} privacyMode={privacyMode} t={t} />

            <div className="result-actions">
                <button
                    type="button"
                    className={`result-btn result-btn--primary copy-btn ${copied === 'primary' ? 'is-copied' : ''}`}
                    onClick={() => void handleCopy(primary, 'primary')}
                >
                    {copied === 'primary' && <Icon name="check" size={15} />}
                    {copied === 'primary' ? t.result.copied : t.result.copy}
                </button>
                <button
                    type="button"
                    className="result-btn analysis-toggle-btn"
                    onClick={() => setShowAnalysis((shown) => !shown)}
                    aria-expanded={showAnalysis}
                    aria-controls="analysis-panel"
                >
                    {showAnalysis ? t.result.hideAnalysis : t.result.showAnalysis}
                    <span className={`result-btn-caret ${showAnalysis ? 'is-open' : ''}`}>
                        <Icon name="chevronDown" size={14} />
                    </span>
                </button>
                {!primary.isFallback && (
                    <button
                        type="button"
                        className="result-btn planb-toggle-btn"
                        onClick={() => setShowSecond((shown) => !shown)}
                        aria-expanded={showSecond}
                        aria-controls="planb-panel"
                    >
                        {showSecond ? t.result.hideSecond : t.result.showSecond}
                        <span className={`result-btn-caret ${showSecond ? 'is-open' : ''}`}>
                            <Icon name="chevronDown" size={14} />
                        </span>
                    </button>
                )}
            </div>

            {showAnalysis && (
                <div id="analysis-panel" className="result-panel">
                    <Analysis option={primary} privacyMode={privacyMode} t={t} />
                </div>
            )}

            {showSecond && !primary.isFallback && (
                <div id="planb-panel" className="result-panel planb-panel">
                    <div className="planb-header">{t.result.second}</div>
                    {secondary && comparison ? (
                        <>
                            <p className="planb-reason">{t.result.secondReason}</p>

                            <dl className="planb-deltas">
                                <div>
                                    <dt>{t.result.scoreDelta}</dt>
                                    <dd>
                                        {formatValue(Math.round(secondary.score))}
                                        <span className="planb-delta">{formatSigned(comparison.scoreDelta)}</span>
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t.result.socialDelta}</dt>
                                    <dd>
                                        {secondary.socialSatisfactionPct}%
                                        <span className="planb-delta">{formatSigned(comparison.socialDelta)}</span>
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t.result.ratingDiffDelta}</dt>
                                    <dd>
                                        <span className="planb-delta">{formatSigned(comparison.ratingDiffDelta)}</span>
                                    </dd>
                                </div>
                            </dl>

                            <div className="teams-container teams-container--compact">
                                <TeamPanel label="T1" players={secondary.team1.players} privacyMode={privacyMode} moved={moved} t={t} />
                                <TeamPanel label="T2" players={secondary.team2.players} privacyMode={privacyMode} moved={moved} t={t} />
                            </div>

                            <dl className="planb-moves">
                                <div>
                                    <dt>
                                        <TeamText text={t.result.movedTo('T1')} t={t} />
                                    </dt>
                                    <dd>{comparison.movedToTeam1.length > 0 ? comparison.movedToTeam1.join(', ') : t.result.noSwaps}</dd>
                                </div>
                                <div>
                                    <dt>
                                        <TeamText text={t.result.movedTo('T2')} t={t} />
                                    </dt>
                                    <dd>{comparison.movedToTeam2.length > 0 ? comparison.movedToTeam2.join(', ') : t.result.noSwaps}</dd>
                                </div>
                            </dl>

                            <button
                                type="button"
                                className={`result-btn planb-copy-btn ${copied === 'secondary' ? 'is-copied' : ''}`}
                                onClick={() => void handleCopy(secondary, 'secondary')}
                            >
                                {copied === 'secondary' && <Icon name="check" size={15} />}
                                {copied === 'secondary' ? t.result.copied : t.result.copySecond}
                            </button>
                        </>
                    ) : (
                        <p className="planb-empty">{t.result.noSecond}</p>
                    )}
                </div>
            )}
        </section>
    );
}
