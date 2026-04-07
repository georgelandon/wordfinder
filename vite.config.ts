import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

function resolveBase(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.VITE_BASE_PATH) {
    return env.VITE_BASE_PATH;
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (process.env.GITHUB_ACTIONS && repository) {
    return `/${repository}/`;
  }

  return "/";
}

export default defineConfig(({ mode }) => ({
  base: resolveBase(mode),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"]
  }
}));

