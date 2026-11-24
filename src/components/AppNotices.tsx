import { useEffect } from 'react';
import { useT } from '../i18n';
import useAppStore from '../store/useAppStore';
import './AppNotices.css';

/**
 * App-wide notices: data problems found while loading the sheet, and writes that
 * could not be saved to Google Sheets (with a retry).
 */
export function AppNotices() {
    const syncErrors = useAppStore((state) => state.syncErrors);
    const pendingSyncCount = useAppStore((state) => state.pendingSyncCount);
    const retryFailedSyncs = useAppStore((state) => state.retryFailedSyncs);
    const dismissSyncErrors = useAppStore((state) => state.dismissSyncErrors);
    const dataWarning = useAppStore((state) => state.dataWarning);
    const dismissDataWarning = useAppStore((state) => state.dismissDataWarning);
    const t = useT();

    const hasUnsavedChanges = pendingSyncCount > 0 || syncErrors.length > 0;

    // Warn before closing the tab while changes are still only in memory.
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    if (!dataWarning && syncErrors.length === 0) return null;

    const latestError = syncErrors[syncErrors.length - 1];

    return (
        <div className="app-notices">
            {dataWarning && (
                <div className="app-notice app-notice--warning" role="status">
                    <p className="app-notice-text">{dataWarning}</p>
                    <div className="app-notice-actions">
                        <button
                            type="button"
                            className="app-notice-btn app-notice-btn--icon"
                            onClick={dismissDataWarning}
                            aria-label={t.notices.dismissWarning}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}

            {latestError && (
                <div className="app-notice app-notice--error" role="alert">
                    <div className="app-notice-text">
                        <strong>
                            {syncErrors.length === 1
                                ? latestError.errorMessage
                                : t.notices.manyFailed(syncErrors.length)}
                        </strong>
                        <span className="app-notice-detail">
                            {latestError.detail} {t.notices.unsavedOnlyHere}
                        </span>
                    </div>
                    <div className="app-notice-actions">
                        <button
                            type="button"
                            className="app-notice-btn"
                            onClick={() => void retryFailedSyncs()}
                            disabled={pendingSyncCount > 0}
                        >
                            {pendingSyncCount > 0 ? t.notices.saving : t.common.retry}
                        </button>
                        <button
                            type="button"
                            className="app-notice-btn app-notice-btn--icon"
                            onClick={dismissSyncErrors}
                            aria-label={t.notices.dismissSyncErrors}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
