// How a player's fields are read from the sheet, wherever they come from: the Players tab, or a
// match's picture of how a player was that day (Sprint 9). Plain TypeScript, so `npm test` loads it.
import type { AttributeLevel, Attributes, GKWillingness, Role } from '../types/index.ts';

const DEFAULT_ROLE: Role = 'FLEX';
const DEFAULT_RATING = 5;
const DEFAULT_GK_WILLINGNESS: GKWillingness = 'no';

function text(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return String(value).trim();
}

const ATTRIBUTE_KEYS: (keyof Attributes)[] = [
  'shooting',
  'control',
  'passing',
  'defense',
  'pace',
  'vision',
  'grit',
  'stamina',
];

export const DEFAULT_ATTRIBUTES: Attributes = {
  shooting: 'mid',
  control: 'mid',
  passing: 'mid',
  defense: 'mid',
  pace: 'mid',
  vision: 'mid',
  grit: 'mid',
  stamina: 'mid',
};

function isAttributeLevel(value: unknown): value is AttributeLevel {
  return value === 'high' || value === 'mid' || value === 'low';
}

/** The eight attributes from a JSON cell (or an object); anything missing or unknown is mid. */
export function parseAttributes(value: unknown): Attributes {
  if (value === undefined || value === null || value === '') {
    return { ...DEFAULT_ATTRIBUTES };
  }

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ...DEFAULT_ATTRIBUTES };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_ATTRIBUTES };
  }

  const raw = parsed as Partial<Record<keyof Attributes, unknown>>;
  const normalized: Attributes = { ...DEFAULT_ATTRIBUTES };

  for (const key of ATTRIBUTE_KEYS) {
    const maybeLevel = raw[key];
    if (isAttributeLevel(maybeLevel)) {
      normalized[key] = maybeLevel;
    }
  }

  return normalized;
}

export function validateRole(value: unknown): Role {
  const validRoles: Role[] = ['GK', 'FLEX', 'DEF', 'MID', 'ATT'];
  const normalized = text(value).toUpperCase() as Role;
  return validRoles.includes(normalized) ? normalized : DEFAULT_ROLE;
}

/** GK, DEF, MID or ATT, never the main one (rows edited by hand can say anything). */
export function validateSecondaryRole(value: unknown, mainRole: Role): Role | undefined {
  const normalized = text(value).toUpperCase();
  const secondary: Role[] = ['GK', 'DEF', 'MID', 'ATT'];
  return secondary.includes(normalized as Role) && normalized !== mainRole ? (normalized as Role) : undefined;
}

export function validateGKWillingness(value: unknown): GKWillingness {
  const valid: GKWillingness[] = ['good', 'no', 'low'];
  const normalized = text(value).toLowerCase();
  if (normalized === 'yes') return 'good';
  return valid.includes(normalized as GKWillingness) ? (normalized as GKWillingness) : DEFAULT_GK_WILLINGNESS;
}

/** A whole number from 1 to 10; 5 when it is not a number. */
export function validateRating(value: unknown): number {
  const num = typeof value === 'number' ? value : parseInt(text(value) || String(DEFAULT_RATING), 10);
  if (!Number.isFinite(num)) return DEFAULT_RATING;
  return Math.max(1, Math.min(10, Math.trunc(num)));
}
