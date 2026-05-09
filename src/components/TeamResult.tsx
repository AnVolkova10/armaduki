import { useState } from 'react';
import type { GeneratedTeams, GeneratedTeamOption, Person } from '../types';
import useAppStore from '../store/useAppStore';
import { calculateTeamPower } from '../services/teamGenerator';
import './TeamResult.css';

interface TeamResultProps {
    result: GeneratedTeams;
}

interface AnalysisSection {
    title: string;
    lines: string[];
}

function renderAnalysisLine(line: string) {
    const parts = line.split(/(T1|T2|\[(?:GK|FLEX|DEF|MID|ATT)\])/g);

    return parts.map((part, index) => {
        if (part === 'T1') {
            return (
                <span key={`t1-${index}`} className="analysis-token-t1">
                    {part}
                </span>
            );
        }

        if (part === 'T2') {
            return (
                <span key={`t2-${index}`} className="analysis-token-t2">
                    {part}
                </span>
            );
        }

        const roleMatch = part.match(/^\[(GK|FLEX|DEF|MID|ATT)\]$/);
        if (roleMatch) {
            const role = roleMatch[1].toLowerCase();
            return (
                <span key={`role-${index}`} className={`analysis-token-role analysis-token-role-${role}`}>
                    {roleMatch[1]}
                </span>
            );
        }

        return <span key={`text-${index}`}>{part}</span>;
    });
}

function parseAnalysis(explanation: string): { headline: string | null; sections: AnalysisSection[] } {
    const rawLines = explanation
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.trim().length > 0);

    const sections: AnalysisSection[] = [];
    let headline: string | null = null;
    let currentSection: AnalysisSection | null = null;

    const pushCurrent = () => {
        if (currentSection && currentSection.lines.length > 0) {
            sections.push(currentSection);
        }
    };

    for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (/^Analysis(?:\s+\[[A-Z_]+\])?\s+\(Score:/.test(trimmed)) {
            headline = trimmed;
            continue;
        }

        const sectionMatch = trimmed.match(/^\[(.+)\]$/);
        if (sectionMatch) {
            pushCurrent();
            currentSection = { title: sectionMatch[1], lines: [] };
            continue;
        }

        if (!currentSection) {
            currentSection = { title: 'Details', lines: [] };
        }

        currentSection.lines.push(rawLine);
    }

    pushCurrent();

    if (sections.length === 0 && rawLines.length > 0) {
        const fallbackLines = headline ? rawLines.filter((line) => line.trim() !== headline) : rawLines;

        if (fallbackLines.length > 0) {
            sections.push({ title: 'Details', lines: fallbackLines });
        }
    }

    return { headline, sections };
}

function formatValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDelta(value: number): string {
    const formatted = formatValue(value);
    return value > 0 ? `+${formatted}` : formatted;
}

function formatStageLabel(stage: GeneratedTeamOption['stage']): string {
    return stage.toLowerCase().replace(/_/g, ' ');
}

