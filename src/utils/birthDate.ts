// Birth dates as Ángela knows them (Sprint 6): the year alone, the year and the month, or the
// whole date. Stored as yyyy, yyyy-MM or yyyy-MM-dd.

export interface BirthDateParts {
    year: string;
    month: string;
    day: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

function isRealDate(year: number, month: number, day: number): boolean {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * yyyy, yyyy-MM or yyyy-MM-dd from whatever the sheet holds: text (a stray leading apostrophe
 * included), a year as a number, or an ISO date. Anything else is no date.
 */
export function normalizeBirthDate(value: unknown): string | undefined {
    if (typeof value === 'number') value = String(value);
    if (typeof value !== 'string') return undefined;

    const text = value.trim().replace(/^'/, '');
    const match = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2})(?:T.*)?)?)?$/.exec(text);
    if (!match) return undefined;

    const year = Number(match[1]);
    if (year < 1900 || year > new Date().getFullYear()) return undefined;
    if (match[2] === undefined) return String(year);

    const month = Number(match[2]);
    if (month < 1 || month > 12) return undefined;
    if (match[3] === undefined) return `${year}-${pad(month)}`;

    const day = Number(match[3]);
    return isRealDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : undefined;
}

export function birthDateParts(birthDate: string | undefined): BirthDateParts {
    const [year = '', month = '', day = ''] = (birthDate ?? '').split('-');
    return { year, month: month.replace(/^0/, ''), day: day.replace(/^0/, '') };
}

export type BirthDateInput = { kind: 'empty' } | { kind: 'date'; value: string } | { kind: 'invalid' };

/** What the three form fields add up to. The year is needed for the rest to count; a day needs its month. */
export function readBirthDateInput({ year, month, day }: BirthDateParts): BirthDateInput {
    const [y, m, d] = [year.trim(), month.trim(), day.trim()];
    if (!y && !m && !d) return { kind: 'empty' };
    if (!/^\d{4}$/.test(y) || (m && !/^\d{1,2}$/.test(m)) || (d && !/^\d{1,2}$/.test(d)) || (d && !m)) {
        return { kind: 'invalid' };
    }
    const value = normalizeBirthDate([y, m, d].filter(Boolean).join('-'));
    return value ? { kind: 'date', value } : { kind: 'invalid' };
}

export interface Age {
    years: number;
    /** False when the day (or the month) is unknown: then the age is a close guess. */
    exact: boolean;
}

/** Age today. Without the day it guesses the middle of the month; without the month, the middle of the year. */
export function ageOn(birthDate: string | undefined, today: Date): Age | null {
    const normalized = normalizeBirthDate(birthDate);
    if (!normalized) return null;

    const parts = normalized.split('-').map(Number);
    const year = parts[0];
    const month: number | undefined = parts[1];
    const day: number | undefined = parts[2];
    const exact = day !== undefined;
    const birthMonth = month ?? 7;
    const birthDay = day ?? (month === undefined ? 1 : 15);
    const beforeBirthday =
        today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay);
    const years = today.getFullYear() - year - (beforeBirthday ? 1 : 0);
    return years >= 0 ? { years, exact } : null;
}
