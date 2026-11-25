// Ids for the teams and groups made from the player form (Sprint 6). The sheet keeps them as
// text, and players point at them, so they stay short, plain and stable: "Segurola 20hs Jueves"
// becomes "segurola-20hs-jueves". Nobody sees them in the app.

const MAX_ID_LENGTH = 40;

export function slugify(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, MAX_ID_LENGTH)
        .replace(/^-+|-+$/g, '');
}

/** The name's slug, or `fallback` when it has no letters or digits; -2, -3… when already taken. */
export function uniqueCatalogId(name: string, taken: Iterable<string>, fallback: string): string {
    const base = slugify(name) || fallback;
    const used = new Set(taken);
    if (!used.has(base)) return base;
    for (let n = 2; ; n++) {
        const id = `${base}-${n}`;
        if (!used.has(id)) return id;
    }
}

/** The same name, ignoring case, accents and spaces around: "segurola " is "Segurola". */
export function sameCatalogName(a: string, b: string): boolean {
    const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    return plain(a) === plain(b);
}