export function TeamResult({ result }: TeamResultProps) {
    const { privacyMode } = useAppStore();
    const [copiedPrimary, setCopiedPrimary] = useState(false);
    const [copiedSecondary, setCopiedSecondary] = useState(false);
    const [showPlanB, setShowPlanB] = useState(false);

    const rolePriority: Record<string, number> = { GK: 0, FLEX: 1, DEF: 2, MID: 3, ATT: 4 };

    const sortPlayers = (players: Person[]) => {
        return [...players].sort((a, b) => {
            const pA = rolePriority[a.role] ?? 99;
            const pB = rolePriority[b.role] ?? 99;
            return pA - pB;
        });
    };

    const buildCopyText = (option: GeneratedTeamOption): string => {
        const team1Sorted = sortPlayers(option.team1.players);
        const team2Sorted = sortPlayers(option.team2.players);
        const team1Text = team1Sorted.map((player) => player.nickname).join(' ');
        const team2Text = team2Sorted.map((player) => player.nickname).join(' ');
        return `${team1Text}\n${team2Text}`;
    };

    const primary = result.primary;
    const secondary = result.secondary;
    const comparison = result.comparison;

    const primaryTeam1Sorted = sortPlayers(primary.team1.players);
    const primaryTeam2Sorted = sortPlayers(primary.team2.players);
    const primaryTeam1Power = calculateTeamPower(primary.team1.players);
    const primaryTeam2Power = calculateTeamPower(primary.team2.players);
    const primaryCopyText = buildCopyText(primary);
    const primaryAnalysis = parseAnalysis(primary.explanation ?? '');

    const secondaryTeam1Sorted = secondary ? sortPlayers(secondary.team1.players) : [];
    const secondaryTeam2Sorted = secondary ? sortPlayers(secondary.team2.players) : [];
    const secondaryTeam1Power = secondary ? calculateTeamPower(secondary.team1.players) : null;
    const secondaryTeam2Power = secondary ? calculateTeamPower(secondary.team2.players) : null;
    const secondaryCopyText = secondary ? buildCopyText(secondary) : '';

    const handleCopy = async (text: string, onCopied: (value: boolean) => void) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                onCopied(true);
            } else {
                throw new Error('Clipboard API not available');
            }
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

                if (successful) {
                    onCopied(true);
                } else {
                    console.error('Fallback copy failed.');
                }
            } catch (fallbackErr) {
                console.error('All copy attempts failed:', fallbackErr);
            }
        }

        setTimeout(() => onCopied(false), 2000);
    };

    const primaryRatingDiff = Math.abs(primary.team1.totalRating - primary.team2.totalRating);
    const renderAnalysisLineupRow = (label: 'T1' | 'T2', players: Person[]) => {
        const lineupTotal = players.reduce((total, player) => total + player.rating, 0);

        return (
            <div className="analysis-lineup-row">
                <span className={label === 'T1' ? 'analysis-token-t1' : 'analysis-token-t2'}>{label}</span>
                {!privacyMode && <span className="analysis-lineup-total">{lineupTotal}</span>}
                <span className="analysis-lineup-separator">:</span>
                <div className="analysis-lineup-players">
                    {players.map((player) => (
                        <span key={`${label}-${player.id}`} className="analysis-lineup-player">
                            <span className={`analysis-token-role analysis-token-role-${player.role.toLowerCase()}`}>
                                {player.role}
                            </span>
                            {!privacyMode && <span className="analysis-lineup-rating">{player.rating}</span>}
                            <span className="analysis-lineup-name">{player.nickname}</span>
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="team-result">
            <div className="result-header">
                <h3>Generated Teams</h3>
                <div className="result-stats">
                    {!privacyMode && <span>Rating Diff: {primaryRatingDiff}</span>}
                    <span>Social Satisfaction: {primary.socialSatisfactionPct}%</span>
                </div>
            </div>

            <div className="teams-container">
                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 1</span>
                        {!privacyMode && (
                            <div className="team-metrics">
                                <span className="team-power">Power: {formatValue(primaryTeam1Power)}</span>
                            </div>
                        )}
                    </div>
                    <div className="team-players">
                        {primaryTeam1Sorted.map((player) => (
                            <span key={player.id} style={{ marginRight: '8px', display: 'inline-block' }}>
                                {player.nickname}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 2</span>
                        {!privacyMode && (
                            <div className="team-metrics">
                                <span className="team-power">Power: {formatValue(primaryTeam2Power)}</span>
                            </div>
                        )}
                    </div>
                    <div className="team-players">
                        {primaryTeam2Sorted.map((player) => (
                            <span key={player.id} style={{ marginRight: '8px', display: 'inline-block' }}>
                                {player.nickname}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <button
                className="btn btn-primary copy-btn"
                onClick={() => handleCopy(primaryCopyText, setCopiedPrimary)}
            >
                {copiedPrimary ? 'Copied!' : 'Copy Teams'}
            </button>

            {primary.explanation && (
                <div className={`explanation-box ${primary.isFallback ? 'fallback' : ''}`}>
                    {primaryAnalysis.headline && <div className="analysis-headline">{primaryAnalysis.headline}</div>}
                    <div className="analysis-sections">
                        {primaryAnalysis.sections.map((section, sectionIndex) => (
                            <section key={`${section.title}-${sectionIndex}`} className="analysis-section">
                                <div className="analysis-section-title">{section.title}</div>
                                {section.title === 'Lineups' ? (
                                    <div className="analysis-lineup-lines">
                                        {renderAnalysisLineupRow('T1', primaryTeam1Sorted)}
                                        {renderAnalysisLineupRow('T2', primaryTeam2Sorted)}
                                    </div>
                                ) : (
                                    <div className="analysis-lines">
                                        {section.lines.map((line, lineIndex) => {
                                            const trimmed = line.trimStart();
                                            const isSubline = line.startsWith('  - ');
                                            const displayLine = trimmed.startsWith('- ')
                                                ? trimmed.slice(2)
                                                : trimmed;

                                            return (
                                                <div
                                                    key={`${section.title}-${lineIndex}-${displayLine}`}
                                                    className={`analysis-line ${isSubline ? 'analysis-subline' : ''}`}
                                                >
                                                    {renderAnalysisLine(displayLine)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                </div>
            )}

            {!primary.isFallback && (
                <>
                    <button
                        type="button"
                        className="planb-toggle-btn"
                        onClick={() => setShowPlanB((prev) => !prev)}
                        aria-expanded={showPlanB}
                        aria-controls="planb-panel"
                    >
                        {showPlanB ? 'Hide Second Option' : 'Show Second Option'}
                    </button>

                    {showPlanB && (
                        <div id="planb-panel" className="planb-panel">
                            <div className="planb-header">Second Option</div>
                            {secondary ? (
                                <>
                                    <div className="planb-reason">{comparison?.reason ?? result.secondaryReason}</div>

                                    <div className="planb-meta">
                                        <span>Score: {formatValue(secondary.score)}</span>
                                        <span>Stage: {formatStageLabel(secondary.stage)}</span>
                                        <span>Social: {secondary.socialSatisfactionPct}%</span>
                                    </div>

                                    {comparison && (
                                        <div className="planb-diff-grid">
                                            <div className="planb-diff-item">
                                                <span className="planb-diff-label">Score Delta</span>
                                                <span className="planb-diff-value">{formatDelta(comparison.scoreDelta)}</span>
                                            </div>
                                            <div className="planb-diff-item">
                                                <span className="planb-diff-label">Rating Diff Delta</span>
                                                <span className="planb-diff-value">{formatDelta(comparison.ratingDiffDelta)}</span>
                                            </div>
                                            <div className="planb-diff-item">
                                                <span className="planb-diff-label">Social Delta</span>
                                                <span className="planb-diff-value">{formatDelta(comparison.socialDelta)}</span>
                                            </div>
                                            <div className="planb-diff-item planb-diff-item-full">
                                                <span className="planb-diff-label">Moved to T1</span>
                                                <span className="planb-diff-value planb-diff-list">
                                                    {comparison.movedToTeam1.length > 0
                                                        ? comparison.movedToTeam1.join(', ')
                                                        : 'No swaps'}
                                                </span>
                                            </div>
                                            <div className="planb-diff-item planb-diff-item-full">
                                                <span className="planb-diff-label">Moved to T2</span>
                                                <span className="planb-diff-value planb-diff-list">
                                                    {comparison.movedToTeam2.length > 0
                                                        ? comparison.movedToTeam2.join(', ')
                                                        : 'No swaps'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="planb-teams">
                                        <div className="planb-team-box">
                                            <div className="planb-team-header">
                                                <div className="planb-team-title">Team 1</div>
                                                {!privacyMode && secondaryTeam1Power !== null && (
                                                    <span className="planb-team-power">
                                                        Power: {formatValue(secondaryTeam1Power)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="planb-team-players">
                                                {secondaryTeam1Sorted.map((player) => (
                                                    <span key={`planb-t1-${player.id}`}>{player.nickname}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="planb-team-box">
                                            <div className="planb-team-header">
                                                <div className="planb-team-title">Team 2</div>
                                                {!privacyMode && secondaryTeam2Power !== null && (
                                                    <span className="planb-team-power">
                                                        Power: {formatValue(secondaryTeam2Power)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="planb-team-players">
                                                {secondaryTeam2Sorted.map((player) => (
                                                    <span key={`planb-t2-${player.id}`}>{player.nickname}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-secondary planb-copy-btn"
                                        onClick={() => handleCopy(secondaryCopyText, setCopiedSecondary)}
                                    >
                                        {copiedSecondary ? 'Copied Second Option!' : 'Copy Second Option'}
                                    </button>
                                </>
                            ) : (
                                <div className="planb-empty">
                                    {result.secondaryReason ?? 'No second option available under current constraints.'}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
