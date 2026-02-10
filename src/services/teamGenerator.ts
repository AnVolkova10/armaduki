import type { Person, GeneratedTeams, AttributeLevel, Attributes } from '../types';

// Points configuration
const POINTS = {
  RATING_BALANCE_BASE: 100,
};

// Hard Constraints
const MAX_GK = 1;
const MAX_DEF = 2;
const MAX_ATT = 2;
const REQUIRED_GK_WILLINGNESS = 3; // If no main GK

function resolveOwnerId(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return '10';
}

const OWNER_ID = resolveOwnerId(import.meta.env.VITE_OWNER_ID);

interface TeamStats {
  rating: number;
  attributes: Record<keyof Attributes, number>;
}

type TeamValidationReason = 'social' | 'roles' | 'emergencyGK';
type WantsConstraintMode = 'strict' | 'relaxed_unilateral' | 'relaxed_mutual';
type WantsValidationReason = 'wantsStrict' | 'wantsMutual';

interface FailureStats {
  social: number;
  roles: number;
  emergencyGK: number;
  roleSplit: number;
  wantsStrict: number;
  wantsMutual: number;
  ownerBias: number;
}

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
    shooting: 0, control: 0, passing: 0, defense: 0,
    pace: 0, vision: 0, grit: 0, stamina: 0
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

function hasSocialConflict(players: Person[]): boolean {
  const ids = new Set(players.map(p => p.id));
  for (const p of players) {
    for (const avoidId of p.avoidsWith) {
      if (ids.has(avoidId)) return true; // Hard constraint: Avoid means NO
    }
  }
  return false;
}

function validateTeam(players: Person[]): { valid: boolean; reason?: TeamValidationReason } {
  // 1. Social Hard Constraint
  if (hasSocialConflict(players)) return { valid: false, reason: 'social' };

  let gkCount = 0;
  let defCount = 0;
  let attCount = 0;
  let gkWillingCount = 0;

  for (const p of players) {
    if (p.role === 'GK') gkCount++;
    if (p.role === 'DEF') defCount++;
    if (p.role === 'ATT') attCount++;
    if (p.gkWillingness === 'yes') gkWillingCount++; // Only YES counts now
  }

  if (gkCount > MAX_GK) return { valid: false, reason: 'roles' };
  if (defCount > MAX_DEF) return { valid: false, reason: 'roles' };
  if (attCount > MAX_ATT) return { valid: false, reason: 'roles' };

  // Emergency GK Rule
  if (gkCount === 0 && gkWillingCount < REQUIRED_GK_WILLINGNESS) return { valid: false, reason: 'emergencyGK' };

  return { valid: true };
}

function countRole(players: Person[], role: Person['role']): number {
  return players.reduce((total, player) => total + (player.role === role ? 1 : 0), 0);
}

function validateRoleSplitWhenExactlyTwo(
  team1: Person[],
  team2: Person[],
  allPlayers: Person[],
): { valid: boolean; reason?: 'roleSplit' } {
  const rolesToSplit: Person['role'][] = ['ATT', 'DEF'];

  for (const role of rolesToSplit) {
    const totalRoleCount = countRole(allPlayers, role);
    if (totalRoleCount !== 2) continue;

    const team1RoleCount = countRole(team1, role);
    const team2RoleCount = countRole(team2, role);
    if (team1RoleCount !== 1 || team2RoleCount !== 1) {
      return { valid: false, reason: 'roleSplit' };
    }
  }

  return { valid: true };
}

