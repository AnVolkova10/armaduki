import type { ReactNode } from 'react';

export type IconName =
    | 'check'
    | 'x'
    | 'arrowRight'
    | 'arrowsBoth'
    | 'chevronDown'
    | 'pencil'
    | 'trash'
    | 'search'
    | 'arrowDown'
    | 'arrowUp';

// One family of line icons, the same weight everywhere. Drawn here because the app's fonts only
// carry Latin, so a typed check or arrow would fall back to a system font.
const SHAPES: Record<IconName, ReactNode> = {
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    arrowRight: <path d="M4 12h15m-5-5l5 5-5 5" />,
    arrowsBoth: <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    pencil: <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
    trash: (
        <>
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
        </>
    ),
    arrowDown: <path d="M12 5v14m-5-5l5 5 5-5" />,
    arrowUp: <path d="M12 19V5m-5 5l5-5 5 5" />,
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
    return (
        <svg
            className="icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {SHAPES[name]}
        </svg>
    );
}
