import type { Person, GeneratedTeams, AttributeLevel, Attributes } from '../types';

// Points configuration
const POINTS = {
  HIGH: 1,
  MID: 0,
  LOW: -1,
  DOUBLE_WANT: 20,
  SINGLE_WANT: 10,
  RATING_BALANCE_BASE: 100,
  BIAS_PENALTY: 500, // Massive penalty to force ID 10 to weaker team
};

// Hard Constraints
const MAX_GK = 1;
const MAX_DEF = 2;
const MAX_ATT = 2;
const REQUIRED_GK_WILLINGNESS = 3; // If no main GK
const OWNER_ID = '10';

interface TeamStats {
  rating: number;
  attributes: Record<keyof Attributes, number>;
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

function validateTeam(players: Person[]): { valid: boolean; reason?: 'social' | 'roles' | 'emergencyGK' } {
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

function calculateRelationshipScore(team1: Person[], team2: Person[]): number {
  let score = 0;
  
  const calculateTeamScore = (players: Person[]) => {
    let teamScore = 0;
    const processedPairs = new Set<string>();

    for (const p1 of players) {
      for (const p2 of players) {
        if (p1.id === p2.id) continue;
        
        // Ensure pair is processed once
        const pairKey = [p1.id, p2.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const p1WantsP2 = p1.wantsWith.includes(p2.id);
        const p2WantsP1 = p2.wantsWith.includes(p1.id);

        if (p1WantsP2 && p2WantsP1) {
          teamScore += POINTS.DOUBLE_WANT;
        } else if (p1WantsP2 || p2WantsP1) {
          teamScore += POINTS.SINGLE_WANT;
        }
      }
    }
    return teamScore;
  };

  score += calculateTeamScore(team1);
  score += calculateTeamScore(team2);

  return score;
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

export function generateTeams(players: Person[]): GeneratedTeams | null {
  if (players.length !== 10) return null;

  const allCombinations = getCombinations(players, 5);
  let bestResult: GeneratedTeams | null = null;
  let bestScore = -Infinity;
  
  const failureStats = { social: 0, roles: 0, emergencyGK: 0, ownerBias: 0 };

  for (const team1Players of allCombinations) {
    const team1Ids = new Set(team1Players.map(p => p.id));
    const team2Players = players.filter(p => !team1Ids.has(p.id));

    // 1. Hard Constraints
    const v1 = validateTeam(team1Players);
    const v2 = validateTeam(team2Players);

    if (!v1.valid || !v2.valid) {
        if (v1.reason) failureStats[v1.reason]++;
        if (v2.reason) failureStats[v2.reason]++;
        continue;
    }

    // 2. Stats Calculation (Now Weighted)
    const stats1 = calculateTeamStats(team1Players);
    const stats2 = calculateTeamStats(team2Players);

    // 3. Scoring
    let score = 0;
    
    // Rating Balance (Base) - Max 100
    // Penalize difference in total rating.
    const ratingDiff = Math.abs(stats1.rating - stats2.rating);
    score += (POINTS.RATING_BALANCE_BASE - ratingDiff * 10);

    // Attribute Balance (Sum of all weighted diffs)
    let totalAttrDiff = 0;
    (Object.keys(stats1.attributes) as (keyof Attributes)[]).forEach(key => {
      const diff = Math.abs(stats1.attributes[key] - stats2.attributes[key]);
      totalAttrDiff += diff;
    });

    score -= (totalAttrDiff * 5); // Penalize total attribute imbalance

    // Critical Balancing: Pace & Stamina (Physical)
    // We double down on physical stats because they are critical
    const paceDiff = Math.abs(stats1.attributes.pace - stats2.attributes.pace);
    const staminaDiff = Math.abs(stats1.attributes.stamina - stats2.attributes.stamina);
    
    score -= (paceDiff * 10); 
    score -= (staminaDiff * 8);

    // Defense Balance
    const defDiff = Math.abs(stats1.attributes.defense - stats2.attributes.defense);
    score -= (defDiff * 5);

    // Social Score
    const socialScore = calculateRelationshipScore(team1Players, team2Players);
    score += socialScore;

  /* OWNER BIAS: STRICT HARD CONSTRAINT */
    // If Owner is in the STRONGER team (rating >), this combination is INVALID.
    // We want Owner to always be in the "Underdog" team (or equal).
    const owner = players.find(p => p.id === OWNER_ID);
    if (owner && ratingDiff > 0) {
      const ownerInTeam1 = team1Ids.has(OWNER_ID);
      const team1IsStronger = stats1.rating > stats2.rating;
      
      if ((ownerInTeam1 && team1IsStronger) || (!ownerInTeam1 && !team1IsStronger)) {
         failureStats.ownerBias++;
         continue; 
      }
    }

    if (score > bestScore) {
      bestScore = score;
      
      const socialDetails1 = getRelationshipDetails(team1Players);
      const socialDetails2 = getRelationshipDetails(team2Players);
      const socialSat = calculateSocialSatisfaction(team1Players, team2Players);
      const socialMetLinks = getMetRelationshipDetails(team1Players, team2Players);
      const socialMetDislikes = getMetDislikeDetails(team1Players, team2Players);
      
      bestResult = {
        team1: { players: team1Players, totalRating: stats1.rating },
        team2: { players: team2Players, totalRating: stats2.rating },
        socialSatisfactionPct: socialSat.percentage,
        explanation: `Analysis (Score: ${Math.round(score)})

[Balance]
- Rating: T1 (${stats1.rating}) vs T2 (${stats2.rating}) -> Diff: ${ratingDiff}
- Physical (Pace/Stamina): T1 (${(stats1.attributes.pace + stats1.attributes.stamina).toFixed(1)}) vs T2 (${(stats2.attributes.pace + stats2.attributes.stamina).toFixed(1)}) -> Diff: ${(paceDiff + staminaDiff).toFixed(1)}
- Technical (Ctrl/Pass/Sht): T1 (${(stats1.attributes.control + stats1.attributes.passing + stats1.attributes.shooting).toFixed(1)}) vs T2 (${(stats2.attributes.control + stats2.attributes.passing + stats2.attributes.shooting).toFixed(1)}) -> Diff: ${Math.abs((stats1.attributes.control + stats1.attributes.passing + stats1.attributes.shooting) - (stats2.attributes.control + stats2.attributes.passing + stats2.attributes.shooting)).toFixed(1)}
- Defense: T1 (${stats1.attributes.defense.toFixed(1)}) vs T2 (${stats2.attributes.defense.toFixed(1)}) -> Diff: ${defDiff.toFixed(1)}
- Mental (Vis/Grit): T1 (${(stats1.attributes.vision + stats1.attributes.grit).toFixed(1)}) vs T2 (${(stats2.attributes.vision + stats2.attributes.grit).toFixed(1)}) -> Diff: ${Math.abs((stats1.attributes.vision + stats1.attributes.grit) - (stats2.attributes.vision + stats2.attributes.grit)).toFixed(1)}

[Social]
- Social Satisfaction: ${socialSat.percentage}% (Wants: ${socialSat.wantsMet}/${socialSat.wantsTotal}, Dislikes: ${socialSat.dislikesMet}/${socialSat.dislikesTotal})
- Met wants links: ${socialMetLinks}
- Met dislikes links: ${socialMetDislikes}
- T1 links: ${socialDetails1}
- T2 links: ${socialDetails2}`,
        isFallback: false
      };
    }
  }

  // 5. Fallback Logic
  if (!bestResult) {
     // Analyze failures
     const total = failureStats.social + failureStats.roles + failureStats.emergencyGK + failureStats.ownerBias;
     const socialPct = total > 0 ? Math.round((failureStats.social / total) * 100) : 0;
     const rolePct = total > 0 ? Math.round((failureStats.roles / total) * 100) : 0;
     const biasPct = total > 0 ? Math.round((failureStats.ownerBias / total) * 100) : 0;
     
    const sortedPlayers = [...players].sort((a, b) => {
        const getP = (p: Person) => 
          p.rating + 
          getAttrValue(p.attributes?.pace, 'PHYSICAL') + 
          getAttrValue(p.attributes?.control, 'TECHNICAL');
        return getP(b) - getP(a);
    });

    const t1: Person[] = [];
    const t2: Person[] = [];
    // Balanced distribution (1-2-2-1 snake)
    sortedPlayers.forEach((p, i) => {
      if (i % 4 === 0 || i % 4 === 3) t1.push(p);
      else t2.push(p);
    });

    bestResult = {
      team1: { players: t1, totalRating: calculateTeamStats(t1).rating },
      team2: { players: t2, totalRating: calculateTeamStats(t2).rating },
      socialSatisfactionPct: calculateSocialSatisfaction(t1, t2).percentage,
      explanation: `FALLBACK USED: Strict constraints could not be met.
- Social Conflicts: ${socialPct}%
- Role Issues: ${rolePct}%
- Owner Bias (Too strong): ${biasPct}%
Teams generated using Power Rating (Best Fit, ignoring constraints).`,
      isFallback: true
    };
  }

  return bestResult;
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

function getRelationshipDetails(players: Person[]): string {
    let double = 0;
    let single = 0;
    const processedPairs = new Set<string>();

    for (const p1 of players) {
      for (const p2 of players) {
        if (p1.id === p2.id) continue;
        const pairKey = [p1.id, p2.id].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const p1WantsP2 = p1.wantsWith.includes(p2.id);
        const p2WantsP1 = p2.wantsWith.includes(p1.id);

        if (p1WantsP2 && p2WantsP1) double++;
        else if (p1WantsP2 || p2WantsP1) single++;
      }
    }
    if (double === 0 && single === 0) return "No links";
    const parts = [];
    if (double > 0) parts.push(`${double} Mutual`);
    if (single > 0) parts.push(`${single} Single`);
    return parts.join(', ');
} 


