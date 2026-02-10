import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import './ActionButton.css';

type ActionButtonVariant = 'primary' | 'neutral';
type ActionButtonTone = 'default' | 'positive' | 'negative' | 'light';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ActionButtonVariant;
    tone?: ActionButtonTone;
}

export function ActionButton({
    variant = 'neutral',
    tone = 'default',
    className = '',
    children,
    ...buttonProps
}: PropsWithChildren<ActionButtonProps>) {
    const classes = [
        'action-btn',
        `action-btn--${variant}`,
        `action-btn--tone-${tone}`,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button className={classes} {...buttonProps}>
            {children}
        </button>
    );
}

