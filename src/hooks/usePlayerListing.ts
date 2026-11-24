import { useCallback, useMemo, useState } from 'react';
import type { Person } from '../types';
import {
    applyPrivacyMode,
    DEFAULT_LISTING_CONTROLS,
    filterAndSortPeople,
    hasActiveFilters,
    sortAfterSelectionChange,
    type ListingControls,
    type SortMode,
} from '../utils/playerListing';

export type ListingControlsUpdate =
    | Partial<ListingControls>
    | ((current: ListingControls) => Partial<ListingControls>);

interface ListingState {
    controls: ListingControls;
    /** The sort the full selection replaced, to give back when the selection empties. */
    restoreSort: SortMode | null;
    /** The selection size this state was worked out for. */
    seenCount: number;
}

/**
 * Search, filters and sort for the player list. `controls` already has privacy mode applied.
 * With `matchSize` picks the list sorts itself to "selected" (see sortAfterSelectionChange).
 */
export function usePlayerListing(
    people: Person[],
    selectedIds: ReadonlySet<string>,
    privacyMode: boolean,
    matchSize: number,
) {
    const [listing, setListing] = useState<ListingState>(() => ({
        controls: DEFAULT_LISTING_CONTROLS,
        restoreSort: null,
        seenCount: selectedIds.size,
    }));

    // The selection changed since the last render: maybe the sort follows it. Only a real change
    // counts, so opening the page with picks already made moves nothing.
    let current = listing;
    if (selectedIds.size !== listing.seenCount) {
        const next = sortAfterSelectionChange(listing.seenCount, selectedIds.size, matchSize, {
            sort: listing.controls.sort,
            restore: listing.restoreSort,
        });
        current = {
            controls: next.sort === listing.controls.sort ? listing.controls : { ...listing.controls, sort: next.sort },
            restoreSort: next.restore,
            seenCount: selectedIds.size,
        };
        setListing(current);
    }

    const chosenControls = current.controls;
    const controls = useMemo(() => applyPrivacyMode(chosenControls, privacyMode), [chosenControls, privacyMode]);

    const visiblePeople = useMemo(
        () => filterAndSortPeople(people, controls, selectedIds),
        [people, controls, selectedIds],
    );

    const updateControls = useCallback((update: ListingControlsUpdate) => {
        setListing((state) => {
            const changes = typeof update === 'function' ? update(state.controls) : update;
            return {
                ...state,
                controls: { ...state.controls, ...changes },
                // A sort picked by hand is the one that stays.
                restoreSort: 'sort' in changes ? null : state.restoreSort,
            };
        });
    }, []);

    const resetControls = useCallback(
        () => setListing((state) => ({ ...state, controls: DEFAULT_LISTING_CONTROLS, restoreSort: null })),
        [],
    );

    return {
        controls,
        updateControls,
        resetControls,
        visiblePeople,
        isFiltered: hasActiveFilters(controls),
    };
}
