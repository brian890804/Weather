import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
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
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "台灣即時天氣預報",
        short_name: "天氣預報",
        description: "台灣各縣市鄉鎮 3 天逐 3 小時精準天氣預報與即時氣象",
        theme_color: "#0a0f1e",
        background_color: "#0a0f1e",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
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
