import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }: { mode: string }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "33780c2005a4.ngrok-free.app",
      "8545df7e93a2c3.lhr.life",
      "192.168.100.193",
      "localhost",
      ".loca.lt"
    ],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      "/analysis-api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/analysis-api/, ""),
      },
    },
    watch: {
      ignored: [
        "**/python_env_new/**",
        "**/.venv/**",
        "**/venv/**",
        "**/__pycache__/**",
        "**/extracted_assets/**",
        "**/recreated_assets/**",
      ],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "fabric": path.resolve(__dirname, "node_modules/fabric/dist/index.min.mjs"),
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));