import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: true,
    // Exclude E2E tests (they use Playwright, not Vitest)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/tests/e2e/**",
      "**/tests/**/e2e/**",
      "**/*.e2e.spec.js",
      "**/*.spec.js", // Exclude Playwright specs
    ],
    // Only include Vitest test files
    include: ["**/*.test.{js,jsx,ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "tests/e2e/",
        "**/*.config.js",
        "**/*.config.ts",
        "**/dist/**",
        "**/build/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
