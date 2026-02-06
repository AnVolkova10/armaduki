import { useState } from 'react';
import type { GeneratedTeams } from '../types';
import './TeamResult.css';

interface TeamResultProps {
    result: GeneratedTeams;
}

export function TeamResult({ result }: TeamResultProps) {
    const [copied, setCopied] = useState(false);

    const team1Text = result.team1.players.map(p => p.nickname).join(' ');
    const team2Text = result.team2.players.map(p => p.nickname).join(' ');
    const fullText = `Team 1: ${team1Text}\nTeam 2: ${team2Text}`;

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
                    <span>Rating diff: {ratingDiff}</span>
                    <span>Relationship score: {result.relationshipScore}</span>
                </div>
            </div>

            <div className="teams-container">
                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 1</span>
                        <span className="team-rating">★ {result.team1.totalRating}</span>
                    </div>
                    <div className="team-players">{team1Text}</div>
                </div>

                <div className="team-box">
                    <div className="team-header">
                        <span className="team-name">Team 2</span>
                        <span className="team-rating">★ {result.team2.totalRating}</span>
                    </div>
                    <div className="team-players">{team2Text}</div>
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
