import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Build del widget embebible (CDN).
 *
 * Salida: dist/widget.js — IIFE autoejecutable, cero dependencias.
 * Distribución: https://cdn.quopilot.com/v1/widget.js
 */
export default defineConfig({
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false, // no borrar el build principal de la SPA
    copyPublicDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/widget/widget.ts"),
      output: {
        // IIFE autoejecutable con nombre estable para el snippet de los clientes.
        format: "iife",
        entryFileNames: "widget.js",
      },
    },
    minify: true,
  },
});
