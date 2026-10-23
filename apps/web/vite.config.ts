import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    watch: {usePolling: true, interval: 300},
    proxy: { "/api": process.env.API_PROXY_TARGET || "http://127.0.0.1:3001" },
  },
  build: { rollupOptions: {output: {manualChunks: {maplibre: ["maplibre-gl"], three: ["three"]}}}, chunkSizeWarningLimit: 1100 },
});
