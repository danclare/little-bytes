import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireChild, requireMembership, requireShoppingList } from "@/lib/access";
import {
  acceptInvitation,
  createInvitation,
  hashInvitationToken,
  previewInvitation,
  removeMember,
  updateMemberRole,
} from "@/lib/invitations";

const integration = describe.skipIf(!process.env.TEST_DATABASE_URL);

integration("PostgreSQL family roles, invitations and membership", () => {
  const suffix = randomUUID();
  const email = (name: string) => `${name}-${suffix}@example.test`;
  const users: Record<string, { id: string; email: string }> = {};
  let familyId = "";
  let otherFamilyId = "";
  let childId = "";
  let listId = "";

  async function createUser(name: string) {
    const address = email(name);
    const user = await prisma.user.create({
      data: { email: address, normalizedEmail: address, name },
      select: { id: true, email: true },
    });
    users[name] = user;
    return user;
  }

  async function membershipOf(name: string) {
    return prisma.familyMembership.findFirstOrThrow({ where: { userId: users[name].id } });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
    process.env.APP_URL ??= "http://127.0.0.1:3000";
    process.env.AUTH_SECRET ??= "test-only-auth-secret-with-at-least-32-characters";
    process.env.RATE_LIMIT_HMAC_KEY ??= "test-only-rate-limit-hmac-key-with-32-characters";
    await prisma.$connect();
    for (const name of ["owner", "admin", "editor", "viewer", "invitee", "stranger", "outsider"]) {
      await createUser(name);
    }
    const family = await prisma.family.create({
      data: {
        name: "Role family",
        ownerUserId: users.owner.id,
        memberships: {
          create: [
            { userId: users.owner.id, role: "owner" },
            { userId: users.admin.id, role: "admin" },
            { userId: users.editor.id, role: "editor" },
            { userId: users.viewer.id, role: "viewer" },
          ],
        },
      },
    });
    familyId = family.id;
    const other = await prisma.family.create({
      data: {
        name: "Other family",
        ownerUserId: users.outsider.id,
        memberships: { create: { userId: users.outsider.id, role: "owner" } },
      },
    });
    otherFamilyId = other.id;
    const child = await prisma.child.create({
      data: { familyId, name: "Role child", dateOfBirth: new Date("2025-01-01T00:00:00.000Z") },
    });
    childId = child.id;
    const list = await prisma.shoppingList.create({
      data: { familyId, childId, name: "Role list" },
    });
    listId = list.id;
  });

  afterAll(async () => {
    const ids = [familyId, otherFamilyId].filter(Boolean);
    if (ids.length) await prisma.family.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(users).map((user) => user.id) } },
    });
    await prisma.$disconnect();
  });

  it("enforces read, write and manage permissions per role on the server", async () => {
    await expect(requireChild(users.viewer.id, childId, "read")).resolves.toMatchObject({
      id: childId,
    });
    await expect(requireChild(users.viewer.id, childId, "write")).rejects.toMatchObject({
      status: 403,
    });
    await expect(requireShoppingList(users.viewer.id, listId, "write")).rejects.toMatchObject({
      status: 403,
    });
    await expect(requireShoppingList(users.editor.id, listId, "write")).resolves.toMatchObject({
      id: listId,
    });
    await expect(requireMembership(users.editor.id, "manage")).rejects.toMatchObject({
      status: 403,
    });
    await expect(requireMembership(users.admin.id, "manage")).resolves.toMatchObject({
      familyId,
      role: "admin",
    });
    await expect(requireChild(users.outsider.id, childId, "read")).rejects.toMatchObject({
      status: 404,
    });
    await expect(requireShoppingList(users.outsider.id, listId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("prevents privilege escalation when changing roles", async () => {
    const viewer = await membershipOf("viewer");
    const admin = await membershipOf("admin");
    const owner = await membershipOf("owner");
    await expect(
      updateMemberRole({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        membershipId: viewer.id,
        role: "admin",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      updateMemberRole({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        membershipId: admin.id,
        role: "editor",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      updateMemberRole({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        membershipId: owner.id,
        role: "viewer",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      updateMemberRole({
        familyId: otherFamilyId,
        actorUserId: users.outsider.id,
        actorRole: "owner",
        membershipId: viewer.id,
        role: "editor",
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      updateMemberRole({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        membershipId: viewer.id,
        role: "editor",
      }),
    ).resolves.toMatchObject({ role: "editor" });
    await updateMemberRole({
      familyId,
      actorUserId: users.owner.id,
      actorRole: "owner",
      membershipId: viewer.id,
      role: "viewer",
    });
  });

  it("only lets the owner invite administrators and stores only a token hash", async () => {
    await expect(
      createInvitation({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        email: users.invitee.email,
        role: "admin",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createInvitation({
        familyId,
        actorUserId: users.owner.id,
        actorRole: "owner",
        email: users.editor.email,
        role: "viewer",
      }),
    ).rejects.toMatchObject({ status: 409 });
    const { invitation, token } = await createInvitation({
      familyId,
      actorUserId: users.admin.id,
      actorRole: "admin",
      email: users.invitee.email.toUpperCase(),
      role: "editor",
    });
    const stored = await prisma.familyInvitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    expect(stored.tokenHash).toBe(hashInvitationToken(token));
    expect(stored.tokenHash).not.toContain(token);
    expect(stored.normalizedEmail).toBe(users.invitee.email);
  });

  it("accepts an invitation only for the invited email, once, and grants the invited role", async () => {
    const { token } = await createInvitation({
      familyId,
      actorUserId: users.owner.id,
      actorRole: "owner",
      email: users.invitee.email,
      role: "viewer",
    });
    await expect(previewInvitation(token, users.stranger.email)).rejects.toMatchObject({
      status: 403,
    });
    await expect(acceptInvitation(token, users.stranger)).rejects.toMatchObject({ status: 403 });
    await expect(previewInvitation(token, users.invitee.email)).resolves.toMatchObject({
      familyName: "Role family",
      role: "viewer",
    });
    await expect(acceptInvitation(token, users.invitee)).resolves.toMatchObject({ familyId });
    await expect(acceptInvitation(token, users.invitee)).rejects.toMatchObject({ status: 404 });
    await expect(requireChild(users.invitee.id, childId, "read")).resolves.toMatchObject({
      id: childId,
    });
    await expect(requireChild(users.invitee.id, childId, "write")).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      acceptInvitation(randomUUID().replaceAll("-", ""), users.invitee),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects expired and revoked invitations and members of another family", async () => {
    const expired = await createInvitation({
      familyId,
      actorUserId: users.owner.id,
      actorRole: "owner",
      email: users.stranger.email,
      role: "viewer",
    });
    await prisma.familyInvitation.update({
      where: { id: expired.invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(acceptInvitation(expired.token, users.stranger)).rejects.toMatchObject({
      status: 404,
    });
    const revoked = await createInvitation({
      familyId,
      actorUserId: users.owner.id,
      actorRole: "owner",
      email: users.stranger.email,
      role: "viewer",
    });
    await prisma.familyInvitation.update({
      where: { id: revoked.invitation.id },
      data: { revokedAt: new Date() },
    });
    await expect(acceptInvitation(revoked.token, users.stranger)).rejects.toMatchObject({
      status: 404,
    });
    const crossFamily = await createInvitation({
      familyId,
      actorUserId: users.owner.id,
      actorRole: "owner",
      email: users.outsider.email,
      role: "viewer",
    });
    await expect(acceptInvitation(crossFamily.token, users.outsider)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("removes members, revoking their access, and protects the owner", async () => {
    const owner = await membershipOf("owner");
    const invitee = await membershipOf("invitee");
    await expect(
      removeMember({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        membershipId: owner.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      removeMember({
        familyId,
        actorUserId: users.editor.id,
        actorRole: "editor",
        membershipId: invitee.id,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      removeMember({
        familyId,
        actorUserId: users.admin.id,
        actorRole: "admin",
        membershipId: invitee.id,
      }),
    ).resolves.toMatchObject({ removed: invitee.id, leaving: false });
    await expect(requireChild(users.invitee.id, childId)).rejects.toMatchObject({ status: 404 });
    await expect(requireShoppingList(users.invitee.id, listId)).rejects.toMatchObject({
      status: 404,
    });

    const editor = await membershipOf("editor");
    await expect(
      removeMember({
        familyId,
        actorUserId: users.editor.id,
        actorRole: "editor",
        membershipId: editor.id,
      }),
    ).resolves.toMatchObject({ leaving: true });
    await expect(requireChild(users.editor.id, childId)).rejects.toMatchObject({ status: 404 });
  });
});
