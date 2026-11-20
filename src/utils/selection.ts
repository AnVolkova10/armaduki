/**
 * Moves the selected players to the front. Inside each group the original order is kept
 * (Array.prototype.sort is stable), so the list only splits in two.
 */
export function sortSelectedFirst<T extends { id: string }>(
    people: readonly T[],
    selectedIds: ReadonlySet<string>,
): T[] {
    return [...people].sort((a, b) => Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)));
}
