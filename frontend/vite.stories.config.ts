// Config Vite dediee aux STORIES (captures Playwright). Build en librairie IIFE
// -> un seul JS + un seul CSS dans stories-dist/, sans serveur : le script de
// capture (stories/capture.mjs) les injecte dans une page Playwright via
// addScriptTag / addStyleTag (file://, aucun http requis).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // En build « lib », Vite ne definit pas process.env : React (qui lit
  // process.env.NODE_ENV) planterait dans le navigateur. On force la version de
  // production et on neutralise process.env.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": "{}",
  },
  build: {
    outDir: "stories-dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: "stories/main.tsx",
      name: "KerskolStories",
      formats: ["iife"],
      fileName: () => "stories.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true, assetFileNames: "stories.[ext]" },
    },
  },
});
