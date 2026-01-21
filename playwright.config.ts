import { createLovableConfig } from "lovable-agent-playwright-config/config";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

export default createLovableConfig({
  globalSetup: "./e2e/global.setup.ts",
  globalTeardown: "./e2e/global.teardown.ts",
  use: {
    baseURL,
    storageState: "e2e/.auth/user.json",
  },
});
