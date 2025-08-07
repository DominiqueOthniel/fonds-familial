import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: ".", // Changé de "src" à "." pour chercher à la racine
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-react",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Changé pour correspondre à shadcn
    },
  },
  css: {
    // Vite détecte automatiquement postcss.config.js
    postcss: path.resolve(__dirname, "postcss.config.js"),
  },
  server: {
    port: 5123,
    strictPort: true,
  },
});
