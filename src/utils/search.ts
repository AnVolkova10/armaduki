export function normalizeSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function matchesWordPrefix(value: string, normalizedQuery: string): boolean {
    const normalizedValue = normalizeSearch(value || '');
    if (!normalizedValue || !normalizedQuery) return false;

    // Preserve current behavior for multi-word prefixes like "la r".
    if (normalizedValue.startsWith(normalizedQuery)) return true;

    // Match word prefixes so "bordigoni" matches "Camila Bordigoni"
    // and "rana" matches "La Rana".
    const words = normalizedValue.split(/[^a-z0-9]+/).filter(Boolean);
    return words.some((word) => word.startsWith(normalizedQuery));
}
