import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Version applicative injectee au build par deploy.sh (-e APP_VERSION).
// En local (dev / build sans variable) : valeur de repli lisible.
const APP_VERSION = process.env.APP_VERSION || "dev-local";

// Remplace %APP_VERSION% dans index.html (les variables non VITE_* ne sont pas
// injectees automatiquement par Vite dans le HTML).
function appVersionHtmlPlugin() {
  return {
    name: "kerskol-app-version-html",
    transformIndexHtml(html: string) {
      return html.replace(/%APP_VERSION%/g, APP_VERSION);
    },
  };
}

export default defineConfig({
  plugins: [react(), appVersionHtmlPlugin()],
  build: {
    // Noms empreintes (hash de contenu) sous /assets/ -> cache long immuable
    // cote nginx. index.html reste non cache.
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
  },
  test: {
    globals: true,
    // Par defaut node (tests de domaine purs, rapides). Les tests de RENDU de
    // composants (*.test.tsx, @testing-library/react) tournent sous jsdom.
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
