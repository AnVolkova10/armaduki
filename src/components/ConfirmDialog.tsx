import { useEffect } from 'react';
import { ActionButton } from './ActionButton';
import './ConfirmDialog.css';

type ConfirmTone = 'default' | 'danger';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmTone;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [loading, onCancel, open]);

    if (!open) return null;

    return (
        <div className="confirm-overlay" onClick={!loading ? onCancel : undefined}>
            <div
                className="confirm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 id="confirm-title" className="confirm-title">
                    {title}
                </h3>
                <p className="confirm-message">{message}</p>

                <div className="confirm-actions">
                    <ActionButton
                        variant="neutral"
                        tone="light"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </ActionButton>
                    <ActionButton
                        variant="primary"
                        tone={tone === 'danger' ? 'negative' : 'default'}
                        className="confirm-confirm-btn"
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Working...' : confirmLabel}
                    </ActionButton>
                </div>
            </div>
        </div>
    );
}
