import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
// https://vite.dev/config/
// GitHub Pages project site needs base `/<repo>/`; local/dev keeps `/`.
const base = process.env.VITE_BASE || "/"
export default defineConfig({
  base,
  plugins: [
    // Skip Hono mid-dev-server on pure static builds (e.g. GitHub Pages).
    ...(process.env.VITE_STATIC === "1"
      ? [react()]
      : [
          devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
          react(),
        ]),
  ],
  server: {
    port: 3000,
    proxy: {
      "/serial-bridge": {
        target: "http://127.0.0.1:8765",
        rewrite: (p) => p.replace(/^\/serial-bridge/, "") || "/",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
