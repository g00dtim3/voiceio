import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Isolate each file so vi.mock doesn't leak between suites
    isolate: true,
  },
});
