import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  hashPassword: vi.fn(),
  createSession: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: mocks.hashPassword,
  createSession: mocks.createSession,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));

import { POST } from "@/app/api/auth/register/route";

describe("registration diagnostics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findUnique.mockResolvedValue(null);
    mocks.hashPassword.mockResolvedValue("private-password-hash");
    mocks.create.mockResolvedValue({ id: "private-user-id" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function request() {
    return new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test parent",
        email: "private-parent@example.test",
        password: "private-password-at-least-12-characters",
      }),
    });
  }

  it.each([
    ["rate-limit", mocks.enforceRateLimit],
    ["account-lookup", mocks.findUnique],
    ["password-hashing", mocks.hashPassword],
    ["account-create", mocks.create],
    ["session-create", mocks.createSession],
  ])(
    "logs the %s stage without exposing error messages or account details",
    async (stage, mock) => {
      mock.mockRejectedValue(new Error("private-error-with-credentials"));
      const response = await POST(request());
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Something went wrong. Please try again.",
      });
      expect(console.error).toHaveBeenCalledWith("Registration failed", {
        stage,
        errorType: "Error",
      });
      const logs = JSON.stringify(vi.mocked(console.error).mock.calls);
      expect(logs).not.toContain("private-");
      expect(logs).not.toContain("Test parent");
    },
  );

  it("does not log ordinary invalid-input responses as server failures", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("preserves successful registration", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.createSession).toHaveBeenCalledWith("private-user-id");
    expect(console.error).not.toHaveBeenCalled();
  });
});
