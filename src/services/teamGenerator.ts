import type {
  Person,
  GeneratedTeams,
  AttributeLevel,
  Attributes,
  GeneratedTeamOption,
  GenerationStage,
  TeamOptionComparison,
} from '../types';

// Points configuration
const POINTS = {
  RATING_BALANCE_BASE: 100,
};

const TEAM_SIZE = 5;
const MATCH_SIZE = TEAM_SIZE * 2;

// Hard Constraints
const MAX_GK = 1;
const MAX_DEF = 2;
const REQUIRED_GK_CAPABLE_WHEN_NO_GK = 2; // Capable = good + low when there is no dedicated GK

const GOOD_GK_EMERGENCY_BONUS = 4;
const MISSING_GK_CAPABLE_PENALTY = 12;
const ATT_IMBALANCE_WEIGHT = 6;
const ATT_OVERLOAD_WITH_DEF_REWARD = 6;
const ATT_OVERLOAD_WITHOUT_DEF_PENALTY = 8;

const SECONDARY_OPTION_REASON =
  'Second option has lower balance score than Option 1 under the same constraint stage.';
const NO_SECONDARY_OPTION_REASON = 'No second option available under current constraints.';

function resolveOwnerId(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return '10';
}

// import.meta.env is injected by Vite; plain Node (npm test) has no env object.
const OWNER_ID = resolveOwnerId(import.meta.env?.VITE_OWNER_ID);

interface TeamStats {
  rating: number;
  attributes: Record<keyof Attributes, number>;
}

interface TeamGKProfile {
  gkRoleCount: number;
  goodCount: number;
  lowCount: number;
  noCount: number;
  capableCount: number;
}

interface TeamGKScoreBreakdown {
  needsEmergency: boolean;
  goodBonus: number;
  missingCapable: number;
  shortagePenalty: number;
  adjustment: number;
}

interface GKPreferenceBreakdown {
  applies: boolean;
  adjustment: number;
  team1: TeamGKScoreBreakdown;
  team2: TeamGKScoreBreakdown;
}

interface AttPreferenceBreakdown {
  adjustment: number;
  totalAtt: number;
  team1Att: number;
  team2Att: number;
  overloadedTeam: 'T1' | 'T2' | 'Even';
  overloadedDefCount: number | null;
}

/** Hard-rule violations of a split. A strict split has every count at 0. */
interface RuleViolations {
  /** Directed avoid links between players of the same team. */
  avoids: number;
  /** Directed want links between players of different teams. */
  wants: number;
  /** 1 when the owner ends up on the stronger (higher Power) team. */
  ownerBias: number;
  /** DEF 1/1 rule (only when exactly 2 DEF are selected) + ATT difference above 1. */
  roleSpread: number;
  /** GK above 1, DEF above 2 and missing emergency keepers, summed over both teams. */
  roleLimits: number;
}

/**
 * When no split satisfies every rule, the fallback picks the split that breaks the
 * fewest rules in this priority order, and only then looks at the balance score.
 */
const FALLBACK_VIOLATION_PRIORITY: (keyof RuleViolations)[] = [
  'avoids',
  'wants',
  'ownerBias',
  'roleSpread',
  'roleLimits',
];

interface SplitContext {
  owner: Person | undefined;
  totalDefCount: number;
}

interface SplitEvaluation {
  team1Players: Person[];
  team2Players: Person[];
  stats1: TeamStats;
  stats2: TeamStats;
  team1GKProfile: TeamGKProfile;
  team2GKProfile: TeamGKProfile;
  gkPreference: GKPreferenceBreakdown;
  attPreference: AttPreferenceBreakdown;
  score: number;
  ratingDiff: number;
  displayKey: string;
  violations: RuleViolations;
}

interface SocialSatisfaction {
  wantsMet: number;
  wantsTotal: number;
  dislikesMet: number;
  dislikesTotal: number;
  met: number;
  total: number;
  percentage: number;
}

const ROLE_PRIORITY: Record<Person['role'], number> = {
  GK: 0,
  FLEX: 1,
  DEF: 2,
  MID: 3,
  ATT: 4,
};

// Attribute Weights Configuration
const WEIGHTS = {
  PHYSICAL: { HIGH: 2, MID: 0, LOW: -2 }, // Critical: Pace, Stamina
  TECHNICAL: { HIGH: 1.5, MID: 0, LOW: -1 }, // Important: Shooting, Defense, Control, Passing
  MENTAL: { HIGH: 1, MID: 0, LOW: -0.5 }, // Secondary: Vision, Grit
};

function getAttrValue(level: AttributeLevel | undefined, type: keyof typeof WEIGHTS): number {
  if (!level) return WEIGHTS[type].MID; // Default to MID if undefined
  const weight = WEIGHTS[type];
  if (level === 'high') return weight.HIGH;
  if (level === 'low') return weight.LOW;
  return weight.MID;
}

