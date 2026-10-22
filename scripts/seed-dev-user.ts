/**
 * Creates (or refreshes) local development sign-in accounts.
 *
 * Safety: refuses to run unless NODE_ENV is "development", ALLOW_DEV_USER_SEED=true,
 * the database host is loopback, and DEV_USER_PASSWORD is a strong value.
 * Never run this against a shared or production database.
 */
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export const DEV_ACCOUNTS = [
  { email: "dev@littlebites.local", name: "Dev Parent", role: "owner" },
  { email: "partner@littlebites.local", name: "Dev Partner", role: "editor" },
] as const;

function assertSafeEnvironment(): string {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Development accounts can only be seeded when NODE_ENV=development.");
  }
  if (process.env.ALLOW_DEV_USER_SEED !== "true") {
    throw new Error("Set ALLOW_DEV_USER_SEED=true to seed local development accounts.");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const host = new URL(databaseUrl).hostname;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("Development accounts can only be seeded into a loopback (local) database.");
  }
  const password = process.env.DEV_USER_PASSWORD ?? "";
  if (password.length < 12) {
    throw new Error("DEV_USER_PASSWORD must contain at least 12 characters.");
  }
  return password;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}

async function main() {
  const password = assertSafeEnvironment();
  const prisma = new PrismaClient();
  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const users = [];
    for (const account of DEV_ACCOUNTS) {
      const user = await prisma.user.upsert({
        where: { normalizedEmail: account.email },
        create: { email: account.email, normalizedEmail: account.email, name: account.name },
        update: {},
      });
      await prisma.passwordCredential.upsert({
        where: { userId: user.id },
        create: { userId: user.id, password: hash },
        update: { password: hash },
      });
      users.push({ ...account, id: user.id });
    }

    const owner = users[0];
    let membership = await prisma.familyMembership.findFirst({ where: { userId: owner.id } });
    if (!membership) {
      const family = await prisma.family.create({
        data: { name: "Dev family", ownerUserId: owner.id },
      });
      membership = await prisma.familyMembership.create({
        data: { familyId: family.id, userId: owner.id, role: "owner" },
      });
    }
    const familyId = membership.familyId;

    for (const member of users.slice(1)) {
      const existing = await prisma.familyMembership.findFirst({ where: { userId: member.id } });
      if (!existing) {
        await prisma.familyMembership.create({
          data: { familyId, userId: member.id, role: member.role },
        });
      }
    }

    const childCount = await prisma.child.count({ where: { familyId } });
    if (childCount === 0) {
      await prisma.child.createMany({
        data: [
          {
            familyId,
            name: "Sample Baby",
            dateOfBirth: monthsAgo(8),
            readiness: true,
            dietaryNotes: "Development sample child — not a real person.",
          },
          {
            familyId,
            name: "Little Sibling",
            dateOfBirth: monthsAgo(5),
            readiness: false,
            dietaryNotes: "Development sample child — shows the under-six-months guidance.",
          },
        ],
      });
    }
    console.info(
      `Development accounts ready: ${DEV_ACCOUNTS.map((item) => `${item.email} (${item.role})`).join(", ")}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    "Development account seeding failed.",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
