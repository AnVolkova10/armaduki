export type Role = 'GK' | 'DEF' | 'MID' | 'ATT' | 'FLEX';
export type GKWillingness = 'yes' | 'no' | 'low';

export interface Person {
  id: string;
  name: string; // Real name
  nickname: string; // Display name
  role: Role;
  rating: number; // 1-10
  avatar: string; // base64 or URL
  gkWillingness: GKWillingness;
  wantsWith: string[]; // IDs of people they want to play with
  avoidsWith: string[]; // IDs of people they want to avoid
  stats?: {
    defense: number;
    attack: number;
    physical: number;
    technique: number;
  };
}

export interface Team {
  players: Person[];
  totalRating: number;
}

export interface GeneratedTeams {
  team1: Team;
  team2: Team;
  relationshipScore: number;
}
