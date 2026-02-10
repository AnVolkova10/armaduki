import { useEffect, useMemo, useRef, useState } from 'react';
import './DropdownMenuSelect.css';

export interface DropdownMenuOption {
    label: string;
    value: string;
}

interface DropdownMenuSelectProps {
    value: string;
    options: DropdownMenuOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    disabled?: boolean;
}

export function DropdownMenuSelect({
    value,
    options,
    onChange,
    ariaLabel,
    disabled = false,
}: DropdownMenuSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const selected = useMemo(
        () => options.find((option) => option.value === value) ?? options[0],
        [options, value],
    );

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!open) return;
            const target = event.target as Node;
            if (!rootRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleDocumentClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const handleSelect = (nextValue: string) => {
        onChange(nextValue);
        setOpen(false);
    };

    return (
        <div className={`dropdown-select ${open ? 'is-open' : ''}`} ref={rootRef}>
            <button
                type="button"
                className="dropdown-select-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-haspopup="menu"
                disabled={disabled}
            >
                <span className="dropdown-select-label">{selected?.label || ''}</span>
                <span className="dropdown-select-caret" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </span>
            </button>

            {open && !disabled && (
                <div className="dropdown-select-menu" role="menu">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`dropdown-select-option ${
                                option.value === value ? 'is-active' : ''
                            }`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
