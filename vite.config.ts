import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "html-transform-version",
      transformIndexHtml(html) {
        return html.replace(/<%=\s*version\s*%>/g, pkg.version);
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  assetsInclude: ["**/*.svg"],
  base: "./",
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
