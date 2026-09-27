// Ecran provisoire : le moteur de seance arrive dans un prochain lot.
export function SessionSoon({ surnom, onBack }: { surnom: string; onBack: () => void }) {
  return (
    <div className="kk-page kk-center">
      <div className="kk-container" style={{ textAlign: "center", maxWidth: 520 }}>
        <div className="kk-card kk-stack">
          <div style={{ fontSize: "3rem" }} aria-hidden="true">🚧</div>
          <h1>Bientot : ta premiere seance</h1>
          <p className="kk-lead" style={{ margin: "0 auto" }}>
            Bravo {surnom}, tout est pret&nbsp;! Les exercices de calcul arrivent
            tres vite. Reviens bientot pour construire ton village.
          </p>
          <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={onBack}>
            Retour au village
          </button>
        </div>
      </div>
    </div>
  );
}
