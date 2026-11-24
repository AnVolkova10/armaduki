import { useState, type CSSProperties } from 'react';
import type {
    AnalysisReport,
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
        <div className={`team-box team-box--${label === 'T1' ? 't1' : 't2'}`}>
            <div className="team-header">
                <span className="team-bib" aria-hidden="true" />
                <span className="team-name">{t.common.team(label)}</span>
                {!privacyMode && (
                    <span className="team-power">
                        <span className="team-power-label">{t.result.power}</span>
                        {formatValue(calculateTeamPower(players))}
                    </span>
                )}
            </div>
            <ul className="team-players">
                {sorted.map((player, index) => (
                    <li
                        key={player.id}
                        className={`team-player ${moved?.has(player.nickname) ? 'is-moved' : ''}`}
                        style={{ '--deal': index * 2 + dealOffset } as CSSProperties}
                    >
                        <Avatar player={player} />
                        <span className="team-player-name">{player.nickname}</span>
                        <span className={`role ${player.role.toLowerCase()}`}>{player.role}</span>
                        {!privacyMode && <span className="team-player-rating">{player.rating}</span>}
                    </li>
                ))}
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
                                {status.issues.map((issue) => t.result.issue(issue)).join(' ')}
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
                    {ratingNote && <> · {ratingNote}</>}
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
function TapeRow({
    name,
    team1,
    team2,
    diff,
    favors,
    scale,
}: {
    name: string;
    team1: string;
    team2: string;
    diff: number;
    favors: Favors;
    scale: number;
}) {
    const width = `${Math.min(100, (diff / scale) * 100)}%`;

    return (
        <div className="tape-row" data-favors={favors}>
            <span className="tape-name">{name}</span>
            <span className="tape-value tape-value--t1">{team1}</span>
            <span className="tape-bar" aria-hidden="true">
                <span className="tape-half tape-half--t1">
                    {favors === 'T1' && <span className="tape-fill" style={{ width }} />}
                </span>
                <span className="tape-half tape-half--t2">
                    {favors === 'T2' && <span className="tape-fill" style={{ width }} />}
                </span>
            </span>
            <span className="tape-value tape-value--t2">{team2}</span>
        </div>
    );
}

function LinkList({ links, kind, t }: { links: LinkRef[]; kind: 'want' | 'avoid'; t: Dict }) {
    if (links.length === 0) return <span className="link-none">{t.result.none}</span>;

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

function Analysis({ report, privacyMode, t }: { report: AnalysisReport; privacyMode: boolean; t: Dict }) {
    const { formula, keepers, att, social } = report;
    const attributeScale = Math.max(3, ...report.attributes.map((attribute) => attribute.diff));
    // Privacy mode hides each team's rating total; the gap stays, because the score needs it to make sense.
    const ratingSide = (side: TeamLabel) =>
        privacyMode
            ? report.rating.favors === side
                ? `+${report.rating.diff}`
                : ''
            : String(side === 'T1' ? report.rating.team1 : report.rating.team2);

    const keeperLine = (label: TeamLabel) => {
        const team = label === 'T1' ? keepers.team1 : keepers.team2;
        return team.gkCount > 0
            ? t.result.hasGK(label)
            : t.result.emergency(label, team.capable, keepers.neededWithoutGK, team.good, team.low);
    };

    const terms: { name: string; detail?: string; value: number }[] = [
        { name: t.result.formulaBase, value: formula.base },
        { name: t.result.formulaRating, detail: `${formatValue(formula.ratingDiff)} × 10`, value: -formula.ratingPenalty },
        { name: t.result.formulaAttributes, detail: `${formatValue(formula.attrDiff)} × 5`, value: -formula.attrPenalty },
        { name: t.result.formulaPace, detail: `${formatValue(formula.paceDiff)} × 10`, value: -formula.pacePenalty },
        { name: t.result.formulaStamina, detail: `${formatValue(formula.staminaDiff)} × 8`, value: -formula.staminaPenalty },
        { name: t.result.formulaDefense, detail: `${formatValue(formula.defenseDiff)} × 5`, value: -formula.defensePenalty },
        ...(formula.gkPref !== null ? [{ name: t.result.formulaKeepers, value: formula.gkPref }] : []),
        { name: t.result.formulaAtt, value: formula.attPref },
        ...(formula.wantsPref !== null && social.oneWay
            ? [{
                  name: t.result.formulaWants,
                  detail: `${social.oneWay.broken} × ${social.oneWay.penaltyEach}`,
                  value: formula.wantsPref,
              }]
            : []),
    ];

    return (
        <div className="analysis">
            <section className="analysis-section">
                <h4 className="analysis-title">{t.result.comparison}</h4>
                <div className="tape">
                    <TapeRow
                        name={t.result.rating}
                        team1={ratingSide('T1')}
                        team2={ratingSide('T2')}
                        diff={report.rating.diff}
                        favors={report.rating.favors}
                        scale={Math.max(4, report.rating.diff)}
                    />
                    {report.attributes.map((attribute) => (
                        <TapeRow
                            key={attribute.key}
                            name={t.common.attributes[attribute.key]}
                            team1={attribute.team1.toFixed(1)}
                            team2={attribute.team2.toFixed(1)}
                            diff={attribute.diff}
                            favors={attribute.favors}
                            scale={attributeScale}
                        />
                    ))}
                </div>
            </section>

            <section className="analysis-section">
                <h4 className="analysis-title">{t.result.keepers}</h4>
                <ul className="analysis-lines">
                    <li className={keepers.team1.missing > 0 ? 'is-short' : undefined}>{keeperLine('T1')}</li>
                    <li className={keepers.team2.missing > 0 ? 'is-short' : undefined}>{keeperLine('T2')}</li>
                    <li className={att.spreadKept ? undefined : 'is-short'}>{t.result.attSplit(att.team1, att.team2)}</li>
                </ul>
            </section>

            <section className="analysis-section">
                <h4 className="analysis-title">{t.result.links}</h4>
                <div className="link-group">
                    <span className="link-group-name">{t.result.wantsTogether}</span>
                    <LinkList links={social.metWants} kind="want" t={t} />
                </div>
                <div className="link-group">
                    <span className="link-group-name">{t.result.avoidsApart}</span>
                    <LinkList links={social.metAvoids} kind="avoid" t={t} />
                </div>
                {social.oneWay && (
                    <>
                        <p className="link-note">
                            {t.result.oneWayKept(
                                social.oneWay.total - social.oneWay.broken,
                                social.oneWay.total,
                                social.oneWay.penaltyEach,
                            )}
                        </p>
                        {social.oneWay.brokenLinks.length > 0 && (
                            <div className="link-group">
                                <span className="link-group-name">{t.result.oneWayBroken}</span>
                                <LinkList links={social.oneWay.brokenLinks} kind="want" t={t} />
                            </div>
                        )}
                    </>
                )}
            </section>

            <section className="analysis-section">
                <h4 className="analysis-title">{t.result.formula}</h4>
                <table className="formula">
                    <tbody>
                        {terms.map((term) => (
                            <tr key={term.name}>
                                <th scope="row">{term.name}</th>
                                <td className="formula-detail">{term.detail ?? ''}</td>
                                <td className="formula-value">
                                    {term.name === t.result.formulaBase ? formatValue(term.value) : formatSigned(term.value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th scope="row">{t.result.formulaTotal}</th>
                            <td />
                            <td className="formula-value">{formatValue(formula.total)}</td>
                        </tr>
                    </tfoot>
                </table>
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
                    <Analysis report={report} privacyMode={privacyMode} t={t} />
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
                                    <dt>{t.result.movedTo('T1')}</dt>
                                    <dd>{comparison.movedToTeam1.length > 0 ? comparison.movedToTeam1.join(', ') : t.result.noSwaps}</dd>
                                </div>
                                <div>
                                    <dt>{t.result.movedTo('T2')}</dt>
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
