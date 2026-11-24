import { useT } from '../i18n';
import './SheetLoader.css';

interface SheetLoaderProps {
    ariaLabel?: string;
}

export function SheetLoader({ ariaLabel }: SheetLoaderProps) {
    const t = useT();

    return (
        <div className="sheet-loader" role="status" aria-label={ariaLabel ?? t.notices.loadingSheet}>
            <div className="sheet-loader-ball" aria-hidden="true">
                <img className="sheet-loader-base" src="/ball.svg" alt="" />
                <img className="sheet-loader-fill" src="/ball.svg" alt="" />
            </div>
        </div>
    );
}
