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

function isValidTeam(players: Person[]): boolean {
  // 1. Social Hard Constraint
  if (hasSocialConflict(players)) return false;

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

  if (gkCount > MAX_GK) return false;
  if (defCount > MAX_DEF) return false;
  if (attCount > MAX_ATT) return false;

  // Emergency GK Rule
  if (gkCount === 0 && gkWillingCount < REQUIRED_GK_WILLINGNESS) return false;

  return true;
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

  for (const team1Players of allCombinations) {
    const team1Ids = new Set(team1Players.map(p => p.id));
    const team2Players = players.filter(p => !team1Ids.has(p.id));

    // 1. Hard Constraints
    if (!isValidTeam(team1Players) || !isValidTeam(team2Players)) {
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

    // 4. ID 10 Bias (The Owner wants to be underdog)
    // If Owner is in the STRONGER team (by rating), penalize.
    const owner = players.find(p => p.id === OWNER_ID);
    if (owner) {
      const ownerInTeam1 = team1Ids.has(OWNER_ID);
      const team1IsStronger = stats1.rating > stats2.rating;
      // If Owner is in T1 and T1 is stronger -> BAD
      // If Owner is in T2 and T2 is stronger (T1 is weaker) -> BAD
      if ((ownerInTeam1 && team1IsStronger) || (!ownerInTeam1 && !team1IsStronger)) {
         // Only apply significant penalty if the difference is real (> 1 point)
         if (ratingDiff > 1) {
             score -= POINTS.BIAS_PENALTY;
         }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = {
        team1: { players: team1Players, totalRating: stats1.rating },
        team2: { players: team2Players, totalRating: stats2.rating },
        relationshipScore: socialScore
      };
    }
  }

  // 5. Fallback Logic (Pan y Queso powered by Weighted Power Rating)
  // If no valid team found due to strict constraints.
  if (!bestResult) {
     // Sort by a composite score using our Weights
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
      relationshipScore: calculateRelationshipScore(t1, t2)
    };
  }

  return bestResult;
}
