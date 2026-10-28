import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/http";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireChild: vi.fn(),
  updateChild: vi.fn(),
  deleteChild: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/access", () => ({ requireChild: mocks.requireChild }));
vi.mock("@/lib/prisma", () => ({
  prisma: { child: { update: mocks.updateChild, delete: mocks.deleteChild } },
}));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));

import { GET, POST, DELETE } from "@/app/api/children/[childId]/photo/route";
import { DELETE as deleteChild } from "@/app/api/children/[childId]/route";

const context = { params: Promise.resolve({ childId: "child-id" }) };
const child = {
  id: "child-id",
  familyId: "family-id",
  photoObjectKey: "existing.jpg",
};

describe("disabled photo routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PHOTO_STORAGE", "disabled");
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
    vi.stubEnv("RATE_LIMIT_HMAC_KEY", "test-rate-limit-secret-with-at-least-32-characters");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/photo_route_test");
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.requireChild.mockResolvedValue(child);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  for (const [method, handler] of [
    ["GET", GET],
    ["POST", POST],
    ["DELETE", DELETE],
  ] as const) {
    it(`rejects ${method} without reading uploads or modifying photo records`, async () => {
      const request = new Request("http://localhost/api/children/child-id/photo", { method });
      const formData = vi.spyOn(request, "formData");
      const response = await handler(request, context);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "Profile photos are disabled on this deployment.",
      });
      expect(mocks.requireChild).toHaveBeenCalledWith(
        "user-id",
        "child-id",
        ...(method === "GET" ? [] : ["write"]),
      );
      expect(formData).not.toHaveBeenCalled();
      expect(mocks.updateChild).not.toHaveBeenCalled();
      expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    });

    it(`preserves authentication checks for ${method}`, async () => {
      mocks.requireUser.mockRejectedValue(new HttpError(401, "Please sign in."));
      const response = await handler(
        new Request("http://localhost/api/children/child-id/photo", { method }),
        context,
      );
      expect(response.status).toBe(401);
      expect(mocks.requireChild).not.toHaveBeenCalled();
    });

    it(`preserves cross-family access denial for ${method}`, async () => {
      mocks.requireChild.mockRejectedValue(new HttpError(404, "Child not found."));
      const response = await handler(
        new Request("http://localhost/api/children/child-id/photo", { method }),
        context,
      );
      expect(response.status).toBe(404);
      expect(mocks.updateChild).not.toHaveBeenCalled();
    });
  }

  it("allows deleting a child with an old photo key without accessing disabled storage", async () => {
    const response = await deleteChild(
      new Request("http://localhost/api/children/child-id", { method: "DELETE" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.deleteChild).toHaveBeenCalledWith({
      where: { id: child.id, familyId: child.familyId },
    });
    expect(mocks.requireChild).toHaveBeenCalledWith("user-id", "child-id", "manage");
  });
});
