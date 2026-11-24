import type {
  Person,
  GeneratedTeams,
  AnalysisReport,
  AttributeLevel,
  Attributes,
  BalanceLabel,
  FallbackCause,
  FallbackReport,
  Favors,
  GeneratedTeamOption,
  GenerationStage,
  HardRule,
  LinkRef,
  RuleIssue,
  RuleStatus,
  TeamKeeperReport,
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

// Mutual wants are a hard rule. A one-way want (A wants B, B does not want A) is a
// preference: each one left across teams costs this many score points.
// 10 score points = 1 point of rating difference between the teams.
export const ONE_WAY_WANT_PENALTY = 15;

// Not "lower score": the runner-up can tie on score and lose on social satisfaction or rating gap.
const SECONDARY_OPTION_REASON =
  'Next best split under the same rules. Ranking: score, then social satisfaction, then rating gap.';
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

interface WantsPreferenceBreakdown {
  /** True when at least one one-way want links two selected players. */
  applies: boolean;
  oneWayTotal: number;
  oneWayBroken: number;
  adjustment: number;
}

/** Want links between selected players, worked out once per selection. */
interface WantLinks {
  mutualPairs: [string, string][];
  oneWay: [string, string][];
}

/** Hard-rule violations of a split. A strict split has every count at 0. */
interface RuleViolations {
  /** Directed avoid links between players of the same team. */
  avoids: number;
  /** Mutual want pairs split across teams. One-way wants are a preference, not a rule. */
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
  wantLinks: WantLinks;
}

/** What the ranking looks at, in order: score, then social satisfaction, then rating gap. */
export interface RankableSplit {
  score: number;
  socialPct: number;
  ratingDiff: number;
  displayKey: string;
}

interface SplitEvaluation extends RankableSplit {
  team1Players: Person[];
  team2Players: Person[];
  stats1: TeamStats;
  stats2: TeamStats;
  team1GKProfile: TeamGKProfile;
  team2GKProfile: TeamGKProfile;
  gkPreference: GKPreferenceBreakdown;
  attPreference: AttPreferenceBreakdown;
  wantsPreference: WantsPreferenceBreakdown;
  social: SocialSatisfaction;
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

/** Splits the want links between selected players into mutual pairs and one-way links. */
function classifyWantLinks(players: Person[]): WantLinks {
  const byId = new Map(players.map((player) => [player.id, player]));
  const mutualPairs: [string, string][] = [];
  const oneWay: [string, string][] = [];
  const seenPairs = new Set<string>();

  for (const player of players) {
    for (const targetId of new Set(player.wantsWith)) {
      const target = byId.get(targetId);
      if (!target || target.id === player.id) continue;

      if (!target.wantsWith.includes(player.id)) {
        oneWay.push([player.id, targetId]);
        continue;
      }

      const pairKey = [player.id, targetId].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      mutualPairs.push([player.id, targetId]);
    }
  }

  return { mutualPairs, oneWay };
}

/** How many links end up with each player on a different team. */
function countSplitLinks(links: [string, string][], team1Ids: ReadonlySet<string>): number {
  return links.reduce((count, [a, b]) => count + (team1Ids.has(a) !== team1Ids.has(b) ? 1 : 0), 0);
}

function getWantsPreference(links: WantLinks, team1Ids: ReadonlySet<string>): WantsPreferenceBreakdown {
  const oneWayBroken = countSplitLinks(links.oneWay, team1Ids);

  return {
    applies: links.oneWay.length > 0,
    oneWayTotal: links.oneWay.length,
    oneWayBroken,
    adjustment: oneWayBroken === 0 ? 0 : -oneWayBroken * ONE_WAY_WANT_PENALTY,
  };
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
  const team1Ids = new Set(canonical.team1Players.map((player) => player.id));
  const team1GKProfile = getTeamGKProfile(canonical.team1Players);
  const team2GKProfile = getTeamGKProfile(canonical.team2Players);
  const gkPreference = getGKPreferenceBreakdown(team1GKProfile, team2GKProfile);
  const attPreference = getAttPreferenceBreakdown(canonical.team1Players, canonical.team2Players);
  const wantsPreference = getWantsPreference(context.wantLinks, team1Ids);
  const score =
    calculateBalanceScore(canonical.stats1, canonical.stats2) +
    gkPreference.adjustment +
    attPreference.adjustment +
    wantsPreference.adjustment;
  const social = calculateSocialSatisfaction(canonical.team1Players, canonical.team2Players);

  return {
    team1Players: canonical.team1Players,
    team2Players: canonical.team2Players,
    stats1: canonical.stats1,
    stats2: canonical.stats2,
    team1GKProfile,
    team2GKProfile,
    gkPreference,
    attPreference,
    wantsPreference,
    social,
    score,
    socialPct: social.percentage,
    ratingDiff: Math.abs(canonical.stats1.rating - canonical.stats2.rating),
    displayKey: canonical.displayKey,
    violations: {
      avoids: countAvoidViolations(canonical.team1Players) + countAvoidViolations(canonical.team2Players),
      wants: countSplitLinks(context.wantLinks.mutualPairs, team1Ids),
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
    wantLinks: classifyWantLinks(players),
  };

  return getCombinations(rest, TEAM_SIZE - 1).map((partners) => {
    const teamAIds = new Set([anchor.id, ...partners.map((player) => player.id)]);
    const teamAPlayers = players.filter((player) => teamAIds.has(player.id));
    const teamBPlayers = players.filter((player) => !teamAIds.has(player.id));
    return evaluateSplit(teamAPlayers, teamBPlayers, context);
  });
}

/**
 * Best split first: higher score, then higher social satisfaction (wants and avoids met),
 * then smaller rating gap, then a fixed order by ids so the result never depends on input order.
 */
export function compareSplitsByBalance(a: RankableSplit, b: RankableSplit): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  if (a.socialPct !== b.socialPct) {
    return b.socialPct - a.socialPct;
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

  return compareSplitsByBalance(a, b);
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
 * are in the same team. Mutual links are listed once.
 */
function listLinks(
  team1: Person[],
  team2: Person[],
  linkKey: 'wantsWith' | 'avoidsWith',
  sameTeam: boolean,
  only?: 'mutual' | 'oneWay',
): LinkRef[] {
  const allPlayers = [...team1, ...team2];
  const byId = new Map(allPlayers.map((player) => [player.id, player]));
  const team1Ids = new Set(team1.map((player) => player.id));
  const processed = new Set<string>();
  const links: LinkRef[] = [];

  for (const source of allPlayers) {
    for (const targetId of source[linkKey]) {
      const target = byId.get(targetId);
      if (!target) continue;
      if ((team1Ids.has(source.id) === team1Ids.has(targetId)) !== sameTeam) continue;

      const isMutual = target[linkKey].includes(source.id);
      if ((only === 'mutual' && !isMutual) || (only === 'oneWay' && isMutual)) continue;
      const pairKey = isMutual ? [source.id, targetId].sort().join('|') : `${source.id}->${targetId}`;
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      links.push({ from: source.nickname, to: target.nickname, mutual: isMutual });
    }
  }

  return links;
}

function formatLink(link: LinkRef, arrows: { oneWay: string; mutual: string }): string {
  return `${link.from} ${link.mutual ? arrows.mutual : arrows.oneWay} ${link.to}`;
}

/** The same links as text, with the mutual arrow for mutual ones. */
function describeLinks(
  team1: Person[],
  team2: Person[],
  linkKey: 'wantsWith' | 'avoidsWith',
  sameTeam: boolean,
  arrows: { oneWay: string; mutual: string },
  only?: 'mutual' | 'oneWay',
): string[] {
  return listLinks(team1, team2, linkKey, sameTeam, only).map((link) => formatLink(link, arrows));
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

/** Groups of selected players chained together by mutual wants, the only wants that are a rule. */
function getMutualWantGroups(players: Person[], mutualPairs: [string, string][]): Person[][] {
  const parent = new Map(players.map((player) => [player.id, player.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };

  for (const [a, b] of mutualPairs) {
    parent.set(find(a), find(b));
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

function createAnalysisExplanation(evaluation: SplitEvaluation, fallbackSection?: string): string {
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
    wantsPreference,
    social: socialSat,
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
    attPreference.adjustment +
    wantsPreference.adjustment;

  const fmt = (value: number): string => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

  // The label describes how even the teams are, so it leaves out the one-way wants penalty.
  const balanceScore = score - wantsPreference.adjustment;
  const scoreLabel =
    balanceScore >= 70
      ? 'highly balanced'
      : balanceScore >= 40
        ? 'balanced'
        : balanceScore >= 0
          ? 'playable but imbalanced'
          : 'imbalanced';
  const scoreStatus =
    wantsPreference.oneWayBroken > 0
      ? `${scoreLabel}; ${wantsPreference.oneWayBroken} broken one-way want${wantsPreference.oneWayBroken === 1 ? '' : 's'} ${formatScoreAdjustment(wantsPreference.adjustment)}`
      : scoreLabel;

  const oneWayLines = wantsPreference.applies
    ? [
        `\n- One-way wants (preference, ${formatScoreAdjustment(-ONE_WAY_WANT_PENALTY)} each if broken): kept ${wantsPreference.oneWayTotal - wantsPreference.oneWayBroken}/${wantsPreference.oneWayTotal}.`,
        wantsPreference.oneWayBroken > 0
          ? `\n- Broken one-way wants: ${describeLinks(team1Players, team2Players, 'wantsWith', false, WANTS_ARROWS, 'oneWay').join(', ')}`
          : '',
      ].join('')
    : '';

  const gkAnalysisBlock = createGKEmergencyAnalysisBlock(team1GKProfile, team2GKProfile, gkPreference);

  const attSpreadStatus = Math.abs(attPreference.team1Att - attPreference.team2Att) <= 1 ? 'passed' : 'broken';
  const attPreferenceLine =
    attPreference.totalAtt >= 5 && attPreference.overloadedTeam !== 'Even'
      ? `- ATT score preference: hard spread ${attSpreadStatus}, total ATT ${attPreference.totalAtt}, split T1 ${attPreference.team1Att} / T2 ${attPreference.team2Att}; overloaded side ${attPreference.overloadedTeam} has DEF=${attPreference.overloadedDefCount ?? 0}, adjustment ${formatScoreAdjustment(attPreference.adjustment)}.`
      : `- ATT score preference: hard spread ${attSpreadStatus}, total ATT ${attPreference.totalAtt}, split T1 ${attPreference.team1Att} / T2 ${attPreference.team2Att}, adjustment ${formatScoreAdjustment(attPreference.adjustment)}.`;

  const fallbackBlock = fallbackSection ? `\n\n[Fallback]\n${fallbackSection}` : '';

  return `Analysis (Score: ${Math.round(score)})${fallbackBlock}

[Details]
- Score formula: ${POINTS.RATING_BALANCE_BASE} - rating(${fmt(ratingDiff)}x10=${fmt(ratingPenalty)}) - attrs(${fmt(totalAttrDiff)}x5=${fmt(totalAttrPenalty)}) - pace(${fmt(paceDiff)}x10=${fmt(pacePenalty)}) - stamina(${fmt(staminaDiff)}x8=${fmt(staminaPenalty)}) - defense(${fmt(defDiff)}x5=${fmt(defensePenalty)})${gkPreference.applies ? ` + gkPref(${formatScoreAdjustment(gkPreference.adjustment)})` : ''} + attPref(${formatScoreAdjustment(attPreference.adjustment)})${wantsPreference.applies ? ` + wantsPref(${formatScoreAdjustment(wantsPreference.adjustment)})` : ''} = ${fmt(scoreRebuilt)}.
- Current score status: ${Math.round(score)} (${scoreStatus}).
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
- Met wants links: ${getMetRelationshipDetails(team1Players, team2Players)}${oneWayLines}
- Met dislikes links: ${getMetDislikeDetails(team1Players, team2Players)}`;
}

/** Why no split can satisfy every rule, from causes that can be checked up front. */
function diagnoseCauses(players: Person[]): FallbackCause[] {
  const causes: FallbackCause[] = [];
  const gkCount = countRole(players, 'GK');
  const defCount = countRole(players, 'DEF');

  if (gkCount > MAX_GK * 2) {
    causes.push({ kind: 'tooManyGK', count: gkCount, maxPerTeam: MAX_GK });
  }

  if (defCount > MAX_DEF * 2) {
    causes.push({ kind: 'tooManyDEF', count: defCount, maxPerTeam: MAX_DEF });
  }

  const teamsWithoutGK = Math.max(0, 2 - gkCount);
  const capableOutfield = players.filter((player) => player.role !== 'GK' && player.gkWillingness !== 'no').length;
  if (capableOutfield < teamsWithoutGK * REQUIRED_GK_CAPABLE_WHEN_NO_GK) {
    causes.push({
      kind: 'fewKeepers',
      gkCount,
      capable: capableOutfield,
      neededPerTeam: REQUIRED_GK_CAPABLE_WHEN_NO_GK,
    });
  }

  // Only mutual wants are a rule, so only they can make every split impossible.
  const wantsGroups = getMutualWantGroups(players, classifyWantLinks(players).mutualPairs);
  const groupIndexById = new Map<string, number>();
  wantsGroups.forEach((group, index) => {
    group.forEach((player) => groupIndexById.set(player.id, index));

    if (group.length > TEAM_SIZE) {
      causes.push({ kind: 'wantsChain', nicknames: group.map((player) => player.nickname), teamSize: TEAM_SIZE });
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
      causes.push({ kind: 'avoidInChain', from: player.nickname, to: target.nickname });
    }
  }

  return causes;
}

function describeCause(cause: FallbackCause): string {
  switch (cause.kind) {
    case 'tooManyGK':
      return `${cause.count} GK selected: max ${cause.maxPerTeam} GK per team.`;
    case 'tooManyDEF':
      return `${cause.count} DEF selected: max ${cause.maxPerTeam} DEF per team.`;
    case 'fewKeepers':
      return `${cause.gkCount} GK selected and ${cause.capable} capable emergency keepers: each team without GK needs ${cause.neededPerTeam}.`;
    case 'wantsChain':
      return `Wants chain ${cause.nicknames.length} players together (${cause.nicknames.join(', ')}); a team has ${cause.teamSize} spots.`;
    case 'avoidInChain':
      return `${cause.from} avoids ${cause.to}, but wants links chain them into the same team.`;
  }
}

/** Every hard rule that applies to this selection, kept or broken in this split, in relax order. */
function getRuleStatuses(players: Person[], evaluation: SplitEvaluation): RuleStatus[] {
  const { team1Players, team2Players, violations } = evaluation;
  const status = (rule: HardRule, kept: boolean, issues: RuleIssue[]): RuleStatus => ({
    rule,
    kept,
    issues: kept ? [] : issues,
  });
  const statuses: RuleStatus[] = [];

  statuses.push(
    status(
      'avoids',
      violations.avoids === 0,
      listLinks(team1Players, team2Players, 'avoidsWith', true).map((link) => ({ kind: 'avoidTogether', link })),
    ),
  );

  // Only mutual wants are a rule; broken one-way wants show up under Social.
  statuses.push(
    status(
      'wants',
      violations.wants === 0,
      listLinks(team1Players, team2Players, 'wantsWith', false, 'mutual').map((link) => ({ kind: 'wantSplit', link })),
    ),
  );

  const owner = players.find((player) => player.id === OWNER_ID);
  if (owner) {
    statuses.push(
      status('ownerBias', violations.ownerBias === 0, [{ kind: 'ownerOnStronger', nickname: owner.nickname }]),
    );
  }

  const spreadIssues: RuleIssue[] = [];
  const team1Def = countRole(team1Players, 'DEF');
  const team2Def = countRole(team2Players, 'DEF');
  if (countRole(players, 'DEF') === 2 && (team1Def !== 1 || team2Def !== 1)) {
    spreadIssues.push({ kind: 'defSplit', team1: team1Def, team2: team2Def });
  }
  const team1Att = countRole(team1Players, 'ATT');
  const team2Att = countRole(team2Players, 'ATT');
  if (Math.abs(team1Att - team2Att) > 1) {
    spreadIssues.push({ kind: 'attSplit', team1: team1Att, team2: team2Att });
  }
  statuses.push(status('roleSpread', spreadIssues.length === 0, spreadIssues));

  const limitIssues: RuleIssue[] = [];
  const collectTeamLimits = (team: 'T1' | 'T2', teamPlayers: Person[], profile: TeamGKProfile) => {
    if (profile.gkRoleCount > MAX_GK) {
      limitIssues.push({ kind: 'tooManyGK', team, count: profile.gkRoleCount, max: MAX_GK });
    }
    const defCount = countRole(teamPlayers, 'DEF');
    if (defCount > MAX_DEF) limitIssues.push({ kind: 'tooManyDEF', team, count: defCount, max: MAX_DEF });
    if (profile.gkRoleCount === 0 && profile.capableCount < REQUIRED_GK_CAPABLE_WHEN_NO_GK) {
      limitIssues.push({
        kind: 'fewKeepers',
        team,
        capable: profile.capableCount,
        needed: REQUIRED_GK_CAPABLE_WHEN_NO_GK,
      });
    }
  };
  collectTeamLimits('T1', team1Players, evaluation.team1GKProfile);
  collectTeamLimits('T2', team2Players, evaluation.team2GKProfile);
  statuses.push(status('roleLimits', limitIssues.length === 0, limitIssues));

  return statuses;
}

function describeRuleIssue(issue: RuleIssue): string {
  switch (issue.kind) {
    case 'avoidTogether':
      return formatLink(issue.link, AVOIDS_ARROWS);
    case 'wantSplit':
      return formatLink(issue.link, WANTS_ARROWS);
    case 'ownerOnStronger':
      return `${issue.nickname} is on the stronger team`;
    case 'defSplit':
      return `DEF split T1 ${issue.team1} / T2 ${issue.team2}, 2 DEF must split 1/1`;
    case 'attSplit':
      return `ATT split T1 ${issue.team1} / T2 ${issue.team2}, max difference 1`;
    case 'tooManyGK':
      return `${issue.team} has ${issue.count} GK, max ${issue.max}`;
    case 'tooManyDEF':
      return `${issue.team} has ${issue.count} DEF, max ${issue.max}`;
    case 'fewKeepers':
      return `${issue.team} has no GK and ${issue.capable}/${issue.needed} capable keepers`;
  }
}

const RULE_TEXT: Record<HardRule, { label: string; separator: string }> = {
  avoids: { label: 'Avoids', separator: ', ' },
  wants: { label: 'Mutual wants', separator: ', ' },
  ownerBias: { label: 'Owner bias', separator: ', ' },
  roleSpread: { label: 'ATT/DEF spread', separator: '; ' },
  roleLimits: { label: 'GK/DEF limits', separator: '; ' },
};

function buildFallbackReport(players: Person[], evaluation: SplitEvaluation): FallbackReport {
  return { causes: diagnoseCauses(players), rules: getRuleStatuses(players, evaluation) };
}

function createFallbackSection(players: Person[], fallback: FallbackReport): string {
  const selectedGK = getTeamGKProfile(players);
  const lines = [
    '- FALLBACK USED: no split meets every rule, so the split that breaks the fewest rules was picked.',
    '- Relax order: avoids > wants > owner bias > ATT/DEF spread > GK/DEF limits.',
    ...(fallback.causes.length > 0
      ? fallback.causes.map((cause) => `- Why: ${describeCause(cause)}`)
      : ['- Why: no single cause; the rules only conflict when combined.']),
  ];

  for (const { rule, kept, issues } of fallback.rules) {
    const { label, separator } = RULE_TEXT[rule];
    lines.push(
      kept ? `- ${label}: kept.` : `- ${label}: BROKEN (${issues.map(describeRuleIssue).join(separator)}).`,
    );
  }

  lines.push(
    `- Selected GK roles: ${selectedGK.gkRoleCount}; willingness good=${selectedGK.goodCount}, low=${selectedGK.lowCount}, no=${selectedGK.noCount}.`,
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Analysis as data: what the app shows and translates
// ---------------------------------------------------------------------------

const ATTRIBUTE_ORDER: (keyof Attributes)[] = [
  'shooting',
  'control',
  'passing',
  'defense',
  'pace',
  'vision',
  'grit',
  'stamina',
];

function getFavoredSide(team1Value: number, team2Value: number): Favors {
  if (team1Value > team2Value) return 'T1';
  if (team2Value > team1Value) return 'T2';
  return 'Even';
}

function getBalanceLabel(balanceScore: number): BalanceLabel {
  if (balanceScore >= 70) return 'highlyBalanced';
  if (balanceScore >= 40) return 'balanced';
  if (balanceScore >= 0) return 'playable';
  return 'imbalanced';
}

function buildKeeperReport(profile: TeamGKProfile, breakdown: TeamGKScoreBreakdown): TeamKeeperReport {
  return {
    gkCount: profile.gkRoleCount,
    good: profile.goodCount,
    low: profile.lowCount,
    no: profile.noCount,
    capable: profile.capableCount,
    missing: breakdown.missingCapable,
    adjustment: breakdown.adjustment,
  };
}

function buildAnalysisReport(evaluation: SplitEvaluation, fallback: FallbackReport | null): AnalysisReport {
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
    wantsPreference,
    social,
  } = evaluation;

  const attributes = ATTRIBUTE_ORDER.map((key) => ({
    key,
    team1: stats1.attributes[key],
    team2: stats2.attributes[key],
    diff: Math.abs(stats1.attributes[key] - stats2.attributes[key]),
    favors: getFavoredSide(stats1.attributes[key], stats2.attributes[key]),
  }));
  const diffOf = (key: keyof Attributes) => Math.abs(stats1.attributes[key] - stats2.attributes[key]);

  const ratingDiff = Math.abs(stats1.rating - stats2.rating);
  const attrDiff = attributes.reduce((sum, attribute) => sum + attribute.diff, 0);
  const paceDiff = diffOf('pace');
  const staminaDiff = diffOf('stamina');
  const defenseDiff = diffOf('defense');
  const ratingPenalty = ratingDiff * 10;
  const attrPenalty = attrDiff * 5;
  const pacePenalty = paceDiff * 10;
  const staminaPenalty = staminaDiff * 8;
  const defensePenalty = defenseDiff * 5;

  return {
    score,
    // The label describes how even the teams are, so it leaves out the one-way wants penalty.
    balanceLabel: getBalanceLabel(score - wantsPreference.adjustment),
    formula: {
      base: POINTS.RATING_BALANCE_BASE,
      ratingDiff,
      ratingPenalty,
      attrDiff,
      attrPenalty,
      paceDiff,
      pacePenalty,
      staminaDiff,
      staminaPenalty,
      defenseDiff,
      defensePenalty,
      gkPref: gkPreference.applies ? gkPreference.adjustment : null,
      attPref: attPreference.adjustment,
      wantsPref: wantsPreference.applies ? wantsPreference.adjustment : null,
      total:
        POINTS.RATING_BALANCE_BASE -
        ratingPenalty -
        attrPenalty -
        pacePenalty -
        staminaPenalty -
        defensePenalty +
        gkPreference.adjustment +
        attPreference.adjustment +
        wantsPreference.adjustment,
    },
    rating: {
      team1: stats1.rating,
      team2: stats2.rating,
      diff: ratingDiff,
      favors: getFavoredSide(stats1.rating, stats2.rating),
    },
    attributes,
    keepers: {
      neededWithoutGK: REQUIRED_GK_CAPABLE_WHEN_NO_GK,
      team1: buildKeeperReport(team1GKProfile, gkPreference.team1),
      team2: buildKeeperReport(team2GKProfile, gkPreference.team2),
      pass: gkPreference.team1.missingCapable === 0 && gkPreference.team2.missingCapable === 0,
    },
    att: {
      total: attPreference.totalAtt,
      team1: attPreference.team1Att,
      team2: attPreference.team2Att,
      spreadKept: Math.abs(attPreference.team1Att - attPreference.team2Att) <= 1,
      overloaded: attPreference.totalAtt >= 5 ? attPreference.overloadedTeam : 'Even',
      overloadedDef: attPreference.overloadedDefCount,
      adjustment: attPreference.adjustment,
    },
    social: {
      pct: social.percentage,
      wantsMet: social.wantsMet,
      wantsTotal: social.wantsTotal,
      avoidsMet: social.dislikesMet,
      avoidsTotal: social.dislikesTotal,
      metWants: listLinks(team1Players, team2Players, 'wantsWith', true),
      metAvoids: listLinks(team1Players, team2Players, 'avoidsWith', false),
      oneWay: wantsPreference.applies
        ? {
            total: wantsPreference.oneWayTotal,
            broken: wantsPreference.oneWayBroken,
            penaltyEach: ONE_WAY_WANT_PENALTY,
            adjustment: wantsPreference.adjustment,
            brokenLinks: listLinks(team1Players, team2Players, 'wantsWith', false, 'oneWay'),
          }
        : null,
    },
    fallback,
  };
}

function buildOption(
  evaluation: SplitEvaluation,
  stage: GenerationStage,
  fallback?: { report: FallbackReport; section: string },
): GeneratedTeamOption {
  return {
    team1: { players: evaluation.team1Players, totalRating: evaluation.stats1.rating },
    team2: { players: evaluation.team2Players, totalRating: evaluation.stats2.rating },
    socialSatisfactionPct: evaluation.socialPct,
    explanation: createAnalysisExplanation(evaluation, fallback?.section),
    report: buildAnalysisReport(evaluation, fallback?.report ?? null),
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
  const strictRanked = evaluations.filter(isStrictSplit).sort(compareSplitsByBalance);
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

  const fallbackReport = buildFallbackReport(players, closest);

  return {
    primary: buildOption(closest, 'FALLBACK', {
      report: fallbackReport,
      section: createFallbackSection(players, fallbackReport),
    }),
    secondary: null,
    secondaryReason: NO_SECONDARY_OPTION_REASON,
    comparison: null,
  };
}
