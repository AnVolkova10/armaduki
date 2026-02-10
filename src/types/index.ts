export type Role = 'GK' | 'FLEX' | 'DEF' | 'MID' | 'ATT';
export type GKWillingness = 'yes' | 'no' | 'low';

export type AttributeLevel = 'high' | 'mid' | 'low';

export interface Attributes {
  shooting: AttributeLevel;
  control: AttributeLevel;
  passing: AttributeLevel;
  defense: AttributeLevel;
  pace: AttributeLevel;
  vision: AttributeLevel;
  grit: AttributeLevel;
  stamina: AttributeLevel;
}

export interface Person {
  id: string;
  name: string;
  nickname: string;
  role: Role;
  rating: number; // Manual 1-10
  avatar?: string;
  gkWillingness: GKWillingness;
  wantsWith: string[];
  avoidsWith: string[];
  attributes?: Attributes;
}

export interface Team {
  players: Person[];
  totalRating: number;
}

export type GenerationStage = 'STRICT' | 'RELAXED_UNILATERAL' | 'RELAXED_MUTUAL' | 'FALLBACK';

export interface GeneratedTeamOption {
  team1: Team;
  team2: Team;
  socialSatisfactionPct: number;
  explanation?: string;
  isFallback?: boolean;
  score: number;
  stage: GenerationStage;
}

export interface TeamOptionComparison {
  reason: string;
  scoreDelta: number;
  ratingDiffDelta: number;
  socialDelta: number;
  movedToTeam1: string[];
  movedToTeam2: string[];
}

export interface GeneratedTeams {
  primary: GeneratedTeamOption;
  secondary: GeneratedTeamOption | null;
  secondaryReason: string | null;
  comparison: TeamOptionComparison | null;
}
