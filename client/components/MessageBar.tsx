import { useEffect } from 'react';

/** Korte melding bovenaan (bv. "die naam is al in gebruik"). */
export function MessageBar({
  message,
  onClose,
}: {
  message: { kind: 'error' | 'info'; text: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`message-bar message-bar--${message.kind}`} role="status">
      <span>{message.text}</span>
      <button type="button" onClick={onClose} aria-label="Melding sluiten">
        ×
      </button>
    </div>
  );
}