function validateWantsConstraint(
  team1: Person[],
  team2: Person[],
  mode: WantsConstraintMode,
): { valid: boolean; reason?: WantsValidationReason } {
  if (mode === 'relaxed_mutual') {
    return { valid: true };
  }

  const allPlayers = [...team1, ...team2];
  const selectedIds = new Set(allPlayers.map((player) => player.id));
  const byId = new Map(allPlayers.map((player) => [player.id, player]));
  const team1Ids = new Set(team1.map((player) => player.id));

  for (const source of allPlayers) {
    for (const targetId of source.wantsWith) {
      if (!selectedIds.has(targetId)) continue;
      const target = byId.get(targetId);
      if (!target) continue;

      const sameTeam = team1Ids.has(source.id) === team1Ids.has(targetId);
      if (sameTeam) continue;

      if (mode === 'strict') {
        return { valid: false, reason: 'wantsStrict' };
      }

      const isMutual = target.wantsWith.includes(source.id);
      if (isMutual) {
        return { valid: false, reason: 'wantsMutual' };
      }
    }
  }

  return { valid: true };
}

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

function createAnalysisExplanation(
  score: number,
  stats1: TeamStats,
  stats2: TeamStats,
  socialSat: ReturnType<typeof calculateSocialSatisfaction>,
  socialMetLinks: string,
  socialMetDislikes: string,
): string {
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
    defensePenalty;

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

  return `Analysis (Score: ${Math.round(score)})

[Details]
- Score formula: ${POINTS.RATING_BALANCE_BASE} - rating(${fmt(ratingDiff)}x10=${fmt(ratingPenalty)}) - attrs(${fmt(totalAttrDiff)}x5=${fmt(totalAttrPenalty)}) - pace(${fmt(paceDiff)}x10=${fmt(pacePenalty)}) - stamina(${fmt(staminaDiff)}x8=${fmt(staminaPenalty)}) - defense(${fmt(defDiff)}x5=${fmt(defensePenalty)}) = ${fmt(scoreRebuilt)}.
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

[Social]
- Social Satisfaction: ${socialSat.percentage}% (Wants: ${socialSat.wantsMet}/${socialSat.wantsTotal}, Dislikes: ${socialSat.dislikesMet}/${socialSat.dislikesTotal})
- Met wants links: ${socialMetLinks}
- Met dislikes links: ${socialMetDislikes}`;
}

function findBestResultForMode(
  players: Person[],
  allCombinations: Person[][],
  mode: WantsConstraintMode,
  failureStats: FailureStats,
): GeneratedTeams | null {
  let bestResult: GeneratedTeams | null = null;
  let bestScore = -Infinity;
  const owner = players.find((player) => player.id === OWNER_ID);

  for (const team1Players of allCombinations) {
    const team1Ids = new Set(team1Players.map((player) => player.id));
    const team2Players = players.filter((player) => !team1Ids.has(player.id));

    const v1 = validateTeam(team1Players);
    const v2 = validateTeam(team2Players);
    if (!v1.valid || !v2.valid) {
      if (v1.reason) failureStats[v1.reason]++;
      if (v2.reason) failureStats[v2.reason]++;
      continue;
    }

    const roleSplitValidation = validateRoleSplitWhenExactlyTwo(team1Players, team2Players, players);
    if (!roleSplitValidation.valid) {
      failureStats.roleSplit++;
      continue;
    }

    const wantsValidation = validateWantsConstraint(team1Players, team2Players, mode);
    if (!wantsValidation.valid) {
      if (wantsValidation.reason) failureStats[wantsValidation.reason]++;
      continue;
    }

    const stats1 = calculateTeamStats(team1Players);
    const stats2 = calculateTeamStats(team2Players);
    const ratingDiff = Math.abs(stats1.rating - stats2.rating);

    // Owner bias: owner must stay in weaker/equal team.
    if (owner && ratingDiff > 0) {
      const ownerInTeam1 = team1Ids.has(OWNER_ID);
      const team1IsStronger = stats1.rating > stats2.rating;
      if ((ownerInTeam1 && team1IsStronger) || (!ownerInTeam1 && !team1IsStronger)) {
        failureStats.ownerBias++;
        continue;
      }
    }

    const score = calculateBalanceScore(stats1, stats2);
    if (score <= bestScore) continue;

    const socialSat = calculateSocialSatisfaction(team1Players, team2Players);
    const socialMetLinks = getMetRelationshipDetails(team1Players, team2Players);
    const socialMetDislikes = getMetDislikeDetails(team1Players, team2Players);

    bestScore = score;
    bestResult = {
      team1: { players: team1Players, totalRating: stats1.rating },
      team2: { players: team2Players, totalRating: stats2.rating },
      socialSatisfactionPct: socialSat.percentage,
      explanation: createAnalysisExplanation(
        score,
        stats1,
        stats2,
        socialSat,
        socialMetLinks,
        socialMetDislikes,
      ),
      isFallback: false,
    };
  }

  return bestResult;
}

