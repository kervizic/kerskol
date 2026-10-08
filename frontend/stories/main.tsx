// Point d'entree des stories (build lib Vite -> stories-dist). Monte toutes les
// stories dans #app ; le script Playwright capture ensuite chaque section
// [data-story]. On importe les MEMES feuilles de style que l'app reelle pour une
// capture fidele.
import { createRoot } from "react-dom/client";
import "../theme/tokens.css";
import "../src/styles/app.css";
import { STORIES } from "./stories";

function Gallery() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {STORIES.map((s) => (
        <section key={s.id} data-story={s.id} style={{ background: "var(--kk-bg, #fff)" }}>
          <h2 style={{ font: "600 14px/1.2 system-ui, sans-serif", margin: "0 0 8px", color: "#555" }}>
            {s.label}
          </h2>
          <div className="kk-card" style={{ padding: 12 }}>{s.node}</div>
        </section>
      ))}
    </div>
  );
}

const el = document.getElementById("app");
if (el) createRoot(el).render(<Gallery />);
