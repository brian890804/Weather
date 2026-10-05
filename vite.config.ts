import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.svg"],
  base: process.env.NODE_ENV === "production" ? "/Weather/" : "/", // ← 本地用 /
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: false,
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
  build: {
    sourcemap: false,
  },
});
