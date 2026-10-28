import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findMembership: vi.fn(),
  enabled: true,
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { familyMembership: { findFirst: mocks.findMembership } },
}));
vi.mock("@/lib/env", () => ({
  photosEnabled: () => mocks.enabled,
  appleSignInConfigured: () => false,
  entraSignInConfigured: () => false,
}));

import { GET } from "@/app/api/auth/session/route";

describe("session photo availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.findMembership.mockResolvedValue({
      role: "owner",
      family: {
        id: "family-id",
        name: "Family",
        children: [
          { id: "with-photo", name: "First child", photoObjectKey: "private-object.jpg" },
          { id: "without-photo", name: "Second child", photoObjectKey: null },
        ],
      },
    });
  });

  afterEach(() => {
    mocks.enabled = true;
  });

  it.each([false, true])(
    "reports photo availability as %s and keeps storage keys private",
    async (enabled) => {
      mocks.enabled = enabled;
      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.photosEnabled).toBe(enabled);
      expect(body.family.children).toEqual([
        { id: "with-photo", name: "First child", hasPhoto: enabled },
        { id: "without-photo", name: "Second child", hasPhoto: false },
      ]);
      expect(mocks.findMembership).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-id" } }),
      );
    },
  );
});
