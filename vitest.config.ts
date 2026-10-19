import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/setup/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup/env.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    pool: "forks",
  },
});
