import './NoteTip.css';

/**
 * A player's note, shown on hover over its card or its row in the result (Sprint 6). Computers
 * only: touch screens have no hover, so there the note lives in the form. Privacy mode never
 * renders it. Hidden from screen readers, which find the note in the form.
 */
export function NoteTip({ text }: { text: string }) {
    return (
        <span className="note-tip" aria-hidden="true">
            {text}
        </span>
    );
}