function calculateTeamStats(players: Person[]): TeamStats {
  const rating = players.reduce((sum, p) => sum + p.rating, 0);

  const attributes: Record<keyof Attributes, number> = {
    shooting: 0,
    control: 0,
    passing: 0,
    defense: 0,
    pace: 0,
    vision: 0,
    grit: 0,
    stamina: 0,
  };

  const keys = Object.keys(attributes) as (keyof Attributes)[];

  for (const key of keys) {
    let type: keyof typeof WEIGHTS = 'TECHNICAL'; // Default
    if (['pace', 'stamina'].includes(key)) type = 'PHYSICAL';
    else if (['vision', 'grit'].includes(key)) type = 'MENTAL';

    attributes[key] = players.reduce((sum, p) => sum + getAttrValue(p.attributes?.[key], type), 0);
  }

  return { rating, attributes };
}

function calculateTeamPowerFromStats(stats: TeamStats): number {
  const attributesTotal = Object.values(stats.attributes).reduce((sum, value) => sum + value, 0);
  return stats.rating + attributesTotal;
}

export function calculateTeamPower(players: Person[]): number {
  const stats = calculateTeamStats(players);
  return calculateTeamPowerFromStats(stats);
}

function countRole(players: Person[], role: Person['role']): number {
  return players.reduce((total, player) => total + (player.role === role ? 1 : 0), 0);
}

function getTeamGKProfile(players: Person[]): TeamGKProfile {
  let gkRoleCount = 0;
  let goodCount = 0;
  let lowCount = 0;
  let noCount = 0;

  for (const player of players) {
    if (player.role === 'GK') gkRoleCount++;

    if (player.gkWillingness === 'good') {
      goodCount++;
      continue;
    }

    if (player.gkWillingness === 'low') {
      lowCount++;
      continue;
    }

    noCount++;
  }

  return {
    gkRoleCount,
    goodCount,
    lowCount,
    noCount,
    capableCount: goodCount + lowCount,
  };
}

function getTeamGKScoreBreakdown(profile: TeamGKProfile): TeamGKScoreBreakdown {
  const needsEmergency = profile.gkRoleCount === 0;
  if (!needsEmergency) {
    return {
      needsEmergency: false,
      goodBonus: 0,
      missingCapable: 0,
      shortagePenalty: 0,
      adjustment: 0,
    };
  }

  const goodBonus = profile.goodCount * GOOD_GK_EMERGENCY_BONUS;
  const missingCapable = Math.max(0, REQUIRED_GK_CAPABLE_WHEN_NO_GK - profile.capableCount);
  const shortagePenalty = missingCapable * MISSING_GK_CAPABLE_PENALTY;

  return {
    needsEmergency: true,
    goodBonus,
    missingCapable,
    shortagePenalty,
    adjustment: goodBonus - shortagePenalty,
  };
}

function getGKPreferenceBreakdown(team1Profile: TeamGKProfile, team2Profile: TeamGKProfile): GKPreferenceBreakdown {
  const team1 = getTeamGKScoreBreakdown(team1Profile);
  const team2 = getTeamGKScoreBreakdown(team2Profile);

  return {
    applies: team1.needsEmergency || team2.needsEmergency,
    adjustment: team1.adjustment + team2.adjustment,
    team1,
    team2,
  };
}

function getAttPreferenceBreakdown(team1Players: Person[], team2Players: Person[]): AttPreferenceBreakdown {
  const team1Att = countRole(team1Players, 'ATT');
  const team2Att = countRole(team2Players, 'ATT');
  const team1Def = countRole(team1Players, 'DEF');
  const team2Def = countRole(team2Players, 'DEF');
  const totalAtt = team1Att + team2Att;

  let adjustment = -Math.abs(team1Att - team2Att) * ATT_IMBALANCE_WEIGHT;
  let overloadedTeam: AttPreferenceBreakdown['overloadedTeam'] = 'Even';
  let overloadedDefCount: number | null = null;

  if (totalAtt >= 5) {
    if (team1Att > team2Att) {
      overloadedTeam = 'T1';
      overloadedDefCount = team1Def;
    } else if (team2Att > team1Att) {
      overloadedTeam = 'T2';
      overloadedDefCount = team2Def;
    }

    if (overloadedTeam !== 'Even') {
      adjustment +=
        (overloadedDefCount ?? 0) > 0 ? ATT_OVERLOAD_WITH_DEF_REWARD : -ATT_OVERLOAD_WITHOUT_DEF_PENALTY;
    }
  }

  return {
    adjustment,
    totalAtt,
    team1Att,
    team2Att,
    overloadedTeam,
    overloadedDefCount,
  };
}

// ---------------------------------------------------------------------------
// Hard rules, expressed as violation counts so the fallback can rank splits.
// ---------------------------------------------------------------------------

function countAvoidViolations(players: Person[]): number {
  const ids = new Set(players.map((player) => player.id));
  let violations = 0;

  for (const player of players) {
    for (const avoidId of player.avoidsWith) {
      if (avoidId !== player.id && ids.has(avoidId)) violations++;
    }
  }

  return violations;
}

function countBrokenWants(team1: Person[], team2: Person[]): number {
  const team1Ids = new Set(team1.map((player) => player.id));
  const team2Ids = new Set(team2.map((player) => player.id));
  let violations = 0;

  for (const player of team1) {
    for (const targetId of player.wantsWith) {
      if (team2Ids.has(targetId)) violations++;
    }
  }

  for (const player of team2) {
    for (const targetId of player.wantsWith) {
      if (team1Ids.has(targetId)) violations++;
    }
  }

  return violations;
}

