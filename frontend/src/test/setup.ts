// Setup commun des tests vitest. Les matchers @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent...) sont enregistres pour les tests de
// rendu de composants (*.test.tsx sous jsdom). L'import est sans effet pour les
// tests de domaine purs (node).
import "@testing-library/jest-dom/vitest";

// jsdom n'implemente pas <canvas>.getContext (il LEVE au lieu de renvoyer null).
// Les composants a canvas (ex. « Les briques ») gerent deja un contexte absent
// (ils sortent si getContext renvoie null) : on renvoie donc null en test pour
// exercer le rendu DOM sans bruit ni dessin reel.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
