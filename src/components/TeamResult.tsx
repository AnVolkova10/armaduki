
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

    const rolePriority: Record<string, number> = { 'GK': 0, 'DEF': 1, 'MID': 2, 'ATT': 3, 'FLEX': 4 };

    const sortPlayers = (players: typeof result.team1.players) => {
        return [...players].sort((a, b) => {
            const pA = rolePriority[a.role] ?? 99;
            const pB = rolePriority[b.role] ?? 99;
            return pA - pB;
        });
    };

    const team1Sorted = sortPlayers(result.team1.players);
    const team2Sorted = sortPlayers(result.team2.players);

    // Just names separated by spaces, one team per line
    const team1Text = team1Sorted.map(p => p.nickname).join(' ');
    const team2Text = team2Sorted.map(p => p.nickname).join(' ');
    const fullText = `${team1Text}\n${team2Text}`;

    const handleCopy = async () => {
        try {
            // INTENTO 1: API Moderna (funciona en HTTPS y localhost)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fullText);
                setCopied(true);
            } else {
                throw new Error('Clipboard API not available');
            }
        } catch (err) {
            // INTENTO 2: Fallback para HTTP/Mobile (crea un textarea invisible)
            try {
                const textArea = document.createElement("textarea");
                textArea.value = fullText;

                // Asegurar que no sea visible pero sea parte del DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
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
                    <span>Relationship Score: {result.relationshipScore}</span>
                </div>
            </div>

            <div className="teams-container">
                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 1</span>
                        {!privacyMode && <span className="team-rating">★ {result.team1.totalRating}</span>}
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
                        {!privacyMode && <span className="team-rating">★ {result.team2.totalRating}</span>}
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
                {copied ? '✓ Copied!' : 'Copy Teams'}
            </button>

            <div className="raw-output">
                <pre>{fullText}</pre>
            </div>
        </div>
    );
}
