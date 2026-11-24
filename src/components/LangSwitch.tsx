import { useLangStore, useT } from '../i18n';
import './LangSwitch.css';

/** EN on one side, ES on the other, and the logo ball rolls to the chosen one. */
export function LangSwitch({ className = '' }: { className?: string }) {
    const lang = useLangStore((state) => state.lang);
    const setLang = useLangStore((state) => state.setLang);
    const t = useT();
    const spanish = lang === 'es';

    return (
        <button
            type="button"
            className={`lang-switch ${className}`}
            data-lang={lang}
            onClick={() => setLang(spanish ? 'en' : 'es')}
            aria-label={`${t.lang.label}: ${spanish ? t.lang.spanish : t.lang.english}`}
        >
            <span className="lang-switch-code" data-active={!spanish || undefined}>EN</span>
            <span className="lang-switch-track">
                <img className="lang-switch-ball" src="/ball.svg" alt="" aria-hidden="true" />
            </span>
            <span className="lang-switch-code" data-active={spanish || undefined}>ES</span>
        </button>
    );
}
