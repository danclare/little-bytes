import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireChild, requireMealPlan, requireShoppingList } from "@/lib/access";
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { createHash, randomUUID } from "node:crypto";

const integration = describe.skipIf(!process.env.TEST_DATABASE_URL);

integration("PostgreSQL authentication and family isolation", () => {
  const suffix = randomUUID();
  const ids = {
    userA: "",
    userB: "",
    familyA: "",
    familyB: "",
    childA: "",
    childB: "",
    planA: "",
    listA: "",
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
    await prisma.$connect();
    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: {
          email: `a-${suffix}@example.test`,
          normalizedEmail: `a-${suffix}@example.test`,
          name: "Family A",
        },
      }),
      prisma.user.create({
        data: {
          email: `b-${suffix}@example.test`,
          normalizedEmail: `b-${suffix}@example.test`,
          name: "Family B",
        },
      }),
    ]);
    ids.userA = userA.id;
    ids.userB = userB.id;
    const [familyA, familyB] = await Promise.all([
      prisma.family.create({
        data: {
          name: "A",
          ownerUserId: userA.id,
          memberships: { create: { userId: userA.id, role: "owner" } },
        },
      }),
      prisma.family.create({
        data: {
          name: "B",
          ownerUserId: userB.id,
          memberships: { create: { userId: userB.id, role: "owner" } },
        },
      }),
    ]);
    ids.familyA = familyA.id;
    ids.familyB = familyB.id;
    const [childA, childB] = await Promise.all([
      prisma.child.create({
        data: {
          familyId: familyA.id,
          name: "A child",
          dateOfBirth: new Date("2025-01-01T00:00:00.000Z"),
        },
      }),
      prisma.child.create({
        data: {
          familyId: familyB.id,
          name: "B child",
          dateOfBirth: new Date("2025-01-01T00:00:00.000Z"),
        },
      }),
    ]);
    ids.childA = childA.id;
    ids.childB = childB.id;
    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const plan = await prisma.mealPlan.create({
      data: { childId: childA.id, weekStart },
    });
    const list = await prisma.shoppingList.create({
      data: { familyId: familyA.id, childId: childA.id, name: "A list" },
    });
    ids.planA = plan.id;
    ids.listA = list.id;
  });

  afterAll(async () => {
    if (ids.familyA)
      await prisma.family.deleteMany({ where: { id: { in: [ids.familyA, ids.familyB] } } });
    if (ids.userA) await prisma.user.deleteMany({ where: { id: { in: [ids.userA, ids.userB] } } });
    await prisma.$disconnect();
  });

  it("allows own-family child access and denies another family's child and guessed identifiers", async () => {
    await expect(requireChild(ids.userA, ids.childA)).resolves.toMatchObject({ id: ids.childA });
    await expect(requireChild(ids.userB, ids.childA)).rejects.toMatchObject({ status: 404 });
    await expect(requireChild(ids.userB, randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(requireChild(ids.userA, ids.childB)).rejects.toMatchObject({ status: 404 });
  });

  it("denies cross-family nested meal-plan and shopping-list access", async () => {
    await expect(requireMealPlan(ids.userA, ids.planA)).resolves.toMatchObject({
      childId: ids.childA,
    });
    await expect(requireMealPlan(ids.userB, ids.planA)).rejects.toMatchObject({ status: 404 });
    await expect(requireShoppingList(ids.userA, ids.listA)).resolves.toMatchObject({
      familyId: ids.familyA,
    });
    await expect(requireShoppingList(ids.userB, ids.listA)).rejects.toMatchObject({ status: 404 });
  });

  it("persists child diary history separately from food status and isolates children", async () => {
    const banana = await prisma.food.findUniqueOrThrow({ where: { slug: "banana" } });
    const entry = await prisma.foodDiaryEntry.create({
      data: {
        childId: ids.childA,
        foodId: banana.id,
        eatenAt: new Date(),
        preparation: "Mashed ripe banana",
        texture: "Soft mash",
        amount: "A few spoonfuls",
        reaction: "No reaction observed",
      },
    });
    await prisma.childFoodStatus.upsert({
      where: { childId_foodId: { childId: ids.childA, foodId: banana.id } },
      create: { childId: ids.childA, foodId: banana.id, status: "liked" },
      update: { status: "liked" },
    });
    await prisma.childFoodStatus.update({
      where: { childId_foodId: { childId: ids.childA, foodId: banana.id } },
      data: { status: "disliked" },
    });

    await expect(
      prisma.foodDiaryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({
      preparation: "Mashed ripe banana",
      reaction: "No reaction observed",
    });
    await expect(
      prisma.foodDiaryEntry.findMany({ where: { childId: ids.childB } }),
    ).resolves.toHaveLength(0);
    await expect(
      prisma.childFoodStatus.findUniqueOrThrow({
        where: { childId_foodId: { childId: ids.childA, foodId: banana.id } },
      }),
    ).resolves.toMatchObject({ status: "disliked" });
  });

  it("persists planned meals and checked shopping-list items", async () => {
    const banana = await prisma.food.findUniqueOrThrow({ where: { slug: "banana" } });
    const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { slug: "banana" } });
    const plan = await prisma.mealPlan.findUniqueOrThrow({ where: { id: ids.planA } });
    const meal = await prisma.plannedMeal.create({
      data: {
        mealPlanId: plan.id,
        date: plan.weekStart,
        mealType: "breakfast",
        foodId: banana.id,
      },
    });
    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: ids.listA,
        ingredientId: ingredient.id,
        label: ingredient.name,
        quantity: 100,
        unit: "g",
        category: ingredient.category,
      },
    });
    await prisma.shoppingListItem.update({
      where: { id: item.id },
      data: { checked: true },
    });

    await expect(
      prisma.plannedMeal.findUniqueOrThrow({ where: { id: meal.id } }),
    ).resolves.toMatchObject({ mealPlanId: plan.id, foodId: banana.id });
    await expect(
      prisma.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } }),
    ).resolves.toMatchObject({ checked: true, quantity: expect.anything() });
  });

  it("persists child diary history separately from food status and isolates children", async () => {
    const banana = await prisma.food.findUniqueOrThrow({ where: { slug: "banana" } });
    const entry = await prisma.foodDiaryEntry.create({
      data: {
        childId: ids.childA,
        foodId: banana.id,
        eatenAt: new Date(),
        preparation: "Mashed ripe banana",
        texture: "Soft mash",
        amount: "A few spoonfuls",
        reaction: "No reaction observed",
      },
    });
    await prisma.childFoodStatus.upsert({
      where: { childId_foodId: { childId: ids.childA, foodId: banana.id } },
      create: { childId: ids.childA, foodId: banana.id, status: "liked" },
      update: { status: "liked" },
    });
    await prisma.childFoodStatus.update({
      where: { childId_foodId: { childId: ids.childA, foodId: banana.id } },
      data: { status: "disliked" },
    });

    await expect(
      prisma.foodDiaryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).resolves.toMatchObject({
      preparation: "Mashed ripe banana",
      reaction: "No reaction observed",
    });
    await expect(
      prisma.foodDiaryEntry.findMany({ where: { childId: ids.childB } }),
    ).resolves.toHaveLength(0);
    await expect(
      prisma.childFoodStatus.findUniqueOrThrow({
        where: { childId_foodId: { childId: ids.childA, foodId: banana.id } },
      }),
    ).resolves.toMatchObject({ status: "disliked" });
  });

  it("persists planned meals and checked shopping-list items", async () => {
    const banana = await prisma.food.findUniqueOrThrow({ where: { slug: "banana" } });
    const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { slug: "banana" } });
    const plan = await prisma.mealPlan.findUniqueOrThrow({ where: { id: ids.planA } });
    const meal = await prisma.plannedMeal.create({
      data: {
        mealPlanId: plan.id,
        date: plan.weekStart,
        mealType: "breakfast",
        foodId: banana.id,
      },
    });
    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: ids.listA,
        ingredientId: ingredient.id,
        label: ingredient.name,
        quantity: 100,
        unit: "g",
        category: ingredient.category,
      },
    });
    await prisma.shoppingListItem.update({
      where: { id: item.id },
      data: { checked: true },
    });

    await expect(
      prisma.plannedMeal.findUniqueOrThrow({ where: { id: meal.id } }),
    ).resolves.toMatchObject({ mealPlanId: plan.id, foodId: banana.id });
    await expect(
      prisma.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } }),
    ).resolves.toMatchObject({ checked: true, quantity: expect.anything() });
  });

  it("hashes passwords with a maintained Argon2 implementation", async () => {
    const hash = await hashPassword("a long integration test password");
    expect(hash).not.toContain("a long integration test password");
    await expect(verifyPassword(hash, "a long integration test password")).resolves.toBe(true);
    await expect(verifyPassword(hash, "a different password")).resolves.toBe(false);
  });

  it("consumes reset tokens once and rejects expired tokens", async () => {
    const original = await hashPassword("initial secure password");
    await prisma.passwordCredential.create({ data: { userId: ids.userA, password: original } });
    const sessionTokenHash = createHash("sha256").update(randomUUID()).digest("hex");
    await prisma.session.create({
      data: {
        userId: ids.userA,
        tokenHash: sessionTokenHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const token = await createPasswordResetToken(ids.userA);
    await expect(consumePasswordResetToken(token, "replacement secure password")).resolves.toBe(
      true,
    );
    await expect(
      prisma.session.findUnique({ where: { tokenHash: sessionTokenHash } }),
    ).resolves.toBe(null);
    await expect(consumePasswordResetToken(token, "another replacement password")).resolves.toBe(
      false,
    );

    const expiredToken = await createPasswordResetToken(ids.userA);
    const tokenHash = createHash("sha256").update(expiredToken).digest("hex");
    await prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await expect(
      consumePasswordResetToken(expiredToken, "another replacement password"),
    ).resolves.toBe(false);
  });
});
