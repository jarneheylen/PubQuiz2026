import { useEffect, useRef, useState } from 'react';

/**
 * Toont kort een intro-scherm telkens de quizmaster dit spel opnieuw start
 * (nieuw `minigame.id`) - zo voelt elke keer opnieuw als het openen van een
 * spel, ook al is dit dezelfde ronde niet.
 */
export function useMinigameIntro(minigameId: string, durationMs = 2600): boolean {
  const [showIntro, setShowIntro] = useState(true);
  const seenId = useRef<string | null>(null);

  useEffect(() => {
    if (seenId.current === minigameId) return;
    seenId.current = minigameId;
    setShowIntro(true);
    const timer = window.setTimeout(() => setShowIntro(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [minigameId, durationMs]);

  return showIntro;
}
