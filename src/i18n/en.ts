// English, the app's default language. `es.ts` has the same shape (the type checks it).
// Plain TypeScript with no imports from the UI, so `npm test` can load it in Node.
import type { Attributes, BalanceLabel, FallbackCause, Favors, HardRule, RuleIssue, TeamLabel } from '../types/index.ts';

const team = (label: TeamLabel): string => (label === 'T1' ? 'Team 1' : 'Team 2');

/** "a", "a and b", "a, b and c". */
const list = (items: string[]): string =>
    items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** A whole number with a real minus sign when negative. */
const signed = (n: number): string => (n < 0 ? `\u2212${-n}` : String(n));

const BALANCE_SENTENCE: Record<BalanceLabel, string> = {
    highlyBalanced: 'The teams are very even.',
    balanced: 'The teams are even.',
    playable: "It's playable, but one team is somewhat stronger.",
    imbalanced: 'The teams are uneven: one is clearly stronger.',
};

const attributes: Record<keyof Attributes, string> = {
    shooting: 'Shooting',
    control: 'Control',
    passing: 'Passing',
    defense: 'Defense',
    pace: 'Pace',
    vision: 'Vision',
    grit: 'Grit',
    stamina: 'Stamina',
};

const balance: Record<BalanceLabel, string> = {
    highlyBalanced: 'Highly balanced',
    balanced: 'Balanced',
    playable: 'Playable, but uneven',
    imbalanced: 'Uneven',
};

const rules: Record<HardRule, string> = {
    avoids: 'Avoids',
    wants: 'Mutual wants',
    ownerBias: 'Owner bias',
    roleSpread: 'ATT/DEF spread',
    roleLimits: 'GK/DEF limits',
};

const CLEARED: Record<string, string> = {
    'all links': 'all links',
    'positive links': 'positive links',
    'negative links': 'negative links',
};