function countRoleSpreadViolations(team1: Person[], team2: Person[], totalDefCount: number): number {
  let violations = 0;

  // With exactly 2 DEF selected, they must be split 1/1.
  if (totalDefCount === 2 && (countRole(team1, 'DEF') !== 1 || countRole(team2, 'DEF') !== 1)) {
    violations++;
  }

  // ATT must be spread evenly enough: abs(T1 ATT - T2 ATT) <= 1.
  violations += Math.max(0, Math.abs(countRole(team1, 'ATT') - countRole(team2, 'ATT')) - 1);

  return violations;
}

function countRoleLimitViolations(players: Person[], profile: TeamGKProfile): number {
  const missingKeepers =
    profile.gkRoleCount === 0 ? Math.max(0, REQUIRED_GK_CAPABLE_WHEN_NO_GK - profile.capableCount) : 0;

  return (
    Math.max(0, profile.gkRoleCount - MAX_GK) +
    Math.max(0, countRole(players, 'DEF') - MAX_DEF) +
    missingKeepers
  );
}

function isOwnerBiasValid(
  team1Players: Person[],
  team2Players: Person[],
  team1Power: number,
  team2Power: number,
  owner: Person | undefined,
): boolean {
  if (!owner) return true;

  const ownerInTeam1 = team1Players.some((player) => player.id === owner.id);
  const ownerInTeam2 = team2Players.some((player) => player.id === owner.id);
  if (!ownerInTeam1 && !ownerInTeam2) return true;

  return ownerInTeam1 ? team1Power <= team2Power : team2Power <= team1Power;
}

function isStrictSplit(evaluation: SplitEvaluation): boolean {
  return FALLBACK_VIOLATION_PRIORITY.every((key) => evaluation.violations[key] === 0);
}

// ---------------------------------------------------------------------------
// Scoring and split evaluation
// ---------------------------------------------------------------------------

function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

function calculateBalanceScore(stats1: TeamStats, stats2: TeamStats): number {
  let score = 0;
  const ratingDiff = Math.abs(stats1.rating - stats2.rating);

  // Rating Balance (Base) - Max 100
  score += POINTS.RATING_BALANCE_BASE - ratingDiff * 10;

  // Attribute Balance (Sum of all weighted diffs)
  let totalAttrDiff = 0;
  (Object.keys(stats1.attributes) as (keyof Attributes)[]).forEach((key) => {
    const diff = Math.abs(stats1.attributes[key] - stats2.attributes[key]);
    totalAttrDiff += diff;
  });
  score -= totalAttrDiff * 5;

  // Critical Balancing: Pace & Stamina (Physical)
  const paceDiff = Math.abs(stats1.attributes.pace - stats2.attributes.pace);
  const staminaDiff = Math.abs(stats1.attributes.stamina - stats2.attributes.stamina);
  score -= paceDiff * 10;
  score -= staminaDiff * 8;

  // Defense Balance
  const defDiff = Math.abs(stats1.attributes.defense - stats2.attributes.defense);
  score -= defDiff * 5;

  return score;
}

function getSortedTeamKey(players: Person[]): string {
  return players
    .map((player) => player.id)
    .sort((a, b) => a.localeCompare(b))
    .join(',');
}

function canonicalizeTeams(
  teamAPlayers: Person[],
  teamBPlayers: Person[],
  statsA: TeamStats,
  statsB: TeamStats,
): {
  team1Players: Person[];
  team2Players: Person[];
  stats1: TeamStats;
  stats2: TeamStats;
  displayKey: string;
} {
  const teamAKey = getSortedTeamKey(teamAPlayers);
  const teamBKey = getSortedTeamKey(teamBPlayers);

  if (teamAKey <= teamBKey) {
    return {
      team1Players: teamAPlayers,
      team2Players: teamBPlayers,
      stats1: statsA,
      stats2: statsB,
      displayKey: `${teamAKey}|${teamBKey}`,
    };
  }

  return {
    team1Players: teamBPlayers,
    team2Players: teamAPlayers,
    stats1: statsB,
    stats2: statsA,
    displayKey: `${teamBKey}|${teamAKey}`,
  };
}

function evaluateSplit(teamAPlayers: Person[], teamBPlayers: Person[], context: SplitContext): SplitEvaluation {
  const statsA = calculateTeamStats(teamAPlayers);
  const statsB = calculateTeamStats(teamBPlayers);
  const ownerBiasValid = isOwnerBiasValid(
    teamAPlayers,
    teamBPlayers,
    calculateTeamPowerFromStats(statsA),
    calculateTeamPowerFromStats(statsB),
    context.owner,
  );

  const canonical = canonicalizeTeams(teamAPlayers, teamBPlayers, statsA, statsB);
  const team1GKProfile = getTeamGKProfile(canonical.team1Players);
  const team2GKProfile = getTeamGKProfile(canonical.team2Players);
  const gkPreference = getGKPreferenceBreakdown(team1GKProfile, team2GKProfile);
  const attPreference = getAttPreferenceBreakdown(canonical.team1Players, canonical.team2Players);
  const score =
    calculateBalanceScore(canonical.stats1, canonical.stats2) + gkPreference.adjustment + attPreference.adjustment;

  return {
    team1Players: canonical.team1Players,
    team2Players: canonical.team2Players,
    stats1: canonical.stats1,
    stats2: canonical.stats2,
    team1GKProfile,
    team2GKProfile,
    gkPreference,
    attPreference,
    score,
    ratingDiff: Math.abs(canonical.stats1.rating - canonical.stats2.rating),
    displayKey: canonical.displayKey,
    violations: {
      avoids: countAvoidViolations(canonical.team1Players) + countAvoidViolations(canonical.team2Players),
      wants: countBrokenWants(canonical.team1Players, canonical.team2Players),
      ownerBias: ownerBiasValid ? 0 : 1,
      roleSpread: countRoleSpreadViolations(canonical.team1Players, canonical.team2Players, context.totalDefCount),
      roleLimits:
        countRoleLimitViolations(canonical.team1Players, team1GKProfile) +
        countRoleLimitViolations(canonical.team2Players, team2GKProfile),
    },
  };
}

