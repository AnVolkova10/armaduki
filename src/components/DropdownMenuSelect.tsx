import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
import './DropdownMenuSelect.css';

export interface DropdownMenuOption {
    label: string;
    value: string;
    /** A team's two colours, shown before its name as on the card's corner. */
    colors?: readonly [string, string];
}

interface DropdownMenuSelectProps {
    value: string;
    options: DropdownMenuOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    /** The small name over the value: what this menu chooses. */
    caption?: string;
    disabled?: boolean;
    className?: string;
}

function Swatch({ colors }: { colors?: readonly [string, string] }) {
    if (!colors) return null;
    const style = { '--swatch-1': colors[0], '--swatch-2': colors[1] } as CSSProperties;
    return <span className="dropdown-select-swatch" style={style} aria-hidden="true" />;
}

export function DropdownMenuSelect({
    value,
    options,
    onChange,
    ariaLabel,
    caption,
    disabled = false,
    className,
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
            if (event.key === 'Escape' && open) {
                // An open menu takes Escape for itself: the match it sits in stays open (Sprint 9),
                // since the modal listens on window, after the document.
                event.stopPropagation();
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
        <div className={['dropdown-select', open ? 'is-open' : '', className ?? ''].filter(Boolean).join(' ')} ref={rootRef}>
            <button
                type="button"
                className="dropdown-select-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-haspopup="menu"
                disabled={disabled}
            >
                <span className="dropdown-select-text">
                    {caption && <span className="dropdown-select-caption">{caption}</span>}
                    <span className="dropdown-select-label">
                        <Swatch colors={selected?.colors} />
                        {selected?.label || ''}
                    </span>
                </span>
                <span className="dropdown-select-caret" aria-hidden="true">
                    <Icon name="chevronDown" size={14} />
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
                            <Swatch colors={option.colors} />
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