export const en = {
    common: {
        cancel: 'Cancel',
        confirm: 'Confirm',
        retry: 'Retry',
        close: 'Close',
        team,
        attributes,
    },

    lang: {
        label: 'Language',
        english: 'English',
        spanish: 'Spanish',
    },

    page: {
        title: 'Players',
        addPlayer: '+ Add Player',
        addPlayerWaits: 'Players must load from Google Sheets first',
        selected: 'selected',
        clear: 'Clear',
        clearSelection: 'Clear Selection',
        clearFilters: 'Clear Filters',
        clearWants: 'Clear Wants',
        clearAvoids: 'Clear Avoids',
        clearLinks: 'Clear Links',
        generate: 'Generate Teams',
        dismissError: 'Dismiss error',
        loading: 'Loading players from Google Sheets',
        empty: 'No players yet.',
        emptyHint: 'Data is loaded from Google Sheets. You can add players manually or edit the spreadsheet.',
        noMatch: 'No players match current controls.',
        noMatchFiltered: 'Try another search prefix or role/score filter.',
        noMatchSorted: 'Try adjusting search, filter, or sort.',
        updating: 'Updating from Google Sheets...',
        savedCopyRefresh: 'Saved copy · Refresh',
        showing: (shown: number, total: number) => `Showing ${shown} of ${total} players`,
        total: (total: number) => `Total: ${total} players`,
        selectExactly: (selected: number) => `Select exactly 10 players. Selected: ${selected}`,
        couldNotGenerate: 'Could not generate valid teams. Check roles and goalkeeper availability.',
    },

    confirm: {
        deleteTitle: 'Delete player?',
        deleteMessage: 'This will remove the player from this app and from the sheet.',
        deleteLabel: 'Delete',
        linksTitle: 'Clear Links?',
        linksMessage: 'This will remove every positive and negative relationship for all players.',
        linksLabel: 'Clear Links',
        wantsTitle: 'Clear positive links?',
        wantsMessage: 'This will remove all wants links for every player.',
        wantsLabel: 'Clear Wants',
        avoidsTitle: 'Clear negative links?',
        avoidsMessage: 'This will remove all avoids links for every player.',
        avoidsLabel: 'Clear Avoids',
    },

    controls: {
        search: 'Search players by nickname or name',
        role: 'Role',
        score: 'Score',
        sort: 'Sort',
        all: 'All',
        sortDefault: 'Default',
        sortSelected: 'Selected',
        sortScore: 'Score',
        sortPosition: 'Position',
        filterByRole: 'Filter by role',
        filterByScore: 'Filter by score',
        sortPlayers: 'Sort players',
        highToLow: 'Score: high to low',
        lowToHigh: 'Score: low to high',
    },

    card: {
        select: (nickname: string) => `Select ${nickname}`,
        edit: 'Edit',
        editPlayer: (nickname: string) => `Edit ${nickname}`,
        delete: 'Delete',
        deletePlayer: (nickname: string) => `Delete ${nickname}`,
    },

    notices: {
        dismissWarning: 'Dismiss warning',
        dismissSyncErrors: 'Dismiss sync errors',
        manyFailed: (count: number) => `${count} changes couldn't be saved to Google Sheets.`,
        unsavedOnlyHere: 'Unsaved changes only live in this tab until a retry works.',
        saving: 'Saving...',
        loadingSheet: 'Loading from Google Sheets',
    },

    gate: {
        idle: 'Score to get in',
        goal: 'Goal',
        saved: "Saved. That's not the key.",
        post: 'Off the post. No answer, try again.',
        scene: 'A goalkeeper on her line, waiting for a penalty',
        keyLabel: 'Access key',
        keyPlaceholder: 'Key',
        shoot: 'Shoot',
    },

    form: {
        newPlayer: 'New player',
        nickname: 'Nickname',
        nicknameBlank: "Nickname can't be blank",
        name: 'Name or description',
        photoUpload: 'Upload',
        photoChange: 'Change',
        photoAlt: 'Preview',
        photoTooHeavy: 'Photo too heavy for Sheets. Try another one.',
        photoUnreadable: "Can't read this image. Use a JPG or PNG.",
        shirtNumber: 'Shirt #',
        teams: 'Teams',
        teamsSelected: (count: number) => `${count} selected`,
        teamsLoading: 'Loading teams...',
        teamsEmpty: 'No teams loaded yet',
        teamSelected: 'Selected',
        teamAdd: 'Add',
        teamIsMain: (name: string) => `${name} is main team`,
        teamSetMain: (name: string) => `Set ${name} as main team`,
        position: 'Position',
        goalkeeper: 'Goalkeeper?',
        gkGood: 'Good',
        gkLow: 'Low',
        gkNo: 'No',
        rating: 'Rating',
        suggested: 'suggested',
        attributes: 'Attributes',
        level: { low: 'low', mid: 'mid', high: 'high' },
        wants: 'Wants to play with',
        avoids: 'Avoids playing with',
        wantsYou: (nickname: string) => `${nickname} wants to play with her`,
        avoidsYou: (nickname: string) => `${nickname} avoids her`,
        extraInfo: 'Extra info',
        save: 'Save Changes',
        add: 'Add Player',
    },

    result: {
        title: 'Teams',
        allRulesKept: 'All rules kept',
        fallback: 'Fallback',
        power: 'Power',
        copy: 'Copy Teams',
        copied: 'Copied',
        balance: 'Balance',
        balanceLabel: balance,
        score: (score: number) => `Score ${signed(score)}`,
        ratingDiff: (diff: number, favors: TeamLabel) => `rating +${diff} ${team(favors)}`,
        ratingEven: 'rating even',
        social: 'Social',
        wantsKept: (met: number, total: number) => `Wants ${met}/${total}`,
        avoidsKept: (met: number, total: number) => `Avoids ${met}/${total}`,
        noLinks: 'No links between them',
        rules: 'Rules',
        allKept: 'All kept',
        brokenCount: (count: number) => `${count} broken`,
        strictNote: 'Every hard rule holds',
        fallbackNote: 'The split that breaks the fewest',

        fallbackTitle: 'No split meets every rule',
        why: 'Why',
        broken: 'Broken',
        kept: 'Kept',
        noSingleCause: 'No single cause: the rules only clash when combined.',
        relaxOrder: 'Rules give way in this order',
        rule: rules,
        cause: (cause: FallbackCause): string => {
            switch (cause.kind) {
                case 'tooManyGK':
                    return `${cause.count} GK selected, and a team takes ${cause.maxPerTeam} at most.`;
                case 'tooManyDEF':
                    return `${cause.count} DEF selected, and a team takes ${cause.maxPerTeam} at most.`;
                case 'fewKeepers':
                    return `${cause.gkCount} GK selected and only ${cause.capable} emergency keepers: each team without a GK needs ${cause.neededPerTeam}.`;
                case 'wantsChain':
                    return `Mutual wants chain ${cause.nicknames.length} players together (${cause.nicknames.join(', ')}), and a team has ${cause.teamSize} spots.`;
                case 'avoidInChain':
                    return `${cause.from} avoids ${cause.to}, but mutual wants chain them into the same team.`;
            }
        },
        issue: (issue: RuleIssue): string => {
            switch (issue.kind) {
                case 'avoidTogether':
                    return issue.link.mutual
                        ? `${issue.link.from} and ${issue.link.to} avoid each other and ended up together.`
                        : `${issue.link.from} avoids ${issue.link.to} and they ended up together.`;
                case 'wantSplit':
                    return `${issue.link.from} and ${issue.link.to} want to play together and were split.`;
                case 'ownerOnStronger':
                    return `${issue.nickname} is on the stronger team.`;
                case 'defSplit':
                    return `The 2 DEF go one per team: Team 1 has ${issue.team1} and Team 2 has ${issue.team2}.`;
                case 'attSplit':
                    return `ATT can differ by 1 at most: Team 1 has ${issue.team1} and Team 2 has ${issue.team2}.`;
                case 'tooManyGK':
                    return `${team(issue.team)} has ${issue.count} GK (max ${issue.max}).`;
                case 'tooManyDEF':
                    return `${team(issue.team)} has ${issue.count} DEF (max ${issue.max}).`;
                case 'fewKeepers':
                    return `${team(issue.team)} has no GK and ${issue.capable} of the ${issue.needed} emergency keepers it needs.`;
            }
        },

        showAnalysis: 'Full Analysis',
        hideAnalysis: 'Hide Analysis',

        // The analysis in words first; the bars and the score, explained, below.
        inWords: 'In words',
        lead: {
            balance: 'Balance',
            rating: 'Rating',
            attributes: 'Attributes',
            keepers: 'Keepers',
            att: 'ATT',
            links: 'Links',
        },
        balanceSentence: (label: BalanceLabel, score: number): string =>
            `${BALANCE_SENTENCE[label]} Score ${signed(score)}: the higher, the more even.`,
        ratingSentence: (diff: number, favors: Favors, totals: readonly [number, number] | null): string => {
            const detail = totals ? ` (${totals[0]} to ${totals[1]})` : '';
            if (favors === 'Even') return `Both teams add up to the same rating${detail}.`;
            return `${team(favors)} adds up to ${diff} more rating ${diff === 1 ? 'point' : 'points'}${detail}.`;
        },
        attributesSentence: (team1: string[], team2: string[], even: string[]): string => {
            const parts: string[] = [];
            if (team1.length > 0) parts.push(`Team 1 is better at ${list(team1)}`);
            if (team2.length > 0) parts.push(team1.length > 0 ? `Team 2 at ${list(team2)}` : `Team 2 is better at ${list(team2)}`);
            if (parts.length === 0) return 'Even in every attribute.';
            return `${parts.join('; ')}.${even.length > 0 ? ` Even in ${list(even)}.` : ''}`;
        },
        keepersEach: 'Each team has its GK.',
        /** A team without a GK: who keeps goal well by name, the others counted. */
        keepersTeam: (label: TeamLabel, gkCount: number, good: string[], others: string[], needed: number): string => {
            if (gkCount === 1) return `${team(label)} has its GK.`;
            if (gkCount > 1) return `${team(label)} has ${gkCount} GK.`;
            const capable = good.length + others.length;
            if (capable === 0) return `${team(label)} has no GK and nobody who can keep goal (it needs ${needed}).`;
            if (capable < needed) {
                return `${team(label)} has no GK, and only ${list([...good, ...others])} can keep goal (it needs ${needed}).`;
            }
            if (good.length > 0) {
                const rest = others.length > 0 ? `, and ${others.length} more can if needed` : '';
                return `${team(label)} has no GK: ${list(good)} ${good.length === 1 ? 'keeps' : 'keep'} goal well${rest}.`;
            }
            return capable <= 3
                ? `${team(label)} has no GK: ${list(others)} can keep goal, none of them well.`
                : `${team(label)} has no GK: ${capable} can keep goal, none of them well.`;
        },
        attSentence: (team1: number, team2: number): string => `Team 1 has ${team1} and Team 2 has ${team2}.`,
        linksSentence: (wantsMet: number, wantsTotal: number, avoidsMet: number, avoidsTotal: number): string => {
            const parts: string[] = [];
            if (wantsTotal > 0) parts.push(`Wants kept: ${wantsMet} of ${wantsTotal}, playing together.`);
            if (avoidsTotal > 0) parts.push(`Avoids kept: ${avoidsMet} of ${avoidsTotal}, playing apart.`);
            return parts.length > 0 ? parts.join(' ') : 'No wants or avoids between these ten.';
        },
        oneWaySplit: (penalty: number): string =>
            `To even the teams, these one-way wants were split (${penalty} points off each):`,
        wantsTogether: 'Together',
        avoidsApart: 'Apart',

        comparison: 'Team 1 vs Team 2',
        comparisonHelp: 'Each bar leans toward the team that is stronger in it; the longer the bar, the bigger the gap.',
        rating: 'Rating',
        even: 'Even',

        scoreTitle: 'How the score is computed',
        scoreHelp:
            'It starts at 100 and loses points for every gap between the teams; a few rules add or take a little. The higher, the more even: 70 or more is very even, 40 or more even, 0 or more playable.',
        scoreStart: 'Starts at',
        scoreRating: 'Rating gap',
        scoreAttributes: 'Gaps in the attributes, all together',
        scorePace: 'Pace, which counts extra',
        scoreStamina: 'Stamina, which counts extra',
        scoreDefense: 'Defense, which counts extra',
        scoreKeepers: 'Emergency keepers',
        scoreKeepersHelp: '+4 for each good one, −12 for each one missing',
        scoreAtt: 'ATT spread',
        scoreAttHelp: 'how evenly the ATT are shared',
        scoreWants: 'One-way wants split',
        scoreTimes: (value: string, weight: number): string => `${value} × ${weight}`,
        scoreShort: {
            rating: 'rating gap',
            attributes: 'attribute gaps',
            pace: 'pace',
            stamina: 'stamina',
            defense: 'defense',
            keepers: 'emergency keepers',
            att: 'ATT spread',
            wants: 'one-way wants',
        },
        scoreNoEffect: (items: string[]): string => `No effect this time: ${list(items)}.`,
        scoreTotal: 'Score',

        showSecond: 'Show Second Option',
        hideSecond: 'Hide Second Option',
        second: 'Second Option',
        secondReason: 'Next best split under the same rules. Ranking: score, then social satisfaction, then rating gap.',
        noSecond: 'No second option available under current constraints.',
        scoreDelta: 'Score',
        ratingDiffDelta: 'Rating diff',
        socialDelta: 'Social',
        movedTo: (label: TeamLabel) => `Moves to ${team(label)}`,
        noSwaps: 'No swaps',
        copySecond: 'Copy Second Option',
    },

    // Written by the store when something happens, in the language of that moment.
    store: {
        missingUrl: 'Missing VITE_APPS_SCRIPT_URL. Add it to .env (local) or to the Vercel environment variables.',
        duplicateIds: (list: string) =>
            `Duplicate player ids in Google Sheets: ${list}. Only the first row is shown; give each row its own id.`,
        duplicateId: (id: string, firstRow: number, row: number) => `id ${id} (rows ${firstRow} and ${row})`,
        missingIds: (rows: string) =>
            `Players without id in Google Sheets (rows ${rows}). Add an id in the sheet before editing them here.`,
        httpStatus: (status: number) => `Apps Script returned HTTP ${status}.`,
        keyRefused: 'The access key was refused. Enter it again and retry.',
        answered: (text: string) => `Apps Script answered: ${text || '(empty response)'}`,
        timeout: (seconds: number) => `Apps Script did not answer within ${seconds}s.`,
        couldntClear: (label: string) => `Couldn't clear ${CLEARED[label] ?? label} in Google Sheets.`,
        noValidPlayers: 'No valid players found in Google Sheets',
        teamsError: 'Error loading teams catalog from Google Sheets',
        couldntRefresh: (detail: string) =>
            `Couldn't refresh from Google Sheets. ${detail} Showing the copy saved on this device; editing waits for a fresh read.`,
        couldntLoad: (detail: string) => `Error loading data from Google Sheets. ${detail}`,
        couldntAdd: (nickname: string) => `Couldn't save new player "${nickname}" to Google Sheets.`,
        couldntUpdate: (nickname: string) => `Couldn't save changes to "${nickname}" in Google Sheets.`,
        couldntDelete: (label: string) => `Couldn't delete "${label}" in Google Sheets.`,
        rowWithoutId: 'This row has no id in Google Sheets. Delete it there, or add an id first.',
    },
};

export type Dict = typeof en;