/** Evaluates every 5v5 split once (126 splits for 10 players). */
function evaluateAllSplits(players: Person[]): SplitEvaluation[] {
  const [anchor, ...rest] = players;
  const context: SplitContext = {
    owner: players.find((player) => player.id === OWNER_ID),
    totalDefCount: countRole(players, 'DEF'),
  };

  return getCombinations(rest, TEAM_SIZE - 1).map((partners) => {
    const teamAIds = new Set([anchor.id, ...partners.map((player) => player.id)]);
    const teamAPlayers = players.filter((player) => teamAIds.has(player.id));
    const teamBPlayers = players.filter((player) => !teamAIds.has(player.id));
    return evaluateSplit(teamAPlayers, teamBPlayers, context);
  });
}

function compareByBalance(a: SplitEvaluation, b: SplitEvaluation): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  if (a.ratingDiff !== b.ratingDiff) {
    return a.ratingDiff - b.ratingDiff;
  }

  return a.displayKey.localeCompare(b.displayKey);
}

function compareByFewestViolations(a: SplitEvaluation, b: SplitEvaluation): number {
  for (const key of FALLBACK_VIOLATION_PRIORITY) {
    if (a.violations[key] !== b.violations[key]) {
      return a.violations[key] - b.violations[key];
    }
  }

  return compareByBalance(a, b);
}

// ---------------------------------------------------------------------------
// Social helpers
// ---------------------------------------------------------------------------

function calculateSocialSatisfaction(team1: Person[], team2: Person[]): SocialSatisfaction {
  const allPlayers = [...team1, ...team2];
  const allIds = new Set(allPlayers.map((p) => p.id));
  const team1Ids = new Set(team1.map((p) => p.id));
  const inSameTeam = (id1: string, id2: string) => team1Ids.has(id1) === team1Ids.has(id2);
  let totalWants = 0;
  let metWants = 0;
  let totalDislikes = 0;
  let metDislikes = 0;

  allPlayers.forEach((p) => {
    p.wantsWith.forEach((targetId) => {
      if (allIds.has(targetId)) {
        totalWants++;
        if (inSameTeam(p.id, targetId)) {
          metWants++;
        }
      }
    });

    p.avoidsWith.forEach((targetId) => {
      if (allIds.has(targetId)) {
        totalDislikes++;
        if (!inSameTeam(p.id, targetId)) {
          metDislikes++;
        }
      }
    });
  });

  const totalRelationships = totalWants + totalDislikes;
  const totalMet = metWants + metDislikes;

  return {
    wantsMet: metWants,
    wantsTotal: totalWants,
    dislikesMet: metDislikes,
    dislikesTotal: totalDislikes,
    met: totalMet,
    total: totalRelationships,
    percentage: totalRelationships === 0 ? 100 : Math.round((totalMet / totalRelationships) * 100),
  };
}

/**
 * Lists wants/avoids links between selected players, filtered by whether both ends
 * are in the same team. Mutual links are listed once with the mutual arrow.
 */
function describeLinks(
  team1: Person[],
  team2: Person[],
  linkKey: 'wantsWith' | 'avoidsWith',
  sameTeam: boolean,
  arrows: { oneWay: string; mutual: string },
): string[] {
  const allPlayers = [...team1, ...team2];
  const byId = new Map(allPlayers.map((player) => [player.id, player]));
  const team1Ids = new Set(team1.map((player) => player.id));
  const processed = new Set<string>();
  const links: string[] = [];

  for (const source of allPlayers) {
    for (const targetId of source[linkKey]) {
      const target = byId.get(targetId);
      if (!target) continue;
      if ((team1Ids.has(source.id) === team1Ids.has(targetId)) !== sameTeam) continue;

      const isMutual = target[linkKey].includes(source.id);
      const pairKey = isMutual ? [source.id, targetId].sort().join('|') : `${source.id}->${targetId}`;
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      links.push(`${source.nickname} ${isMutual ? arrows.mutual : arrows.oneWay} ${target.nickname}`);
    }
  }

  return links;
}

const WANTS_ARROWS = { oneWay: '->', mutual: '<->' };
const AVOIDS_ARROWS = { oneWay: '!>', mutual: '<!>' };

