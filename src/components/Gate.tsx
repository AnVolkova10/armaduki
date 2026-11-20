import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import useAppStore from '../store/useAppStore';
import './Gate.css';

/** What the ball is doing. The scene's animations hang from it (see Gate.css). */
type Shot = 'idle' | 'aiming' | 'goal' | 'saved' | 'post';

// The run-up lasts as long as the backend takes to answer, and at least this, so it always reads.
const MIN_RUN_UP_MS = 900;
// How long the save and the post play before the ball is back on the spot.
const REPLAY_MS = 2100;

const CAPTION: Record<Shot, string> = {
    idle: 'Score to get in',
    aiming: 'Taking the shot...',
    goal: 'Goal!',
    saved: "Saved! That's not the key.",
    post: 'Off the post: no answer. Try again.',
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const CONFETTI = Array.from({ length: 18 }, (_, index) => index);

/**
 * The penalty at the door. It covers the app while the backend has not let this device in.
 * Typing the key takes the shot: the right key scores and the app opens, a wrong key is saved
 * by the keeper, and no answer hits the post. The keeper only waits while the first read asks.
 */
export function Gate({ onGone }: { onGone: () => void }) {
    const access = useAppStore((state) => state.access);
    const unlock = useAppStore((state) => state.unlock);
    const [key, setKey] = useState('');
    const [shot, setShot] = useState<Shot>('idle');
    const [attempts, setAttempts] = useState(0);
    const input = useRef<HTMLInputElement>(null);

    const open = access === 'open';
    const busy = shot !== 'idle';
    // The form keeps its place from the start and comes in once the backend asks for the key.
    const showForm = access === 'locked' || busy;

    useEffect(() => {
        if (access === 'locked' && shot === 'idle') input.current?.focus();
    }, [access, shot]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const typed = key.trim();
        if (!typed || busy) return;

        setShot('aiming');
        const [result] = await Promise.all([unlock(typed), wait(MIN_RUN_UP_MS)]);

        if (result === 'open') {
            setShot('goal');
            return;
        }

        setShot(result === 'wrong' ? 'saved' : 'post');
        await wait(REPLAY_MS);
        if (result === 'wrong') setKey('');
        setAttempts((count) => count + 1); // remounts the scene: ball on the spot, keeper on her line
        setShot('idle');
    };

    return (
        <div
            className="gate"
            data-shot={shot}
            data-open={open || undefined}
            inert={open}
            onAnimationEnd={(event) => {
                if (event.animationName === 'gate-leave') onGone();
            }}
        >
            <div className="gate-card">
                <p className="gate-brand">
                    armaduki
                    <img src="/ball.svg" alt="" aria-hidden="true" />
                </p>

                <svg key={attempts} className="gate-scene" viewBox="42 36 316 258" role="img" aria-label="A goalkeeper on her line, waiting for a penalty">
                    <defs>
                        <linearGradient id="gate-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#05060a" />
                            <stop offset="1" stopColor="#111522" />
                        </linearGradient>
                        <linearGradient id="gate-pitch" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#0f3a22" />
                            <stop offset="1" stopColor="#0a2415" />
                        </linearGradient>
                        <radialGradient id="gate-floodlight" cx="0.5" cy="0" r="0.9">
                            <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
                            <stop offset="1" stopColor="#fff" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="gate-ball-shade" cx="0.36" cy="0.3" r="0.8">
                            <stop offset="0" stopColor="#ffffff" />
                            <stop offset="0.7" stopColor="#e7e7ea" />
                            <stop offset="1" stopColor="#a9a9b2" />
                        </radialGradient>
                        <pattern id="gate-net" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <path d="M0 0H9M0 0V9" stroke="#fff" strokeWidth="0.7" opacity="0.5" />
                        </pattern>
                        <clipPath id="gate-jersey">
                            <path d="M174 114 Q200 104 226 114 L231 126 L220 132 L217 154 L183 154 L180 132 L169 126 Z" />
                        </clipPath>
                        <clipPath id="gate-mouth">
                            <rect x="73" y="69" width="254" height="128" />
                        </clipPath>
                    </defs>

                    {/* Night, floodlights and the stand */}
                    <rect width="400" height="300" fill="url(#gate-sky)" />
                    <g className="gate-crowd">
                        {Array.from({ length: 46 }, (_, index) => (
                            <circle
                                key={index}
                                cx={8 + ((index * 53) % 388)}
                                cy={10 + ((index * 29) % 44)}
                                r={1.4 + (index % 3) * 0.5}
                                fill={['#dc2626', '#f5f5f5', '#f59e0b', '#a3a3a3'][index % 4]}
                                opacity={0.2 + (index % 5) * 0.07}
                            />
                        ))}
                    </g>
                    <rect className="gate-floodlight" width="400" height="200" fill="url(#gate-floodlight)" />

                    {/* Pitch */}
                    <path d="M0 196 H400 V300 H0 Z" fill="url(#gate-pitch)" />
                    <path d="M0 214 H400 V232 H0 Z M0 252 H400 V274 H0 Z" fill="#fff" opacity="0.03" />
                    <path d="M0 196 H400" stroke="#fff" strokeWidth="2" opacity="0.75" />
                    <path d="M112 196 L84 242 H316 L288 196" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.5" />
                    <ellipse cx="200" cy="264" rx="5" ry="1.8" fill="#fff" opacity="0.55" />

                    {/* Goal: net first, frame on top */}
                    <g className="gate-goal">
                        <path d="M73 69 H327 V197 H73 Z" fill="#000" opacity="0.35" />
                        <rect className="gate-net" x="73" y="69" width="254" height="128" fill="url(#gate-net)" />
                        <g clipPath="url(#gate-mouth)">
                            <circle className="gate-net-bulge" cx="304" cy="92" r="26" fill="none" stroke="#fff" strokeWidth="3" />
                        </g>
                        <path d="M73 69 L92 86 V197 M327 69 L308 86 V197 M92 86 H308" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.28" />
                        <path className="gate-frame" d="M70 198 V66 H330 V198" fill="none" stroke="#f5f5f5" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
                        <path d="M70 198 V66 H330" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.9" />
                    </g>

                    {/* Keeper. Feet on the line at (200, 196); every part hangs from this group. */}
                    <ellipse className="gate-keeper-shadow" cx="200" cy="199" rx="31" ry="4.5" fill="#000" opacity="0.45" />
                    <g className="gate-keeper">
                        {/* Legs: strong thighs, socks with the flag at the top, boots */}
                        <path d="M186 152 L182 176 L186 177 L196 176 L199 153 Z M214 152 L218 176 L214 177 L204 176 L201 153 Z" fill="#b97a50" />
                        <path d="M181 175 H197 L195 192 H183 Z M203 175 H219 L217 192 H205 Z" fill="#4c1d95" />
                        <path d="M181 175 H197 V177.4 H181 Z M203 175 H219 V177.4 H203 Z" fill="#d52d00" />
                        <path d="M181 177.4 H197 V179 H181 Z M203 177.4 H219 V179 H203 Z" fill="#fff" />
                        <path d="M181 179 H197 V181 H181 Z M203 179 H219 V181 H203 Z" fill="#a30262" />
                        <path d="M178 196 Q178 189 186 190 H196 Q198 193 196 196 Z M222 196 Q222 189 214 190 H204 Q202 193 204 196 Z" fill="#f5f5f5" />
                        <path d="M178 196 H196 M222 196 H204" stroke="#dc2626" strokeWidth="1.6" />

                        {/* Shorts */}
                        <path d="M181 148 H219 L223 170 H203 L200 160 L197 170 H177 Z" fill="#0c0c0e" />
                        <path d="M181 148 L177 170 H180 L184 148 Z M219 148 L223 170 H220 L216 148 Z" fill="#dc2626" />

                        {/* Arms: sleeve, forearm, glove. They turn at the shoulder. */}
                        <g className="gate-arm gate-arm-left">
                            <path d="M176 114 L160 138 L168 144 L183 124 Z" fill="#6d28d9" />
                            <path d="M161 137 L150 154 L158 160 L168 144 Z" fill="#b97a50" />
                            <path d="M154 149 L160 153 M156.5 145.5 L162.5 149.5" stroke="#3b2a22" strokeWidth="1.1" opacity="0.75" />
                            <path d="M139 152 Q138 144 146 145 L160 154 Q164 162 157 168 L146 170 Q137 166 139 152 Z" fill="#f5f5f5" />
                            <path d="M142 153 L156 163 M146 148 L159 157" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                        </g>
                        <g className="gate-arm gate-arm-right">
                            <path d="M224 114 L240 138 L232 144 L217 124 Z" fill="#6d28d9" />
                            <path d="M239 137 L250 154 L242 160 L232 144 Z" fill="#b97a50" />
                            {/* Labrys, small, on the forearm */}
                            <path d="M243 146 L246.5 152.5 M241.2 148.6 Q243 145 246.4 145.6 Q245.2 148.4 241.2 148.6 Z" stroke="#3b2a22" strokeWidth="0.9" fill="#3b2a22" opacity="0.8" />
                            <path d="M261 152 Q262 144 254 145 L240 154 Q236 162 243 168 L254 170 Q263 166 261 152 Z" fill="#f5f5f5" />
                            <path d="M258 153 L244 163 M254 148 L241 157" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                        </g>

                        {/* Jersey with the lesbian flag across the chest */}
                        <path d="M174 114 Q200 104 226 114 L231 126 L220 132 L217 154 L183 154 L180 132 L169 126 Z" fill="#6d28d9" />
                        <g clipPath="url(#gate-jersey)">
                            <rect x="165" y="124" width="70" height="3.4" fill="#d52d00" />
                            <rect x="165" y="127.4" width="70" height="3.4" fill="#ff9a56" />
                            <rect x="165" y="130.8" width="70" height="3.4" fill="#ffffff" />
                            <rect x="165" y="134.2" width="70" height="3.4" fill="#d162a4" />
                            <rect x="165" y="137.6" width="70" height="3.4" fill="#a30262" />
                            <path d="M183 154 L180 132 L185 132 L188 154 Z M217 154 L220 132 L215 132 L212 154 Z" fill="#2e1065" opacity="0.55" />
                        </g>
                        <path d="M192 108 Q200 114 208 108 L206 106 Q200 110 194 106 Z" fill="#f5f5f5" />
                        <text x="200" y="150.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#f5f5f5" fontFamily="Inter, system-ui, sans-serif">1</text>

                        {/* Neck and head */}
                        <path d="M195 99 H205 V110 Q200 113 195 110 Z" fill="#a8683f" />
                        <g className="gate-head">
                            <path d="M187.5 88 Q187 76 200 75.5 Q213 76 212.5 88 L211.5 97 Q209 105 200 106.5 Q191 105 188.5 97 Z" fill="#b97a50" />
                            {/* Ears, with two rings on one of them */}
                            <path d="M187.6 88 Q185 88 185.6 92.5 Q186.4 96 188.4 95.6 Z M212.4 88 Q215 88 214.4 92.5 Q213.6 96 211.6 95.6 Z" fill="#a8683f" />
                            <circle cx="186" cy="95.4" r="1.2" fill="none" stroke="#d4d4d8" strokeWidth="0.7" />
                            <circle cx="185.6" cy="92.4" r="0.7" fill="#d4d4d8" />
                            {/* Shaved sides */}
                            <path d="M187.4 89 Q186.6 79.5 191.8 76.6 L192.8 86.5 Q190 87 187.4 89 Z M212.6 89 Q213.4 79.5 208.2 76.6 L207.2 86.5 Q210 87 212.6 89 Z" fill="#7a5a4a" />
                            <path d="M188.6 85 L191.8 83.4 M188.4 82 L191.4 80.4 M211.4 85 L208.2 83.4 M211.6 82 L208.6 80.4" stroke="#5b4034" strokeWidth="0.6" />
                            {/* Top: short, swept to one side, with a dyed streak */}
                            <path d="M191 80.5 Q189.6 70.5 199.5 69 Q210 68.2 210.6 77.5 Q210.8 80.5 209 81.5 Q208 78 203 77.6 Q196.5 77.2 193 82.5 Z" fill="#1b1311" />
                            <path d="M199.8 69.2 Q208 68.6 210.2 75.2 Q205.6 71.8 200.4 73.4 Z" fill="#d162a4" />
                            {/* Brows (one with a slit), eyes, nose, septum ring, half smile */}
                            <path d="M191.6 86.2 Q194.6 84.2 197.8 85.6" fill="none" stroke="#1b1311" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M202.2 85.6 Q203.6 84.6 205 84.7 M206.3 84.9 Q207.6 85.2 208.6 86.2" fill="none" stroke="#1b1311" strokeWidth="1.5" strokeLinecap="round" />
                            <ellipse cx="194.8" cy="89.6" rx="1.3" ry="1.5" fill="#17110f" />
                            <ellipse cx="205.4" cy="89.6" rx="1.3" ry="1.5" fill="#17110f" />
                            <path d="M192.8 88 Q194.8 86.8 196.8 88 M203.4 88 Q205.4 86.8 207.4 88" fill="none" stroke="#17110f" strokeWidth="0.7" strokeLinecap="round" />
                            <path d="M200 89.5 L198.8 95 Q200 96 201.4 95" fill="none" stroke="#8f5632" strokeWidth="0.8" strokeLinecap="round" />
                            <path d="M198.8 95.6 Q200.1 98.2 201.5 95.6" fill="none" stroke="#e4e4e7" strokeWidth="0.8" strokeLinecap="round" />
                            <path d="M196 100.2 Q200.5 102.4 205 99.4" fill="none" stroke="#7a3f2a" strokeWidth="1.1" strokeLinecap="round" />
                        </g>
                    </g>

                    {/* Ball on the spot */}
                    <ellipse className="gate-ball-shadow" cx="200" cy="277" rx="13" ry="3.2" fill="#000" opacity="0.5" />
                    <circle className="gate-ball-ring" cx="200" cy="263" r="14" fill="none" stroke="#dc2626" strokeWidth="2" />
                    <g className="gate-ball">
                        <g className="gate-ball-spin">
                            <circle cx="200" cy="263" r="13" fill="url(#gate-ball-shade)" />
                            <path d="M200 256.6 L206.1 261 L203.8 268.1 H196.2 L193.9 261 Z" fill="#17171a" />
                            <path d="M200 256.6 V250 M206.1 261 L212.3 259 M203.8 268.1 L207.6 273.5 M196.2 268.1 L192.4 273.5 M193.9 261 L187.7 259" stroke="#17171a" strokeWidth="1.4" />
                            <path d="M193.5 251.8 L200 250 L206.5 251.8 M212.3 259 L213 265 L207.6 273.5 M192.4 273.5 L187 265 L187.7 259" fill="none" stroke="#17171a" strokeWidth="1.1" opacity="0.6" />
                            <circle cx="200" cy="263" r="13" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* Result: flash, word and confetti */}
                    <rect className="gate-flash" width="400" height="300" fill="#fff" />
                    <g className="gate-confetti">
                        {CONFETTI.map((index) => (
                            <rect
                                key={index}
                                x={40 + ((index * 67) % 320)}
                                y={22}
                                width={index % 3 === 0 ? 7 : 5}
                                height={index % 2 === 0 ? 3 : 7}
                                fill={['#d52d00', '#ff9a56', '#ffffff', '#d162a4', '#a30262', '#dc2626'][index % 6]}
                                style={{ animationDelay: `${0.5 + (index % 6) * 0.07}s`, ['--drift' as string]: `${((index % 5) - 2) * 14}px` }}
                            />
                        ))}
                    </g>
                    <text className="gate-word gate-word-goal" x="200" y="160" textAnchor="middle">GOAL!</text>
                    <text className="gate-word gate-word-saved" x="200" y="160" textAnchor="middle">SAVED!</text>
                    <text className="gate-word gate-word-post" x="200" y="160" textAnchor="middle">POST!</text>
                </svg>

                <p className="gate-caption" role="status">
                    {access === 'asking' && shot === 'idle' ? 'Warming up...' : CAPTION[shot]}
                </p>

                <form className="gate-form" data-shown={showForm || undefined} onSubmit={submit}>
                    <input
                        ref={input}
                        className="gate-input"
                        type="password"
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-label="Access key"
                        placeholder="Key"
                        value={key}
                        readOnly={busy || open}
                        onChange={(event) => setKey(event.target.value)}
                    />
                    <button type="submit" className="gate-shoot" disabled={!key.trim() || busy || open}>
                        Shoot
                    </button>
                </form>
            </div>
        </div>
    );
}
