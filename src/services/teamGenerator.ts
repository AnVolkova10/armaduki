import type { Person, GeneratedTeams, AttributeLevel, Attributes } from '../types';

interface TeamValidation {
  gkCount: number;
  defCount: number;
  attCount: number;
  gkWillingCount: number;
}

function countRoles(players: Person[]): TeamValidation {
  let gkCount = 0;
  let defCount = 0;
  let attCount = 0;
  let gkWillingCount = 0;

  for (const player of players) {
    if (player.role === 'GK') gkCount++;
    if (player.role === 'DEF') defCount++;
    if (player.role === 'ATT') attCount++;
    if (player.gkWillingness === 'yes' || player.gkWillingness === 'low') {
      gkWillingCount++;
    }
  }

  return { gkCount, defCount, attCount, gkWillingCount };
}

function isValidTeam(players: Person[]): boolean {
  const counts = countRoles(players);
  
  // Max 1 GK per team
  if (counts.gkCount > 1) return false;
  // Max 2 DEF per team
  if (counts.defCount > 2) return false;
  // Max 2 ATT per team
  if (counts.attCount > 2) return false;
  // At least 3 players willing to be GK (if no dedicated GK)
  if (counts.gkCount === 0 && counts.gkWillingCount < 3) return false;

  return true;
}

function calculateTotalRating(players: Person[]): number {
  return players.reduce((sum, p) => sum + p.rating, 0);
}

function getAttrValue(level?: AttributeLevel): number {
  if (level === 'high') return 1;
  if (level === 'mid') return 0.5;
  return 0;
}

function calculateRelationshipScore(team1: Person[], team2: Person[]): number {
  let score = 0;
  const team1Ids = new Set(team1.map(p => p.id));
  const team2Ids = new Set(team2.map(p => p.id));

  // Check team 1 relationships
  for (const player of team1) {
    for (const wantId of player.wantsWith) {
      if (team1Ids.has(wantId)) score += 10; // bonus for being with wanted player
    }
    for (const avoidId of player.avoidsWith) {
      if (team1Ids.has(avoidId)) score -= 20; // penalty for being with avoided player
    }
  }

  // Check team 2 relationships
  for (const player of team2) {
    for (const wantId of player.wantsWith) {
      if (team2Ids.has(wantId)) score += 10;
    }
    for (const avoidId of player.avoidsWith) {
      if (team2Ids.has(avoidId)) score -= 20;
    }
  }

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
  if (players.length !== 10) {
    return null;
  }

  const allCombinations = getCombinations(players, 5);
  
  let bestResult: GeneratedTeams | null = null;
  let bestScore = -Infinity;

  for (const team1Players of allCombinations) {
    const team1Ids = new Set(team1Players.map(p => p.id));
    const team2Players = players.filter(p => !team1Ids.has(p.id));

    // Validate both teams
    if (!isValidTeam(team1Players) || !isValidTeam(team2Players)) {
      continue;
    }

    const team1Rating = calculateTotalRating(team1Players);
    const team2Rating = calculateTotalRating(team2Players);
    const ratingDiff = Math.abs(team1Rating - team2Rating);
    const relationshipScore = calculateRelationshipScore(team1Players, team2Players);

    // Calculate Attribute Imbalances
    const getAttrTotal = (team: Person[], key: keyof Attributes) => 
      team.reduce((sum, p) => sum + getAttrValue(p.attributes?.[key]), 0);

    // Critical Balancing: Pace & Stamina & Defense
    // We don't want one team to be much faster or have much better cardio
    const t1Pace = getAttrTotal(team1Players, 'pace');
    const t2Pace = getAttrTotal(team2Players, 'pace');
    const paceDiff = Math.abs(t1Pace - t2Pace);

    const t1Stamina = getAttrTotal(team1Players, 'stamina');
    const t2Stamina = getAttrTotal(team2Players, 'stamina');
    const staminaDiff = Math.abs(t1Stamina - t2Stamina);

    const t1Def = getAttrTotal(team1Players, 'defense');
    const t2Def = getAttrTotal(team2Players, 'defense');
    const defDiff = Math.abs(t1Def - t2Def);

    // Scoring Weights
    let score = 0;
    
    // 1. Rating Balance (Base) - Max 100
    // Penalize difference in total rating.
    score += (100 - ratingDiff * 10); 

    // 2. Physical/Pace Balance (User Critical)
    // High penalty for speed mismatch. 
    score -= (paceDiff * 15); 
    score -= (staminaDiff * 10);

    // 3. Defense Balance
    // Avoid one team having no defenders
    score -= (defDiff * 8);

    // 4. Relationships
    score += relationshipScore;

    if (score > bestScore) {
      bestScore = score;
      bestResult = {
        team1: { players: team1Players, totalRating: team1Rating },
        team2: { players: team2Players, totalRating: team2Rating },
        relationshipScore,
      };
    }
  }

  // Fallback: If no valid team found (e.g. strict role constraints fail), 
  // try to find the "least bad" distribution based on Rating + Pace
  if (!bestResult) {
     // Sort by a composite score
    const sortedPlayers = [...players].sort((a, b) => {
        const scoreA = (a.rating * 0.6) + (getAttrValue(a.attributes?.pace) * 4);
        const scoreB = (b.rating * 0.6) + (getAttrValue(b.attributes?.pace) * 4);
        return scoreB - scoreA;
    });

    const team1Players: Person[] = [];
    const team2Players: Person[] = [];
    let team1Score = 0;
    let team2Score = 0;

    for (const player of sortedPlayers) {
        const pScore = player.rating + (getAttrValue(player.attributes?.pace) * 5);
        if (team1Players.length < 5 && (team1Score <= team2Score || team2Players.length >= 5)) {
            team1Players.push(player);
            team1Score += pScore;
        } else {
            team2Players.push(player);
            team2Score += pScore;
        }
    }

    bestResult = {
      team1: { players: team1Players, totalRating: calculateTotalRating(team1Players) },
      team2: { players: team2Players, totalRating: calculateTotalRating(team2Players) },
      relationshipScore: calculateRelationshipScore(team1Players, team2Players),
    };
  }

  return bestResult;
}
