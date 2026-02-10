import type { Attributes, AttributeLevel } from '../types';

const BASE_SUGGESTED_RATING = 5.51;

const ATTRIBUTE_STEPS: Record<keyof Attributes, number> = {
  shooting: 0.31,
  control: 0.37,
  passing: 0.34,
  defense: 0.28,
  pace: 0.26,
  vision: 0.4,
  grit: 0.34,
  stamina: 0.26,
};

const ATTRIBUTE_LEVEL_SIGN: Record<AttributeLevel, number> = {
  low: -1,
  mid: 0,
  high: 1,
};

function clampRating(value: number): number {
  return Math.max(1, Math.min(10, value));
}

function resolveAttributeLevel(level: AttributeLevel | undefined): AttributeLevel {
  return level ?? 'mid';
}

export function getSuggestedRatingFloat(attributes?: Attributes): number {
  let suggested = BASE_SUGGESTED_RATING;

  for (const key of Object.keys(ATTRIBUTE_STEPS) as (keyof Attributes)[]) {
    const level = resolveAttributeLevel(attributes?.[key]);
    suggested += ATTRIBUTE_STEPS[key] * ATTRIBUTE_LEVEL_SIGN[level];
  }

  return clampRating(suggested);
}

export function getSuggestedRating(attributes?: Attributes): number {
  return clampRating(Math.round(getSuggestedRatingFloat(attributes)));
}
