import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import useAppStore from '../store/useAppStore';
import './Gate.css';

/** What the ball is doing. The scene's animations hang from it (see Gate.css). */
type Shot = 'idle' | 'aiming' | 'goal' | 'saved' | 'post';

// The run-up lasts as long as the backend takes to answer, and at least this, so it always reads.
const MIN_RUN_UP_MS = 800;
// The save and the post end with the ball back on the spot and the keeper on her line:
// these match the length of their animations in Gate.css.
const REPLAY_MS: Record<'saved' | 'post', number> = { saved: 2800, post: 2200 };

const CAPTION: Record<Shot, string> = {
    idle: 'Score to get in',
    aiming: '',
    goal: 'Goal',
    saved: "Saved. That's not the key.",
    post: 'Off the post. No answer, try again.',
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

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
    const input = useRef<HTMLInputElement>(null);
    const scene = useRef<SVGSVGElement>(null);

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

        // Where her shuffle stands right now: the shot starts from there (see --gk-x in Gate.css).
        const step = scene.current?.querySelector('.gate-gk-step');
        const offset = step ? new DOMMatrixReadOnly(getComputedStyle(step).transform).m41 : 0;
        scene.current?.style.setProperty('--gk-x', `${offset}px`);

        if (result === 'open') {
            setShot('goal');
            return;
        }

        const replay = result === 'wrong' ? 'saved' : 'post';
        setShot(replay);
        await wait(REPLAY_MS[replay]);
        if (result === 'wrong') setKey('');
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

                {/* Ground line at y=150, goal from (60, 50) to (260, 150), ball on the spot at (160, 196). */}
                <svg ref={scene} className="gate-scene" viewBox="40 34 240 180" role="img" aria-label="A goalkeeper on her line, waiting for a penalty">
                    <defs>
                        <linearGradient id="gate-back" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#111216" />
                            <stop offset="1" stopColor="#191b21" />
                        </linearGradient>
                        <linearGradient id="gate-pitch" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#143524" />
                            <stop offset="1" stopColor="#0d2419" />
                        </linearGradient>
                        <pattern id="gate-net" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <path d="M0 0H8M0 0V8" stroke="#fff" strokeWidth="0.5" opacity="0.32" />
                        </pattern>
                        <radialGradient id="gate-net-glow">
                            <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
                            <stop offset="1" stopColor="#fff" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    <rect width="320" height="220" fill="url(#gate-back)" />
                    <rect y="150" width="320" height="70" fill="url(#gate-pitch)" />
                    <path d="M0 150H320" stroke="#fff" strokeWidth="1.4" opacity="0.5" />
                    <ellipse cx="160" cy="205" rx="3.4" ry="1.2" fill="#fff" opacity="0.4" />

                    {/* Goal */}
                    <g className="gate-goal">
                        <rect className="gate-net" x="61.5" y="51.5" width="197" height="98.5" fill="url(#gate-net)" />
                        <circle className="gate-net-glow" cx="236" cy="68" r="26" fill="url(#gate-net-glow)" />
                        <path d="M60 151V50H260V151" fill="none" stroke="#f4f4f5" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* Keeper: small and slim, red jersey over black sleeves, black trousers, hair tied back.
                        Feet on the line at (160, 150). gate-gk-step shuffles, gate-gk dives. */}
                    <ellipse className="gate-gk-shadow" cx="160" cy="151.5" rx="13" ry="2.2" fill="#000" opacity="0.4" />
                    <g className="gate-gk-step">
                        <g className="gate-gk">
                            {/* Legs */}
                            <path d="M156.4 127L154.6 146M163.6 127L165.4 146" stroke="#3a3b42" strokeWidth="6.4" strokeLinecap="round" />
                            <path d="M156.4 127L154.6 146M163.6 127L165.4 146" stroke="#08080a" strokeWidth="5.2" strokeLinecap="round" />
                            <path d="M151.4 149.2H157.4M162.6 149.2H168.6" stroke="#e7e5e4" strokeWidth="3" strokeLinecap="round" />

                            {/* Arms: black sleeves and gloves. Each turns at its shoulder. */}
                            <g className="gate-gk-arm gate-gk-arm-l">
                                <path d="M153 109L142 124" stroke="#3a3b42" strokeWidth="5.4" strokeLinecap="round" />
                                <path d="M153 109L142 124" stroke="#08080a" strokeWidth="4.2" strokeLinecap="round" />
                                <circle cx="140.2" cy="126.6" r="4.6" fill="#f97316" />
                                <path d="M137.6 125.2L142.6 128.4" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" />
                            </g>
                            <g className="gate-gk-arm gate-gk-arm-r">
                                <path d="M167 109L178 124" stroke="#3a3b42" strokeWidth="5.4" strokeLinecap="round" />
                                <path d="M167 109L178 124" stroke="#08080a" strokeWidth="4.2" strokeLinecap="round" />
                                <circle cx="179.8" cy="126.6" r="4.6" fill="#f97316" />
                                <path d="M182.4 125.2L177.4 128.4" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" />
                            </g>

                            {/* Jersey with the team's white mark */}
                            <path d="M151.6 107.4Q160 103.6 168.4 107.4L167.4 128.6H152.6Z" fill="#dc2626" />
                            <path d="M152.6 128.6L153 121H167L167.4 128.6Z" fill="#000" opacity="0.14" />
                            <path d="M163.2 110.6Q165.8 111.6 165.4 114.8Q163.2 115.2 162.2 113.4Q162 111.6 163.2 110.6Z" fill="#fff" />

                            {/* Head: hair pulled back into a small bun */}
                            <rect x="157.6" y="101.6" width="4.8" height="5" rx="1.6" fill="#b98562" />
                            <circle cx="165.4" cy="89.6" r="3.2" fill="#1c1513" />
                            <circle cx="160" cy="96.4" r="7.2" fill="#c9966f" />
                            <path d="M152.8 96.6Q152.4 88.6 160 88.4Q167.6 88.6 167.2 96.6Q164.6 92.2 160 92Q155.4 92.2 152.8 96.6Z" fill="#1c1513" />
                            <circle cx="157.4" cy="97.4" r="0.9" fill="#1c1513" />
                            <circle cx="162.6" cy="97.4" r="0.9" fill="#1c1513" />
                            <path d="M157.6 100.2Q160 102.2 162.4 100.2" fill="none" stroke="#7c4a33" strokeWidth="0.9" strokeLinecap="round" />
                        </g>
                    </g>

                    {/* Ball */}
                    <ellipse className="gate-ball-shadow" cx="160" cy="206" rx="9" ry="2.2" fill="#000" opacity="0.45" />
                    <circle className="gate-ball-ring" cx="160" cy="196" r="10" fill="none" stroke="#dc2626" strokeWidth="1.4" />
                    <g className="gate-ball">
                        <g className="gate-ball-spin">
                            <circle cx="160" cy="196" r="9" fill="#f4f4f5" />
                            <path d="M160 191.6L164.2 194.6L162.6 199.5H157.4L155.8 194.6Z" fill="#18181b" />
                            <path d="M160 191.6V187M164.2 194.6L168.5 193.2M162.6 199.5L165.2 203.3M157.4 199.5L154.8 203.3M155.8 194.6L151.5 193.2" stroke="#18181b" strokeWidth="1" />
                            <circle cx="160" cy="196" r="9" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="0.6" />
                        </g>
                    </g>
                </svg>

                <p className="gate-caption" role="status">
                    {access === 'asking' && shot === 'idle' ? '' : CAPTION[shot]}
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
