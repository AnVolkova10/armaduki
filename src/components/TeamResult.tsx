import { useState } from 'react';
import type { GeneratedTeams } from '../types';
import useAppStore from '../store/useAppStore';
import './TeamResult.css';

interface TeamResultProps {
    result: GeneratedTeams;
}

interface AnalysisSection {
    title: string;
    lines: string[];
}

function renderAnalysisLine(line: string) {
    const parts = line.split(/(T1|T2)/g);

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

        return <span key={`text-${index}`}>{part}</span>;
    });
}

function parseAnalysis(explanation: string): { headline: string | null; sections: AnalysisSection[] } {
    const rawLines = explanation
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.trim().length > 0);

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
        const fallbackLines = headline
            ? rawLines.filter(line => line.trim() !== headline)
            : rawLines;

        if (fallbackLines.length > 0) {
            sections.push({ title: 'Details', lines: fallbackLines });
        }
    }

    return { headline, sections };
}

export function TeamResult({ result }: TeamResultProps) {
    const { privacyMode } = useAppStore();
    const [copied, setCopied] = useState(false);

    const rolePriority: Record<string, number> = { GK: 0, FLEX: 1, DEF: 2, MID: 3, ATT: 4 };

    const sortPlayers = (players: typeof result.team1.players) => {
        return [...players].sort((a, b) => {
            const pA = rolePriority[a.role] ?? 99;
            const pB = rolePriority[b.role] ?? 99;
            return pA - pB;
        });
    };

    const team1Sorted = sortPlayers(result.team1.players);
    const team2Sorted = sortPlayers(result.team2.players);

    const team1Text = team1Sorted.map(p => p.nickname).join(' ');
    const team2Text = team2Sorted.map(p => p.nickname).join(' ');
    const fullText = `${team1Text}\n${team2Text}`;

    const analysis = parseAnalysis(result.explanation ?? '');

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fullText);
                setCopied(true);
            } else {
                throw new Error('Clipboard API not available');
            }
        } catch {
            try {
                const textArea = document.createElement('textarea');
                textArea.value = fullText;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    setCopied(true);
                } else {
                    console.error('Fallback copy failed.');
                }
            } catch (fallbackErr) {
                console.error('All copy attempts failed:', fallbackErr);
            }
        }

        setTimeout(() => setCopied(false), 2000);
    };

    const ratingDiff = Math.abs(result.team1.totalRating - result.team2.totalRating);

    return (
        <div className="team-result">
            <div className="result-header">
                <h3>Generated Teams</h3>
                <div className="result-stats">
                    {!privacyMode && <span>Rating Diff: {ratingDiff}</span>}
                    <span>Social Satisfaction: {result.socialSatisfactionPct}%</span>
                </div>
            </div>

            <div className="teams-container">
                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 1</span>
                        {!privacyMode && <span className="team-rating">* {result.team1.totalRating}</span>}
                    </div>
                    <div className="team-players">
                        {team1Sorted.map(p => (
                            <span key={p.id} style={{ marginRight: '8px', display: 'inline-block' }}>
                                {p.nickname}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 2</span>
                        {!privacyMode && <span className="team-rating">* {result.team2.totalRating}</span>}
                    </div>
                    <div className="team-players">
                        {team2Sorted.map(p => (
                            <span key={p.id} style={{ marginRight: '8px', display: 'inline-block' }}>
                                {p.nickname}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <button className="btn btn-primary copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy Teams'}
            </button>

            {result.explanation && (
                <div className={`explanation-box ${result.isFallback ? 'fallback' : ''}`}>
                    {analysis.headline && (
                        <div className="analysis-headline">{analysis.headline}</div>
                    )}
                    <div className="analysis-sections">
                        {analysis.sections.map((section, sectionIndex) => (
                            <section key={`${section.title}-${sectionIndex}`} className="analysis-section">
                                <div className="analysis-section-title">{section.title}</div>
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
                            </section>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