function getMetRelationshipDetails(team1: Person[], team2: Person[]): string {
  const metLinks = describeLinks(team1, team2, 'wantsWith', true, WANTS_ARROWS);
  return metLinks.length > 0 ? metLinks.join(', ') : 'No met links';
}

function getMetDislikeDetails(team1: Person[], team2: Person[]): string {
  const metDislikes = describeLinks(team1, team2, 'avoidsWith', false, AVOIDS_ARROWS);
  return metDislikes.length > 0 ? metDislikes.join(', ') : 'No met dislikes';
}

/** Groups of selected players chained together by wants (in either direction). */
function getWantsGroups(players: Person[]): Person[][] {
  const selectedIds = new Set(players.map((player) => player.id));
  const parent = new Map(players.map((player) => [player.id, player.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };

  for (const player of players) {
    for (const targetId of player.wantsWith) {
      if (targetId !== player.id && selectedIds.has(targetId)) {
        parent.set(find(player.id), find(targetId));
      }
    }
  }

  const groups = new Map<string, Person[]>();
  for (const player of players) {
    const root = find(player.id);
    groups.set(root, [...(groups.get(root) ?? []), player]);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

// ---------------------------------------------------------------------------
// Analysis text
// ---------------------------------------------------------------------------

function formatScoreAdjustment(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function formatLineup(players: Person[]): string {
  const sortedPlayers = [...players].sort((a, b) => {
    const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
    if (roleDiff !== 0) return roleDiff;
    return a.nickname.localeCompare(b.nickname);
  });

  return sortedPlayers.map((player) => `[${player.role}] ${player.nickname}`).join(' ');
}

function formatTeamGKEmergencyLine(
  label: 'T1' | 'T2',
  profile: TeamGKProfile,
  scoreBreakdown: TeamGKScoreBreakdown,
): string {
  if (!scoreBreakdown.needsEmergency) {
    return `- ${label} GK: real GK present (${profile.gkRoleCount}); emergency keepers not needed.`;
  }

  const status =
    scoreBreakdown.missingCapable === 0
      ? 'PASS'
      : `FAIL, missing ${scoreBreakdown.missingCapable} capable keeper${scoreBreakdown.missingCapable === 1 ? '' : 's'}`;

  return `- ${label} emergency GK: no GK role; capable ${profile.capableCount}/${REQUIRED_GK_CAPABLE_WHEN_NO_GK} (good=${profile.goodCount}, low=${profile.lowCount}, no=${profile.noCount}); ${status}; good bonus ${formatScoreAdjustment(scoreBreakdown.goodBonus)}, shortage penalty ${formatScoreAdjustment(-scoreBreakdown.shortagePenalty)}, adjustment ${formatScoreAdjustment(scoreBreakdown.adjustment)}.`;
}

function createGKEmergencyAnalysisBlock(
  team1Profile: TeamGKProfile,
  team2Profile: TeamGKProfile,
  gkPreference: GKPreferenceBreakdown,
): string {
  const emergencyPass = gkPreference.team1.missingCapable === 0 && gkPreference.team2.missingCapable === 0;
  const status = emergencyPass
    ? 'PASS (emergency GK condition satisfied).'
    : `FAIL (teams without GK role must have >= ${REQUIRED_GK_CAPABLE_WHEN_NO_GK} capable keepers).`;
  const scoreLine = gkPreference.applies
    ? `\n- GK score adjustment: ${formatScoreAdjustment(gkPreference.adjustment)}.`
    : '';

  return `- Rule when no GK role: each team needs >= ${REQUIRED_GK_CAPABLE_WHEN_NO_GK} capable keepers (good + low).
${formatTeamGKEmergencyLine('T1', team1Profile, gkPreference.team1)}
${formatTeamGKEmergencyLine('T2', team2Profile, gkPreference.team2)}
- Status: ${status}${scoreLine}`;
}

function createAnalysisExplanation(
  evaluation: SplitEvaluation,
  socialSat: SocialSatisfaction,
  fallbackSection?: string,
): string {
  const {
    score,
    stats1,
    stats2,
    team1Players,
    team2Players,
    team1GKProfile,
    team2GKProfile,
    gkPreference,
    attPreference,
  } = evaluation;

  const getFavored = (team1Value: number, team2Value: number): 'T1' | 'T2' | 'Even' => {
    if (team1Value > team2Value) return 'T1';
    if (team2Value > team1Value) return 'T2';
    return 'Even';
  };

  const ratingDiff = Math.abs(stats1.rating - stats2.rating);
  const ratingFavored = getFavored(stats1.rating, stats2.rating);

  const shootingDiff = Math.abs(stats1.attributes.shooting - stats2.attributes.shooting);
  const shootingFavored = getFavored(stats1.attributes.shooting, stats2.attributes.shooting);

  const controlDiff = Math.abs(stats1.attributes.control - stats2.attributes.control);
  const controlFavored = getFavored(stats1.attributes.control, stats2.attributes.control);

  const passingDiff = Math.abs(stats1.attributes.passing - stats2.attributes.passing);
  const passingFavored = getFavored(stats1.attributes.passing, stats2.attributes.passing);

  const paceDiff = Math.abs(stats1.attributes.pace - stats2.attributes.pace);
  const paceFavored = getFavored(stats1.attributes.pace, stats2.attributes.pace);

  const visionDiff = Math.abs(stats1.attributes.vision - stats2.attributes.vision);
  const visionFavored = getFavored(stats1.attributes.vision, stats2.attributes.vision);

  const gritDiff = Math.abs(stats1.attributes.grit - stats2.attributes.grit);
  const gritFavored = getFavored(stats1.attributes.grit, stats2.attributes.grit);

  const staminaDiff = Math.abs(stats1.attributes.stamina - stats2.attributes.stamina);
  const staminaFavored = getFavored(stats1.attributes.stamina, stats2.attributes.stamina);

  const defDiff = Math.abs(stats1.attributes.defense - stats2.attributes.defense);
  const defenseFavored = getFavored(stats1.attributes.defense, stats2.attributes.defense);

  const totalAttrDiff =
    shootingDiff +
    controlDiff +
    passingDiff +
    defDiff +
    paceDiff +
    visionDiff +
    gritDiff +
    staminaDiff;
  const ratingPenalty = ratingDiff * 10;
  const totalAttrPenalty = totalAttrDiff * 5;
  const pacePenalty = paceDiff * 10;
  const staminaPenalty = staminaDiff * 8;
  const defensePenalty = defDiff * 5;
  const scoreRebuilt =
    POINTS.RATING_BALANCE_BASE -
    ratingPenalty -
    totalAttrPenalty -
    pacePenalty -
    staminaPenalty -
    defensePenalty +
    gkPreference.adjustment +
    attPreference.adjustment;

  const fmt = (value: number): string => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

  const scoreLabel =
    score >= 70
      ? 'highly balanced'
      : score >= 40
        ? 'balanced'
        : score >= 0
          ? 'playable but imbalanced'
          : 'imbalanced';

  const gkAnalysisBlock = createGKEmergencyAnalysisBlock(team1GKProfile, team2GKProfile, gkPreference);

  const attSpreadStatus = Math.abs(attPreference.team1Att - attPreference.team2Att) <= 1 ? 'passed' : 'broken';
  const attPreferenceLine =
    attPreference.totalAtt >= 5 && attPreference.overloadedTeam !== 'Even'
      ? `- ATT score preference: hard spread ${attSpreadStatus}, total ATT ${attPreference.totalAtt}, split T1 ${attPreference.team1Att} / T2 ${attPreference.team2Att}; overloaded side ${attPreference.overloadedTeam} has DEF=${attPreference.overloadedDefCount ?? 0}, adjustment ${formatScoreAdjustment(attPreference.adjustment)}.`
      : `- ATT score preference: hard spread ${attSpreadStatus}, total ATT ${attPreference.totalAtt}, split T1 ${attPreference.team1Att} / T2 ${attPreference.team2Att}, adjustment ${formatScoreAdjustment(attPreference.adjustment)}.`;

  const fallbackBlock = fallbackSection ? `\n\n[Fallback]\n${fallbackSection}` : '';

  return `Analysis (Score: ${Math.round(score)})${fallbackBlock}

[Details]
- Score formula: ${POINTS.RATING_BALANCE_BASE} - rating(${fmt(ratingDiff)}x10=${fmt(ratingPenalty)}) - attrs(${fmt(totalAttrDiff)}x5=${fmt(totalAttrPenalty)}) - pace(${fmt(paceDiff)}x10=${fmt(pacePenalty)}) - stamina(${fmt(staminaDiff)}x8=${fmt(staminaPenalty)}) - defense(${fmt(defDiff)}x5=${fmt(defensePenalty)})${gkPreference.applies ? ` + gkPref(${formatScoreAdjustment(gkPreference.adjustment)})` : ''} + attPref(${formatScoreAdjustment(attPreference.adjustment)}) = ${fmt(scoreRebuilt)}.
- Current score status: ${Math.round(score)} (${scoreLabel}).
- Favors marker: each balance line shows Favors: T1, T2, or Even.

[Balance]
- Rating: T1 (${stats1.rating}) vs T2 (${stats2.rating}) -> Diff: ${ratingDiff} -> Favors: ${ratingFavored}
- Shooting: T1 (${stats1.attributes.shooting.toFixed(1)}) vs T2 (${stats2.attributes.shooting.toFixed(1)}) -> Diff: ${shootingDiff.toFixed(1)} -> Favors: ${shootingFavored}
- Control: T1 (${stats1.attributes.control.toFixed(1)}) vs T2 (${stats2.attributes.control.toFixed(1)}) -> Diff: ${controlDiff.toFixed(1)} -> Favors: ${controlFavored}
- Passing: T1 (${stats1.attributes.passing.toFixed(1)}) vs T2 (${stats2.attributes.passing.toFixed(1)}) -> Diff: ${passingDiff.toFixed(1)} -> Favors: ${passingFavored}
- Defense: T1 (${stats1.attributes.defense.toFixed(1)}) vs T2 (${stats2.attributes.defense.toFixed(1)}) -> Diff: ${defDiff.toFixed(1)} -> Favors: ${defenseFavored}
- Pace: T1 (${stats1.attributes.pace.toFixed(1)}) vs T2 (${stats2.attributes.pace.toFixed(1)}) -> Diff: ${paceDiff.toFixed(1)} -> Favors: ${paceFavored}
- Vision: T1 (${stats1.attributes.vision.toFixed(1)}) vs T2 (${stats2.attributes.vision.toFixed(1)}) -> Diff: ${visionDiff.toFixed(1)} -> Favors: ${visionFavored}
- Grit: T1 (${stats1.attributes.grit.toFixed(1)}) vs T2 (${stats2.attributes.grit.toFixed(1)}) -> Diff: ${gritDiff.toFixed(1)} -> Favors: ${gritFavored}
- Stamina: T1 (${stats1.attributes.stamina.toFixed(1)}) vs T2 (${stats2.attributes.stamina.toFixed(1)}) -> Diff: ${staminaDiff.toFixed(1)} -> Favors: ${staminaFavored}

[Emergency + ATT]
${gkAnalysisBlock}
${attPreferenceLine}

[Lineups]
- T1: ${formatLineup(team1Players)}
- T2: ${formatLineup(team2Players)}

[Social]
- Social Satisfaction: ${socialSat.percentage}% (Wants: ${socialSat.wantsMet}/${socialSat.wantsTotal}, Dislikes: ${socialSat.dislikesMet}/${socialSat.dislikesTotal})
- Met wants links: ${getMetRelationshipDetails(team1Players, team2Players)}
- Met dislikes links: ${getMetDislikeDetails(team1Players, team2Players)}`;
}

/** Explains why no split can satisfy every rule, using causes that can be checked up front. */
function diagnoseRuleConflicts(players: Person[]): string[] {
  const reasons: string[] = [];
  const gkCount = countRole(players, 'GK');
  const defCount = countRole(players, 'DEF');

  if (gkCount > MAX_GK * 2) {
    reasons.push(`${gkCount} GK selected: max ${MAX_GK} GK per team.`);
  }

  if (defCount > MAX_DEF * 2) {
    reasons.push(`${defCount} DEF selected: max ${MAX_DEF} DEF per team.`);
  }

  const teamsWithoutGK = Math.max(0, 2 - gkCount);
  const capableOutfield = players.filter((player) => player.role !== 'GK' && player.gkWillingness !== 'no').length;
  if (capableOutfield < teamsWithoutGK * REQUIRED_GK_CAPABLE_WHEN_NO_GK) {
    reasons.push(
      `${gkCount} GK selected and ${capableOutfield} capable emergency keepers: each team without GK needs ${REQUIRED_GK_CAPABLE_WHEN_NO_GK}.`,
    );
  }

  const wantsGroups = getWantsGroups(players);
  const groupIndexById = new Map<string, number>();
  wantsGroups.forEach((group, index) => {
    group.forEach((player) => groupIndexById.set(player.id, index));

    if (group.length > TEAM_SIZE) {
      const names = group.map((player) => player.nickname).join(', ');
      reasons.push(`Wants chain ${group.length} players together (${names}); a team has ${TEAM_SIZE} spots.`);
    }
  });

  const byId = new Map(players.map((player) => [player.id, player]));
  const reportedPairs = new Set<string>();
  for (const player of players) {
    for (const avoidId of player.avoidsWith) {
      const target = byId.get(avoidId);
      if (!target || target.id === player.id) continue;

      const group = groupIndexById.get(player.id);
      if (group === undefined || group !== groupIndexById.get(avoidId)) continue;

      const pairKey = [player.id, avoidId].sort().join('|');
      if (reportedPairs.has(pairKey)) continue;
      reportedPairs.add(pairKey);
      reasons.push(`${player.nickname} avoids ${target.nickname}, but wants links chain them into the same team.`);
    }
  }

  return reasons;
}

function createFallbackSection(players: Person[], evaluation: SplitEvaluation): string {
  const { team1Players, team2Players, violations } = evaluation;
  const selectedGK = getTeamGKProfile(players);
  const reasons = diagnoseRuleConflicts(players);
  const lines = [
    '- FALLBACK USED: no split meets every rule, so the split that breaks the fewest rules was picked.',
    '- Relax order: avoids > wants > owner bias > ATT/DEF spread > GK/DEF limits.',
    ...(reasons.length > 0
      ? reasons.map((reason) => `- Why: ${reason}`)
      : ['- Why: no single cause; the rules only conflict when combined.']),
  ];

  const brokenAvoids = describeLinks(team1Players, team2Players, 'avoidsWith', true, AVOIDS_ARROWS);
  lines.push(violations.avoids === 0 ? '- Avoids: kept.' : `- Avoids: BROKEN (${brokenAvoids.join(', ')}).`);

  const brokenWants = describeLinks(team1Players, team2Players, 'wantsWith', false, WANTS_ARROWS);
  lines.push(violations.wants === 0 ? '- Wants: kept.' : `- Wants: BROKEN (${brokenWants.join(', ')}).`);

  const owner = players.find((player) => player.id === OWNER_ID);
  if (owner) {
    lines.push(
      violations.ownerBias === 0
        ? '- Owner bias: kept.'
        : `- Owner bias: BROKEN (${owner.nickname} is on the stronger team).`,
    );
  }

  const spreadIssues: string[] = [];
  const team1Def = countRole(team1Players, 'DEF');
  const team2Def = countRole(team2Players, 'DEF');
  if (countRole(players, 'DEF') === 2 && (team1Def !== 1 || team2Def !== 1)) {
    spreadIssues.push(`DEF split T1 ${team1Def} / T2 ${team2Def}, 2 DEF must split 1/1`);
  }
  const team1Att = countRole(team1Players, 'ATT');
  const team2Att = countRole(team2Players, 'ATT');
  if (Math.abs(team1Att - team2Att) > 1) {
    spreadIssues.push(`ATT split T1 ${team1Att} / T2 ${team2Att}, max difference 1`);
  }
  lines.push(spreadIssues.length === 0 ? '- ATT/DEF spread: kept.' : `- ATT/DEF spread: BROKEN (${spreadIssues.join('; ')}).`);

  const limitIssues: string[] = [];
  const describeTeamLimits = (label: 'T1' | 'T2', teamPlayers: Person[], profile: TeamGKProfile) => {
    if (profile.gkRoleCount > MAX_GK) limitIssues.push(`${label} has ${profile.gkRoleCount} GK, max ${MAX_GK}`);
    const defCount = countRole(teamPlayers, 'DEF');
    if (defCount > MAX_DEF) limitIssues.push(`${label} has ${defCount} DEF, max ${MAX_DEF}`);
    if (profile.gkRoleCount === 0 && profile.capableCount < REQUIRED_GK_CAPABLE_WHEN_NO_GK) {
      limitIssues.push(
        `${label} has no GK and ${profile.capableCount}/${REQUIRED_GK_CAPABLE_WHEN_NO_GK} capable keepers`,
      );
    }
  };
  describeTeamLimits('T1', team1Players, evaluation.team1GKProfile);
  describeTeamLimits('T2', team2Players, evaluation.team2GKProfile);
  lines.push(limitIssues.length === 0 ? '- GK/DEF limits: kept.' : `- GK/DEF limits: BROKEN (${limitIssues.join('; ')}).`);

  lines.push(
    `- Selected GK roles: ${selectedGK.gkRoleCount}; willingness good=${selectedGK.goodCount}, low=${selectedGK.lowCount}, no=${selectedGK.noCount}.`,
  );

  return lines.join('\n');
}

function buildOption(
  evaluation: SplitEvaluation,
  stage: GenerationStage,
  fallbackSection?: string,
): GeneratedTeamOption {
  const socialSat = calculateSocialSatisfaction(evaluation.team1Players, evaluation.team2Players);

  return {
    team1: { players: evaluation.team1Players, totalRating: evaluation.stats1.rating },
    team2: { players: evaluation.team2Players, totalRating: evaluation.stats2.rating },
    socialSatisfactionPct: socialSat.percentage,
    explanation: createAnalysisExplanation(evaluation, socialSat, fallbackSection),
    isFallback: stage === 'FALLBACK',
    score: evaluation.score,
    stage,
  };
}

function getTeamRatingDiff(option: GeneratedTeamOption): number {
  return Math.abs(option.team1.totalRating - option.team2.totalRating);
}

function buildComparison(
  primary: GeneratedTeamOption,
  secondary: GeneratedTeamOption,
  reason: string,
): TeamOptionComparison {
  const primaryTeam1Ids = new Set(primary.team1.players.map((player) => player.id));

  const movedToTeam1 = secondary.team1.players
    .filter((player) => !primaryTeam1Ids.has(player.id))
    .map((player) => player.nickname)
    .sort((a, b) => a.localeCompare(b));

  const movedToTeam2 = secondary.team2.players
    .filter((player) => primaryTeam1Ids.has(player.id))
    .map((player) => player.nickname)
    .sort((a, b) => a.localeCompare(b));

  return {
    reason,
    scoreDelta: secondary.score - primary.score,
    ratingDiffDelta: getTeamRatingDiff(secondary) - getTeamRatingDiff(primary),
    socialDelta: secondary.socialSatisfactionPct - primary.socialSatisfactionPct,
    movedToTeam1,
    movedToTeam2,
  };
}

export function generateTeams(players: Person[]): GeneratedTeams | null {
  if (players.length !== MATCH_SIZE) return null;
  if (new Set(players.map((player) => player.id)).size !== players.length) return null;

  const evaluations = evaluateAllSplits(players);

  // Strict stage: every hard rule holds. Rank by balance and offer the runner-up as second option.
  const strictRanked = evaluations.filter(isStrictSplit).sort(compareByBalance);
  if (strictRanked.length > 0) {
    const primary = buildOption(strictRanked[0], 'STRICT');
    const secondary = strictRanked.length > 1 ? buildOption(strictRanked[1], 'STRICT') : null;

    return {
      primary,
      secondary,
      secondaryReason: secondary ? SECONDARY_OPTION_REASON : NO_SECONDARY_OPTION_REASON,
      comparison: secondary ? buildComparison(primary, secondary, SECONDARY_OPTION_REASON) : null,
    };
  }

  // Fallback: no split meets every rule. Pick the split that breaks the fewest rules,
  // in priority order, so avoids are only broken when no avoid-safe split exists.
  const [closest] = [...evaluations].sort(compareByFewestViolations);

  return {
    primary: buildOption(closest, 'FALLBACK', createFallbackSection(players, closest)),
    secondary: null,
    secondaryReason: NO_SECONDARY_OPTION_REASON,
    comparison: null,
  };
}
