import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '../i18n';
import useAppStore from '../store/useAppStore';
import { LangSwitch } from './LangSwitch';
import './Gate.css';

/** What the ball is doing. The scene's animations hang from it (see Gate.css). */
type Shot = 'idle' | 'aiming' | 'goal' | 'saved' | 'post';

// The run-up lasts as long as the backend takes to answer, and at least this, so it always reads.
const MIN_RUN_UP_MS = 800;
// The save and the post end with the ball back on the spot and the keeper on their line:
// these match the length of their animations in Gate.css.
const REPLAY_MS: Record<'saved' | 'post', number> = { saved: 2800, post: 2200 };

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * The penalty at the door. It covers the app while the backend has not let this device in.
 * Typing the key takes the shot: the right key scores and the app opens, a wrong key is saved
 * by the keeper, and no answer hits the post. The keeper only waits while the first read asks.
 */
export function Gate({ onGone }: { onGone: () => void }) {
    const access = useAppStore((state) => state.access);
    const unlock = useAppStore((state) => state.unlock);
    const t = useT();
    const caption: Record<Shot, string> = {
        idle: t.gate.idle,
        aiming: '',
        goal: t.gate.goal,
        saved: t.gate.saved,
        post: t.gate.post,
    };
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

        // Where the keeper's shuffle stands right now: the shot starts from there (see --gk-x in Gate.css).
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
                <svg ref={scene} className="gate-scene" viewBox="40 34 240 180" role="img" aria-label={t.gate.scene}>
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
                        Feet on the line at (160, 150). The rig, outside in: gate-gk-step shuffles, gate-gk dives,
                        gate-gk-top sinks when the knees bend; thighs turn at the hips and shins at the knees,
                        upper arms at the shoulders and forearms at the elbows. Limbs are drawn straight down. */}
                    <ellipse className="gate-gk-shadow" cx="160" cy="151.5" rx="13" ry="2.2" fill="#000" opacity="0.4" />
                    <g className="gate-gk-step">
                        <g className="gate-gk">
                            <g className="gate-gk-top">
                                <g className="gate-gk-thigh gate-gk-thigh-l">
                                    <path d="M155.8 128V138" stroke="#3a3b42" strokeWidth="6.2" strokeLinecap="round" />
                                    <path d="M155.8 128V138" stroke="#08080a" strokeWidth="5" strokeLinecap="round" />
                                    <g className="gate-gk-shin gate-gk-shin-l">
                                        <path d="M155.8 138V147.4" stroke="#3a3b42" strokeWidth="5.8" strokeLinecap="round" />
                                        <path d="M155.8 138V147.4" stroke="#08080a" strokeWidth="4.6" strokeLinecap="round" />
                                        <path d="M152.8 149.4H158.8" stroke="#e7e5e4" strokeWidth="2.8" strokeLinecap="round" />
                                    </g>
                                </g>
                                <g className="gate-gk-thigh gate-gk-thigh-r">
                                    <path d="M164.2 128V138" stroke="#3a3b42" strokeWidth="6.2" strokeLinecap="round" />
                                    <path d="M164.2 128V138" stroke="#08080a" strokeWidth="5" strokeLinecap="round" />
                                    <g className="gate-gk-shin gate-gk-shin-r">
                                        <path d="M164.2 138V147.4" stroke="#3a3b42" strokeWidth="5.8" strokeLinecap="round" />
                                        <path d="M164.2 138V147.4" stroke="#08080a" strokeWidth="4.6" strokeLinecap="round" />
                                        <path d="M161.2 149.4H167.2" stroke="#e7e5e4" strokeWidth="2.8" strokeLinecap="round" />
                                    </g>
                                </g>

                                {/* Jersey with the team's white mark */}
                                <path d="M151.6 107.4Q160 103.6 168.4 107.4L167.4 128.6H152.6Z" fill="#dc2626" />
                                <path d="M152.6 128.6L153 121H167L167.4 128.6Z" fill="#000" opacity="0.14" />
                                <path d="M163.2 110.6Q165.8 111.6 165.4 114.8Q163.2 115.2 162.2 113.4Q162 111.6 163.2 110.6Z" fill="#fff" />

                                {/* Arms before the head: raised, they frame the keeper's face instead of covering it */}
                                <g className="gate-gk-arm gate-gk-arm-l">
                                    <path d="M153 109V118" stroke="#3a3b42" strokeWidth="5.2" strokeLinecap="round" />
                                    <path d="M153 109V118" stroke="#08080a" strokeWidth="4" strokeLinecap="round" />
                                    <g className="gate-gk-fore gate-gk-fore-l">
                                        <path d="M153 118V125.6" stroke="#3a3b42" strokeWidth="5" strokeLinecap="round" />
                                        <path d="M153 118V125.6" stroke="#08080a" strokeWidth="3.8" strokeLinecap="round" />
                                        <path d="M150.1 126.2Q149.8 125 153 125Q156.2 125 155.9 126.2L156.3 131.4Q156.2 133.8 153 133.9Q149.8 133.8 149.7 131.4Z" fill="#f97316" />
                                        <ellipse cx="156.5" cy="128.6" rx="1.5" ry="2.3" fill="#f97316" transform="rotate(-24 156.5 128.6)" />
                                        <path d="M150.4 126.6H155.6" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" />
                                        <path d="M151.9 130.4V133.2M154.1 130.4V133.2" stroke="#c2410c" strokeWidth="0.7" strokeLinecap="round" />
                                    </g>
                                </g>
                                <g className="gate-gk-arm gate-gk-arm-r">
                                    <path d="M167 109V118" stroke="#3a3b42" strokeWidth="5.2" strokeLinecap="round" />
                                    <path d="M167 109V118" stroke="#08080a" strokeWidth="4" strokeLinecap="round" />
                                    <g className="gate-gk-fore gate-gk-fore-r">
                                        <path d="M167 118V125.6" stroke="#3a3b42" strokeWidth="5" strokeLinecap="round" />
                                        <path d="M167 118V125.6" stroke="#08080a" strokeWidth="3.8" strokeLinecap="round" />
                                        <path d="M164.1 126.2Q163.8 125 167 125Q170.2 125 169.9 126.2L170.3 131.4Q170.2 133.8 167 133.9Q163.8 133.8 163.7 131.4Z" fill="#f97316" />
                                        <ellipse cx="163.5" cy="128.6" rx="1.5" ry="2.3" fill="#f97316" transform="rotate(24 163.5 128.6)" />
                                        <path d="M164.4 126.6H169.6" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" />
                                        <path d="M165.9 130.4V133.2M168.1 130.4V133.2" stroke="#c2410c" strokeWidth="0.7" strokeLinecap="round" />
                                    </g>
                                </g>

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
                    </g>

                    {/* Ball: the one in the logo */}
                    <ellipse className="gate-ball-shadow" cx="160" cy="206" rx="9" ry="2.2" fill="#000" opacity="0.45" />
                    <circle className="gate-ball-ring" cx="160" cy="196" r="10" fill="none" stroke="#dc2626" strokeWidth="1.4" />
                    <g className="gate-ball">
                        <g className="gate-ball-spin">
                            <image href="/ball.svg" x="151" y="187" width="18" height="18" />
                        </g>
                    </g>
                </svg>

                <p className="gate-caption" role="status">
                    {access === 'asking' && shot === 'idle' ? '' : caption[shot]}
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
                        aria-label={t.gate.keyLabel}
                        placeholder={t.gate.keyPlaceholder}
                        value={key}
                        readOnly={busy || open}
                        onChange={(event) => setKey(event.target.value)}
                    />
                    <button type="submit" className="gate-shoot" disabled={!key.trim() || busy || open}>
                        {t.gate.shoot}
                    </button>
                </form>
            </div>
            <LangSwitch className="gate-lang" />
        </div>
    );
}