export function generateTeams(players: Person[]): GeneratedTeams | null {
  if (players.length !== 10) return null;

  const allCombinations = getCombinations(players, 5);
  const failureStats: FailureStats = {
    social: 0,
    roles: 0,
    emergencyGK: 0,
    roleSplit: 0,
    wantsStrict: 0,
    wantsMutual: 0,
    ownerBias: 0,
  };

  const stageModes: WantsConstraintMode[] = ['strict', 'relaxed_unilateral', 'relaxed_mutual'];
  for (const stageMode of stageModes) {
    const stageResult = findBestResultForMode(players, allCombinations, stageMode, failureStats);
    if (stageResult) {
      return stageResult;
    }
  }

  // Final fallback: snake split best-fit as last resort.
  const total =
    failureStats.social +
    failureStats.roles +
    failureStats.emergencyGK +
    failureStats.roleSplit +
    failureStats.wantsStrict +
    failureStats.wantsMutual +
    failureStats.ownerBias;
  const socialPct = total > 0 ? Math.round((failureStats.social / total) * 100) : 0;
  const rolePct = total > 0 ? Math.round((failureStats.roles / total) * 100) : 0;
  const roleSplitPct = total > 0 ? Math.round((failureStats.roleSplit / total) * 100) : 0;
  const wantsStrictPct = total > 0 ? Math.round((failureStats.wantsStrict / total) * 100) : 0;
  const wantsMutualPct = total > 0 ? Math.round((failureStats.wantsMutual / total) * 100) : 0;
  const biasPct = total > 0 ? Math.round((failureStats.ownerBias / total) * 100) : 0;

  const sortedPlayers = [...players].sort((a, b) => {
    const getPower = (player: Person) =>
      player.rating +
      getAttrValue(player.attributes?.pace, 'PHYSICAL') +
      getAttrValue(player.attributes?.control, 'TECHNICAL');
    return getPower(b) - getPower(a);
  });

  const t1: Person[] = [];
  const t2: Person[] = [];
  // Balanced distribution (1-2-2-1 snake)
  sortedPlayers.forEach((player, index) => {
    if (index % 4 === 0 || index % 4 === 3) t1.push(player);
    else t2.push(player);
  });

  return {
    team1: { players: t1, totalRating: calculateTeamStats(t1).rating },
    team2: { players: t2, totalRating: calculateTeamStats(t2).rating },
    socialSatisfactionPct: calculateSocialSatisfaction(t1, t2).percentage,
    explanation: `FALLBACK USED: staged constraints could not be met.
- Social Conflicts: ${socialPct}%
- Role Issues: ${rolePct}%
- DEF/ATT Split Rule: ${roleSplitPct}%
- Wants Strict Rule: ${wantsStrictPct}%
- Wants Mutual Rule: ${wantsMutualPct}%
- Owner Bias (Too strong): ${biasPct}%
Teams generated using Power Rating (Best Fit, ignoring constraints).`,
    isFallback: true,
  };
}

