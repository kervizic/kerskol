// Setup commun des tests vitest. Les matchers @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent...) sont enregistres pour les tests de
// rendu de composants (*.test.tsx sous jsdom). L'import est sans effet pour les
// tests de domaine purs (node).
import "@testing-library/jest-dom/vitest";
