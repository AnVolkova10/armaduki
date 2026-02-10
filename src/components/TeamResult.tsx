import { useState } from 'react';
import type { GeneratedTeams } from '../types';
import useAppStore from '../store/useAppStore';
import './TeamResult.css';

interface TeamResultProps {
    result: GeneratedTeams;
}

export function TeamResult({ result }: TeamResultProps) {
    const { privacyMode } = useAppStore();
    const [copied, setCopied] = useState(false);

    const rolePriority: Record<string, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3, FLEX: 4 };

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

    const analysisLines = (result.explanation ?? '')
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.trim().length > 0);

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
                    <div className="analysis-grid">
                        {analysisLines.map((line, index) => (
                            <div
                                key={`${index}-${line}`}
                                className={`analysis-line ${line.startsWith('  - ') ? 'analysis-subline' : ''}`}
                            >
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