function calculateSocialSatisfaction(
  team1: Person[],
  team2: Person[],
): {
  wantsMet: number;
  wantsTotal: number;
  dislikesMet: number;
  dislikesTotal: number;
  met: number;
  total: number;
  percentage: number;
} {
    const allPlayers = [...team1, ...team2];
    const allIds = new Set(allPlayers.map(p => p.id));
    let totalWants = 0;
    let metWants = 0;
    let totalDislikes = 0;
    let metDislikes = 0;

    // Helper to check if two players are in the same team
    const inSameTeam = (id1: string, id2: string) => {
        const inT1 = team1.some(p => p.id === id1) && team1.some(p => p.id === id2);
        const inT2 = team2.some(p => p.id === id1) && team2.some(p => p.id === id2);
        return inT1 || inT2;
    };

    allPlayers.forEach(p => {
        p.wantsWith.forEach(targetId => {
            if (allIds.has(targetId)) {
                totalWants++;
                if (inSameTeam(p.id, targetId)) {
                    metWants++;
                }
            }
        });

        p.avoidsWith.forEach(targetId => {
            if (allIds.has(targetId)) {
                totalDislikes++;
                if (!inSameTeam(p.id, targetId)) {
                    metDislikes++;
                }
            }
        });
    });

    const total = totalWants + totalDislikes;
    const met = metWants + metDislikes;

    return {
        wantsMet: metWants,
        wantsTotal: totalWants,
        dislikesMet: metDislikes,
        dislikesTotal: totalDislikes,
        met,
        total,
        percentage: total === 0 ? 100 : Math.round((met / total) * 100),
    };
}


function getMetRelationshipDetails(team1: Person[], team2: Person[]): string {
    const allPlayers = [...team1, ...team2];
    const byId = new Map(allPlayers.map(player => [player.id, player]));
    const metLinks: string[] = [];
    const processed = new Set<string>();

    const inSameTeam = (id1: string, id2: string) => {
        const inT1 = team1.some(p => p.id === id1) && team1.some(p => p.id === id2);
        const inT2 = team2.some(p => p.id === id1) && team2.some(p => p.id === id2);
        return inT1 || inT2;
    };

    for (const source of allPlayers) {
        for (const targetId of source.wantsWith) {
            const target = byId.get(targetId);
            if (!target) continue;
            if (!inSameTeam(source.id, targetId)) continue;

            const isMutual = target.wantsWith.includes(source.id);
            if (isMutual) {
                const pairKey = [source.id, targetId].sort().join('|');
                if (processed.has(pairKey)) continue;
                processed.add(pairKey);
                metLinks.push(`${source.nickname} <-> ${target.nickname}`);
            } else {
                const pairKey = `${source.id}->${targetId}`;
                if (processed.has(pairKey)) continue;
                processed.add(pairKey);
                metLinks.push(`${source.nickname} -> ${target.nickname}`);
            }
        }
    }

    return metLinks.length > 0 ? metLinks.join(', ') : 'No met links';
}

function getMetDislikeDetails(team1: Person[], team2: Person[]): string {
    const allPlayers = [...team1, ...team2];
    const byId = new Map(allPlayers.map(player => [player.id, player]));
    const metDislikes: string[] = [];
    const processed = new Set<string>();

    const inSameTeam = (id1: string, id2: string) => {
        const inT1 = team1.some(p => p.id === id1) && team1.some(p => p.id === id2);
        const inT2 = team2.some(p => p.id === id1) && team2.some(p => p.id === id2);
        return inT1 || inT2;
    };

    for (const source of allPlayers) {
        for (const targetId of source.avoidsWith) {
            const target = byId.get(targetId);
            if (!target) continue;
            if (inSameTeam(source.id, targetId)) continue;

            const isMutual = target.avoidsWith.includes(source.id);
            if (isMutual) {
                const pairKey = [source.id, targetId].sort().join('|');
                if (processed.has(pairKey)) continue;
                processed.add(pairKey);
                metDislikes.push(`${source.nickname} <!> ${target.nickname}`);
            } else {
                const pairKey = `${source.id}->${targetId}`;
                if (processed.has(pairKey)) continue;
                processed.add(pairKey);
                metDislikes.push(`${source.nickname} !> ${target.nickname}`);
            }
        }
    }

    return metDislikes.length > 0 ? metDislikes.join(', ') : 'No met dislikes';
}
