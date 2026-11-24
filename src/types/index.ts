export type Role = 'GK' | 'FLEX' | 'DEF' | 'MID' | 'ATT';
export type GKWillingness = 'good' | 'no' | 'low';

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
  shirtNumber?: string;
  primaryTeam?: string;
  teams: string[];
  groups: string[];
  availability: string[];
  birthYear?: string;
  secondaryRole?: Role;
  active?: boolean;
  notes?: string;
}

export interface TeamCatalog {
  teamId: string;
  name: string;
  color1: string;
  color2: string;
  crest: string;
}

export interface Team {
  players: Person[];
  totalRating: number;
}

export type GenerationStage = 'STRICT' | 'RELAXED_UNILATERAL' | 'RELAXED_MUTUAL' | 'FALLBACK';

// ---------------------------------------------------------------------------
// The analysis of a split as data. The app writes the sentences from it, in the chosen language.
// ---------------------------------------------------------------------------

export type TeamLabel = 'T1' | 'T2';
export type Favors = TeamLabel | 'Even';
export type BalanceLabel = 'highlyBalanced' | 'balanced' | 'playable' | 'imbalanced';

/** A wants or avoids link between two selected players, by nickname. */
export interface LinkRef {
  from: string;
  to: string;
  mutual: boolean;
}

/** The hard rules, in the order they give way when no split meets them all. */
export type HardRule = 'avoids' | 'wants' | 'ownerBias' | 'roleSpread' | 'roleLimits';

/** What exactly broke inside a hard rule. */
export type RuleIssue =
  | { kind: 'avoidTogether'; link: LinkRef }
  | { kind: 'wantSplit'; link: LinkRef }
  | { kind: 'ownerOnStronger'; nickname: string }
  | { kind: 'defSplit'; team1: number; team2: number }
  | { kind: 'attSplit'; team1: number; team2: number }
  | { kind: 'tooManyGK'; team: TeamLabel; count: number; max: number }
  | { kind: 'tooManyDEF'; team: TeamLabel; count: number; max: number }
  | { kind: 'fewKeepers'; team: TeamLabel; capable: number; needed: number };

export interface RuleStatus {
  rule: HardRule;
  kept: boolean;
  issues: RuleIssue[];
}

/** Why no split can meet every rule, when it can be told before trying them. */
export type FallbackCause =
  | { kind: 'tooManyGK'; count: number; maxPerTeam: number }
  | { kind: 'tooManyDEF'; count: number; maxPerTeam: number }
  | { kind: 'fewKeepers'; gkCount: number; capable: number; neededPerTeam: number }
  | { kind: 'wantsChain'; nicknames: string[]; teamSize: number }
  | { kind: 'avoidInChain'; from: string; to: string };

export interface FallbackReport {
  /** Empty when there is no single cause: the rules only conflict when combined. */
  causes: FallbackCause[];
  /** Every rule that applies to this selection, in relax order. */
  rules: RuleStatus[];
}

export interface TeamKeeperReport {
  gkCount: number;
  good: number;
  low: number;
  no: number;
  capable: number;
  /** Emergency keepers still missing; 0 when the team has a GK. */
  missing: number;
  adjustment: number;
}

export interface AttributeComparison {
  key: keyof Attributes;
  team1: number;
  team2: number;
  diff: number;
  favors: Favors;
}

export interface AnalysisReport {
  score: number;
  balanceLabel: BalanceLabel;
  /** The score, term by term. A preference that does not apply is null. */
  formula: {
    base: number;
    ratingDiff: number;
    ratingPenalty: number;
    attrDiff: number;
    attrPenalty: number;
    paceDiff: number;
    pacePenalty: number;
    staminaDiff: number;
    staminaPenalty: number;
    defenseDiff: number;
    defensePenalty: number;
    gkPref: number | null;
    attPref: number;
    wantsPref: number | null;
    total: number;
  };
  rating: { team1: number; team2: number; diff: number; favors: Favors };
  attributes: AttributeComparison[];
  keepers: {
    neededWithoutGK: number;
    team1: TeamKeeperReport;
    team2: TeamKeeperReport;
    pass: boolean;
  };
  att: {
    total: number;
    team1: number;
    team2: number;
    spreadKept: boolean;
    overloaded: Favors;
    overloadedDef: number | null;
    adjustment: number;
  };
  social: {
    pct: number;
    wantsMet: number;
    wantsTotal: number;
    avoidsMet: number;
    avoidsTotal: number;
    metWants: LinkRef[];
    metAvoids: LinkRef[];
    /** One-way wants are a preference, not a rule. Null when the selection has none. */
    oneWay: { total: number; broken: number; penaltyEach: number; adjustment: number; brokenLinks: LinkRef[] } | null;
  };
  /** Only when no split met every rule. */
  fallback: FallbackReport | null;
}

export interface GeneratedTeamOption {
  team1: Team;
  team2: Team;
  socialSatisfactionPct: number;
  explanation?: string;
  /** The same analysis as data (the text above stays as it was). */
  report: AnalysisReport;
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
