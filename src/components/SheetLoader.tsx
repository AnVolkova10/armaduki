import './SheetLoader.css';

interface SheetLoaderProps {
    ariaLabel?: string;
}

export function SheetLoader({ ariaLabel = 'Loading from Google Sheets' }: SheetLoaderProps) {
    return (
        <div className="sheet-loader" role="status" aria-label={ariaLabel}>
            <div className="sheet-loader-ball" aria-hidden="true">
                <img className="sheet-loader-base" src="/ball.svg" alt="" />
                <img className="sheet-loader-fill" src="/ball.svg" alt="" />
            </div>
        </div>
    );
}
