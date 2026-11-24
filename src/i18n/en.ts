// English, the app's default language. `es.ts` has the same shape (the type checks it).
// Plain TypeScript with no imports from the UI, so `npm test` can load it in Node.
import type { Attributes, BalanceLabel, FallbackCause, HardRule, RuleIssue, TeamLabel } from '../types/index.ts';

const team = (label: TeamLabel): string => (label === 'T1' ? 'Team 1' : 'Team 2');

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
        identity: 'Identity',
        game: 'Game',
        links: 'Links',
        nickname: 'Nickname',
        nicknameBlank: "Nickname can't be blank",
        name: 'Name or description',
        photoUpload: 'Upload',
        photoChange: 'Change',
        photoAlt: 'Preview',
        photoTooHeavy: 'Photo too heavy for Sheets. Try another one.',
        photoUnreadable: "Can't read this image. Use a JPG or PNG.",
        shirtNumber: 'Shirt number',
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
        score: (score: number) => `Score ${score}`,
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
        comparison: 'Team 1 vs Team 2',
        rating: 'Rating',
        keepers: 'Keepers and ATT',
        hasGK: (label: TeamLabel) => `${team(label)} has a GK.`,
        emergency: (label: TeamLabel, capable: number, needed: number, good: number, low: number) =>
            `${team(label)} has no GK: ${capable} of ${needed} emergency keepers (${good} good, ${low} low).`,
        attSplit: (team1: number, team2: number) => `ATT: Team 1 has ${team1} and Team 2 has ${team2}.`,
        links: 'Links',
        wantsTogether: 'Wants, together',
        avoidsApart: 'Avoids, apart',
        oneWayKept: (kept: number, total: number, penalty: number) =>
            `One-way wants kept: ${kept}/${total} (a broken one costs ${penalty} points).`,
        oneWayBroken: 'One-way wants, split',
        none: 'None',
        formula: 'Score',
        formulaBase: 'Base',
        formulaRating: 'Rating',
        formulaAttributes: 'Attributes',
        formulaPace: 'Pace',
        formulaStamina: 'Stamina',
        formulaDefense: 'Defense',
        formulaKeepers: 'Emergency keepers',
        formulaAtt: 'ATT spread',
        formulaWants: 'One-way wants',
        formulaTotal: 'Score',

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
