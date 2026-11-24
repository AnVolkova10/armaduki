import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { EASE_OUT, MOVE_MS, prefersReducedMotion } from '../utils/motion';

interface Spot {
    left: number;
    top: number;
}

function measure(container: HTMLElement): Map<string, Spot> {
    const spots = new Map<string, Spot>();
    for (const child of container.children) {
        const element = child as HTMLElement;
        const id = element.dataset.flipId;
        if (id) spots.set(id, { left: element.offsetLeft, top: element.offsetTop });
    }
    return spots;
}

/**
 * When the same items come back in another order, each one travels from where it was to its new
 * place (children carry `data-flip-id`). Items that appear or leave, as when a filter changes,
 * move nothing: only a pure reorder is animated.
 */
export function useFlipList(container: RefObject<HTMLElement | null>, order: string) {
    const spots = useRef(new Map<string, Spot>());
    const lastOrder = useRef(order);

    // After every render, so the next reorder starts from what is on screen now.
    useLayoutEffect(() => {
        const root = container.current;
        const previous = spots.current;
        const next = root ? measure(root) : new Map<string, Spot>();
        const reordered = lastOrder.current !== order;
        spots.current = next;
        lastOrder.current = order;

        if (!root || !reordered || prefersReducedMotion() || previous.size !== next.size) return;
        for (const id of next.keys()) if (!previous.has(id)) return;

        for (const child of root.children) {
            const element = child as HTMLElement;
            const id = element.dataset.flipId;
            const before = id ? previous.get(id) : undefined;
            const now = id ? next.get(id) : undefined;
            if (!before || !now) continue;
            const dx = before.left - now.left;
            const dy = before.top - now.top;
            if (dx === 0 && dy === 0) continue;
            element.animate(
                [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
                { duration: MOVE_MS, easing: EASE_OUT },
            );
        }
    });

    // A resize moves everything without a render.
    useEffect(() => {
        const remeasure = () => {
            if (container.current) spots.current = measure(container.current);
        };
        window.addEventListener('resize', remeasure);
        return () => window.removeEventListener('resize', remeasure);
    }, [container]);
}
