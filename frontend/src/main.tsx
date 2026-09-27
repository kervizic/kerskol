import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Tokens du theme (police Andika auto-hebergee incluse) : importe via Vite ->
// empreinte de contenu, cache long propre. Puis styles de l'app.
// (Le mecanisme de mise a jour app-version.js est charge par index.html via
//  <script src="/theme/app-version.js">, servi depuis public/theme.)
import "../theme/tokens.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service worker minimal (PWA). Enregistre hors mode demo.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* pas de PWA si l'enregistrement echoue : sans impact fonctionnel */
    });
  });
}
