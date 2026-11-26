import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';

/**
 * Reads players and teams with one request (see fetchPeople), also behind a saved copy, until the
 * sheet has answered once in this visit. Every screen the app can open on calls it: the players,
 * and since Sprint 9 the matches (a reload on /matches never passes through the players).
 */
export function useRosterLoad(): void {
    const access = useAppStore((state) => state.access);
    const isFresh = useAppStore((state) => state.isFresh);
    const peopleStatus = useAppStore((state) => state.peopleStatus);
    const fetchPeople = useAppStore((state) => state.fetchPeople);

    useEffect(() => {
        if (access !== 'locked' && !isFresh && peopleStatus !== 'loading' && peopleStatus !== 'error') {
            void fetchPeople();
        }
    }, [access, fetchPeople, isFresh, peopleStatus]);
}
