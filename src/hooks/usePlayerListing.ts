import { useCallback, useMemo, useState } from 'react';
import type { Person } from '../types';
import {
    applyPrivacyMode,
    DEFAULT_LISTING_CONTROLS,
    filterAndSortPeople,
    hasActiveFilters,
    type ListingControls,
} from '../utils/playerListing';

export type ListingControlsUpdate =
    | Partial<ListingControls>
    | ((current: ListingControls) => Partial<ListingControls>);

/**
 * Search, filters and sort for a player list. Each page calls it, so Players and Match
 * keep their own controls. `controls` already has privacy mode applied.
 */
export function usePlayerListing(people: Person[], selectedIds: ReadonlySet<string>, privacyMode: boolean) {
    const [chosenControls, setChosenControls] = useState<ListingControls>(DEFAULT_LISTING_CONTROLS);

    const controls = useMemo(() => applyPrivacyMode(chosenControls, privacyMode), [chosenControls, privacyMode]);

    const visiblePeople = useMemo(
        () => filterAndSortPeople(people, controls, selectedIds),
        [people, controls, selectedIds],
    );

    const updateControls = useCallback((update: ListingControlsUpdate) => {
        setChosenControls((current) => ({
            ...current,
            ...(typeof update === 'function' ? update(current) : update),
        }));
    }, []);

    const resetControls = useCallback(() => setChosenControls(DEFAULT_LISTING_CONTROLS), []);

    return {
        controls,
        updateControls,
        resetControls,
        visiblePeople,
        isFiltered: hasActiveFilters(controls),
    };
}
