import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("photo storage configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
    vi.stubEnv("RATE_LIMIT_HMAC_KEY", "test-rate-limit-secret-with-at-least-32-characters");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/configuration_test");
    vi.stubEnv("PHOTO_STORAGE", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults production to disabled without Azure settings", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getEnv, photosEnabled } = await import("@/lib/env");
    expect(getEnv().PHOTO_STORAGE).toBe("disabled");
    expect(photosEnabled()).toBe(false);
  });

  it("keeps local development photo storage enabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { getEnv, photosEnabled } = await import("@/lib/env");
    expect(getEnv().PHOTO_STORAGE).toBe("local");
    expect(photosEnabled()).toBe(true);
  });

  it("preserves explicitly enabled Azure storage in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PHOTO_STORAGE", "azure");
    const { photosEnabled } = await import("@/lib/env");
    expect(photosEnabled()).toBe(true);
  });

  it("still rejects local photo storage in production", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PHOTO_STORAGE", "local");
    const { getEnv } = await import("@/lib/env");
    expect(getEnv).toThrow("PHOTO_STORAGE (custom)");
    expect(logger).toHaveBeenCalledWith("Invalid server configuration", {
      issues: [{ field: "PHOTO_STORAGE", code: "custom" }],
    });
    logger.mockRestore();
  });

  it("reports invalid field names without logging configuration values", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "short-secret");
    vi.stubEnv("APP_URL", "invalid-private-url-value");
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { getEnv } = await import("@/lib/env");
      expect(getEnv).toThrow("AUTH_SECRET (too_small)");
      expect(logger).toHaveBeenCalledWith("Invalid server configuration", {
        issues: [
          { field: "APP_URL", code: "invalid_format" },
          { field: "AUTH_SECRET", code: "too_small" },
        ],
      });
      expect(JSON.stringify(logger.mock.calls)).not.toContain("short-secret");
      expect(JSON.stringify(logger.mock.calls)).not.toContain("invalid-private-url-value");
    } finally {
      logger.mockRestore();
    }
  });

  it("rejects all storage operations when disabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PHOTO_STORAGE", "disabled");
    const { storePhoto, getPhoto, deletePhoto } = await import("@/lib/photos");
    for (const operation of [
      () => storePhoto(Buffer.from("photo")),
      () => getPhoto("existing.jpg"),
      () => deletePhoto("existing.jpg"),
    ]) {
      await expect(operation()).rejects.toMatchObject({
        status: 503,
        message: "Profile photos are disabled on this deployment.",
      });
    }
  });
});
