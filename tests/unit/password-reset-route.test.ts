import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPasswordResetToken: vi.fn(),
  enforceRateLimit: vi.fn(),
  findUser: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createPasswordResetToken: mocks.createPasswordResetToken,
}));
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ EMAIL_DELIVERY: "smtp" }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUser } },
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

import { POST } from "@/app/api/auth/reset/route";

describe("password reset request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.findUser.mockResolvedValue(null);
    mocks.createPasswordResetToken.mockResolvedValue("private-reset-token");
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the same generic response when SMTP delivery fails for a matching account", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const missingAccount = await POST(
      new Request("http://localhost/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ email: "parent@example.test" }),
      }),
    );
    mocks.findUser.mockResolvedValue({
      id: "user-id",
      email: "parent@example.test",
    });
    mocks.sendPasswordResetEmail.mockRejectedValue(new Error("SMTP rejected recipient"));
    const matchingAccount = await POST(
      new Request("http://localhost/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ email: "parent@example.test" }),
      }),
    );

    expect(matchingAccount.status).toBe(missingAccount.status);
    expect(await matchingAccount.json()).toEqual(await missingAccount.json());
    expect(matchingAccount.status).toBe(202);
    expect(logger).toHaveBeenCalledWith("Password reset request processing failed", "Error");
    expect(logger).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("parent@example.test"),
    );
  });
});
