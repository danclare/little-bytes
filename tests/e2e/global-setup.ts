import type { FullConfig } from "@playwright/test";

const WARM_PATHS = [
  "/",
  "/api/auth/session",
  "/api/auth/entra/status",
  "/api/auth/apple/status",
  "/api/foods",
  "/api/recipes",
  "/api/meal-plan-templates",
  "/api/shopping-lists",
  "/api/family/members",
];

/**
 * The dev server compiles routes on first request. Compiling them before the browser test
 * starts avoids Fast Refresh full reloads in the middle of the first page load.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://127.0.0.1:3000";
  for (const path of WARM_PATHS) {
    const deadline = Date.now() + 120_000;
    for (;;) {
      try {
        const response = await fetch(new URL(path, baseURL));
        await response.arrayBuffer();
        if (response.status < 500) break;
      } catch {
        // The server may still be starting; retry until the deadline.
      }
      if (Date.now() > deadline) throw new Error(`Timed out warming ${path}`);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
}
