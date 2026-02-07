
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
            await navigator.clipboard.writeText(fullText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const ratingDiff = Math.abs(result.team1.totalRating - result.team2.totalRating);

    return (
        <div className="team-result">
            <div className="result-header">
                <h3>Generated Teams</h3>
                <div className="result-stats">
                    {!privacyMode && <span>Diferencia Rating: {ratingDiff}</span>}
                    <span>Score Relaciones: {result.relationshipScore}</span>
                </div>
            </div>

            <div className="teams-container">
                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Equipo 1</span>
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
                        <span className="team-name">Equipo 2</span>
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
