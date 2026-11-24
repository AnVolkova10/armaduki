// The app's language: English by default, Rioplatense Spanish with the switch. Each device
// remembers its choice. Nothing here guesses from the browser's language.
// Plain TypeScript (.ts imports, no JSX), so the store can use it under `npm test` in Node.
import { create } from 'zustand';
import { readLanguage, saveLanguage } from '../services/deviceStorage.ts';
import { en, type Dict } from './en.ts';
import { es } from './es.ts';

export type Lang = 'en' | 'es';
export type { Dict };

const DICTS: Record<Lang, Dict> = { en, es };
const HTML_LANG: Record<Lang, string> = { en: 'en', es: 'es-AR' };

function toLang(value: string): Lang {
    return value === 'es' ? 'es' : 'en';
}

function tellTheDocument(lang: Lang): void {
    if (typeof document !== 'undefined') document.documentElement.lang = HTML_LANG[lang];
}

interface LangState {
    lang: Lang;
    setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => {
    const lang = toLang(readLanguage());
    tellTheDocument(lang);

    return {
        lang,
        setLang: (next) => {
            saveLanguage(next);
            tellTheDocument(next);
            set({ lang: next });
        },
    };
});

/** The texts in the current language, for components. */
export function useT(): Dict {
    return DICTS[useLangStore((state) => state.lang)];
}

/** The texts in the current language, outside React (the store's messages). */
export function tr(): Dict {
    return DICTS[useLangStore.getState().lang];
}
