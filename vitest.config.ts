import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["**/*.spec.ts"],
    globals: true,
    environment: "node",
    testTimeout: 5000,
    setupFiles: [
      "./src/__tests__/setup/setup-logs.ts",
      "./src/__tests__/setup/setup-validation.ts",
      "./src/__tests__/setup/setup-clack.ts",
      "./src/__tests__/setup/setup-data.ts",
    ],
  },
});
