/** Het "openen van een spel"-gevoel: kort getoond bij elke nieuwe start. */
export function LoadingScreen() {
  return (
    <div className="ftd-intro">
      <div className="ftd-intro__spotlight" aria-hidden="true" />
      <span className="ftd-intro__cards" aria-hidden="true">
        🂠 🂠 🂠
      </span>
      <h1 className="ftd-intro__title">
        <span className="ftd-intro__line ftd-intro__line--fuck">FUCK</span>
        <span className="ftd-intro__line ftd-intro__line--the">THE</span>
        <span className="ftd-intro__line ftd-intro__line--dealer">DEALER</span>
      </h1>
      <p className="ftd-intro__subtitle">Schud de kaarten. Vul de glazen.</p>
    </div>
  );
}
