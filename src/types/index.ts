export type Role = 'GK' | 'DEF' | 'MID' | 'ATT' | 'FLEX';
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

export interface GeneratedTeams {
  team1: Team;
  team2: Team;
  socialSatisfactionPct: number;
  explanation?: string;
  isFallback?: boolean;
}
