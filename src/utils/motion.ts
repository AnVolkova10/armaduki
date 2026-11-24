// "Reduce motion" turns CSS animations off with a media query, but not what scripts start:
// smooth scrolls and Web Animations ask here first.

export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function scrollBehavior(): ScrollBehavior {
    return prefersReducedMotion() ? 'auto' : 'smooth';
}

export const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
export const MOVE_MS = 300;
