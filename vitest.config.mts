import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)),
    },
    conditions: ["react-server"],
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
