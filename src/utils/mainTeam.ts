import type { Person } from '../types';

/**
 * The player's main team: the one marked as main or, without it, the first of their teams, as
 * the player form does. Only teams the Teams tab knows count. Its colours go in the card's corner,
 * and the team sort goes by it (Sprint 7).
 */
export function mainTeamId(
    person: Pick<Person, 'primaryTeam' | 'teams'>,
    isKnown: (teamId: string) => boolean,
): string | undefined {
    if (person.primaryTeam && isKnown(person.primaryTeam)) return person.primaryTeam;
    return person.teams.find(isKnown);
}
