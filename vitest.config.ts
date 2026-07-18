import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/core/di/ServiceContainer.ts",
        "src/core/services/extension/BlockRegistry.ts",
        "src/core/services/extension/GeneratorRegistry.ts",
        "src/core/services/extension/CategoryRegistry.ts",
        "src/core/services/extension/ComponentRegistry.ts",
        "src/core/services/extension/ValidationRegistry.ts",
        "src/core/services/extension/LibraryRegistry.ts",
        "src/core/services/extension/ExampleRegistry.ts",
        "src/core/services/extension/AssetRegistry.ts",
        "src/core/services/extension/CommandRegistry.ts",
        "src/core/services/extension/EventBus.ts",
        "src/core/services/extension/ExtensionContext.ts",
        "src/core/services/extension/ExtensionLoader.ts",
        "src/core/services/extension/ExtensionManager.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
      ],
      thresholds: {
        "src/core/di/ServiceContainer.ts": { statements: 95, branches: 90, functions: 100, lines: 95 },
        "src/core/services/extension/BlockRegistry.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "src/core/services/extension/GeneratorRegistry.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "src/core/services/extension/CategoryRegistry.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "src/core/services/extension/ComponentRegistry.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "src/core/services/extension/LibraryRegistry.ts": { statements: 100, branches: 85, functions: 100, lines: 100 },
        "src/core/services/extension/ExampleRegistry.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "src/core/services/extension/AssetRegistry.ts": { statements: 80, branches: 50, functions: 100, lines: 80 },
        "src/core/services/extension/EventBus.ts": { statements: 95, branches: 90, functions: 100, lines: 95 },
        "src/core/services/extension/ExtensionContext.ts": { statements: 80, branches: 100, functions: 75, lines: 80 },
        "src/core/services/extension/ExtensionLoader.ts": { statements: 70, branches: 35, functions: 50, lines: 75 },
        "src/core/services/extension/ExtensionManager.ts": { statements: 60, branches: 50, functions: 75, lines: 60 },
        "src/core/services/extension/ValidationRegistry.ts": { statements: 35, branches: 15, functions: 65, lines: 35 },
      },
      reporter: ["text", "html", "lcov"],
    },
  },
});
