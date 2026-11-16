import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
