import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const auth = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/lib/auth", async () => {
  const { HttpError } = await import("@/lib/http");
  return {
    requireUser: async () => {
      if (!auth.userId) throw new HttpError(401, "Please sign in.");
      return { id: auth.userId };
    },
  };
});
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(undefined) }));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/children/[childId]/diary/meals/route";

const integration = describe.skipIf(!process.env.TEST_DATABASE_URL);

integration("PostgreSQL meal logging from recipes and planned meals", () => {
  const suffix = randomUUID().slice(0, 8);
  const users: Record<string, string> = {};
  const familyIds: string[] = [];
  const ingredientIds: string[] = [];
  const foodIds: Record<string, string> = {};
  let recipeId = "";
  let childId = "";
  let otherChildId = "";
  let plannedRecipeMealId = "";
  let plannedFoodMealId = "";
  let otherPlannedMealId = "";

  function call(targetChildId: string, body: unknown, origin = "http://127.0.0.1:3000") {
    return POST(
      new Request(`http://127.0.0.1:3000/api/children/${targetChildId}/diary/meals`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ childId: targetChildId }) },
    );
  }

  async function createFood(name: string, withIngredient = true) {
    const ingredient = withIngredient
      ? await prisma.ingredient.create({
          data: {
            slug: `meal-log-${name}-${suffix}`,
            name,
            category: "vegetable",
            supportedUnits: ["g"],
          },
        })
      : null;
    if (ingredient) ingredientIds.push(ingredient.id);
    const food = await prisma.food.create({
      data: {
        slug: `meal-log-food-${name}-${suffix}`,
        name: `${name} ${suffix}`,
        description: "Test food",
        category: "vegetable",
        ageGuidance: "From 6 months",
        preparationGuides: {},
        ingredientId: ingredient?.id,
      },
    });
    foodIds[name] = food.id;
    return { ingredient, food };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
    process.env.APP_URL = "http://127.0.0.1:3000";
    await prisma.$connect();
    for (const name of ["owner", "viewer", "outsider"]) {
      const email = `meal-log-${name}-${suffix}@example.test`;
      const user = await prisma.user.create({
        data: { email, normalizedEmail: email, name },
      });
      users[name] = user.id;
    }
    const family = await prisma.family.create({
      data: {
        name: "Meal log family",
        ownerUserId: users.owner,
        memberships: {
          create: [
            { userId: users.owner, role: "owner" },
            { userId: users.viewer, role: "viewer" },
          ],
        },
        children: {
          create: { name: "Logger", dateOfBirth: new Date("2025-01-01T00:00:00.000Z") },
        },
      },
      include: { children: true },
    });
    familyIds.push(family.id);
    childId = family.children[0].id;
    const other = await prisma.family.create({
      data: {
        name: "Other meal log family",
        ownerUserId: users.outsider,
        memberships: { create: { userId: users.outsider, role: "owner" } },
        children: {
          create: { name: "Other", dateOfBirth: new Date("2025-01-01T00:00:00.000Z") },
        },
      },
      include: { children: true },
    });
    familyIds.push(other.id);
    otherChildId = other.children[0].id;

    const carrot = await createFood("carrot");
    const pear = await createFood("pear");
    await createFood("broccoli");
    const recipe = await prisma.recipe.create({
      data: {
        slug: `meal-log-recipe-${suffix}`,
        title: "Carrot and pear mash",
        description: "Test recipe",
        mealType: "lunch",
        suitableAgeMonths: 6,
        servings: 2,
        preparationMinutes: 5,
        cookingMinutes: 10,
        instructions: ["Steam", "Mash"],
        source: "test",
        ingredients: {
          create: [
            { ingredientId: carrot.ingredient!.id, quantity: 100, unit: "g" },
            { ingredientId: pear.ingredient!.id, quantity: 50, unit: "g" },
          ],
        },
      },
    });
    recipeId = recipe.id;
    const plan = await prisma.mealPlan.create({
      data: {
        childId,
        weekStart: new Date("2026-01-05T00:00:00.000Z"),
        meals: {
          create: [
            { date: new Date("2026-01-05T00:00:00.000Z"), mealType: "lunch", recipeId },
            {
              date: new Date("2026-01-05T00:00:00.000Z"),
              mealType: "dinner",
              foodId: foodIds.broccoli,
            },
          ],
        },
      },
      include: { meals: true },
    });
    plannedRecipeMealId = plan.meals.find((meal) => meal.recipeId)!.id;
    plannedFoodMealId = plan.meals.find((meal) => meal.foodId)!.id;
    const otherPlan = await prisma.mealPlan.create({
      data: {
        childId: otherChildId,
        weekStart: new Date("2026-01-05T00:00:00.000Z"),
        meals: {
          create: { date: new Date("2026-01-05T00:00:00.000Z"), mealType: "lunch", recipeId },
        },
      },
      include: { meals: true },
    });
    otherPlannedMealId = otherPlan.meals[0].id;
  });

  afterAll(async () => {
    if (familyIds.length) await prisma.family.deleteMany({ where: { id: { in: familyIds } } });
    if (recipeId) await prisma.recipe.deleteMany({ where: { id: recipeId } });
    await prisma.food.deleteMany({ where: { id: { in: Object.values(foodIds) } } });
    await prisma.ingredient.deleteMany({ where: { id: { in: ingredientIds } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(users) } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    auth.userId = users.owner;
  });

  it("logs every chosen recipe food in one step and updates food progress", async () => {
    const response = await call(childId, {
      plannedMealId: plannedRecipeMealId,
      amount: "Most of it",
      foods: [
        { foodId: foodIds.carrot, status: "liked" },
        { foodId: foodIds.pear, status: "disliked" },
      ],
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.logged).toBe(2);
    const entries = await prisma.foodDiaryEntry.findMany({
      where: { childId, plannedMealId: plannedRecipeMealId },
    });
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.recipeId === recipeId)).toBe(true);
    expect(entries[0].preparation).toBe('Cooked in "Carrot and pear mash"');
    expect(entries[0].amount).toBe("Most of it");
    const statuses = await prisma.childFoodStatus.findMany({ where: { childId } });
    expect(Object.fromEntries(statuses.map((row) => [row.foodId, row.status]))).toMatchObject({
      [foodIds.carrot]: "liked",
      [foodIds.pear]: "disliked",
    });
  });

  it("logs a recipe opened from the library without a planned meal", async () => {
    const response = await call(childId, {
      recipeId,
      foods: [{ foodId: foodIds.carrot, status: "tried" }],
    });
    expect(response.status).toBe(201);
  });

  it("logs a food-only planned meal", async () => {
    const response = await call(childId, {
      plannedMealId: plannedFoodMealId,
      foods: [{ foodId: foodIds.broccoli, status: "tried" }],
    });
    expect(response.status).toBe(201);
    const entry = await prisma.foodDiaryEntry.findFirstOrThrow({
      where: { plannedMealId: plannedFoodMealId },
    });
    expect(entry.preparation).toBe("As planned");
  });

  it("rejects foods that are not part of the recipe or planned meal", async () => {
    const response = await call(childId, {
      recipeId,
      foods: [{ foodId: foodIds.broccoli, status: "tried" }],
    });
    expect(response.status).toBe(400);
    const mismatch = await call(childId, {
      plannedMealId: plannedFoodMealId,
      foods: [{ foodId: foodIds.carrot, status: "tried" }],
    });
    expect(mismatch.status).toBe(400);
  });

  it("rejects duplicate foods, future times and requests without a source", async () => {
    expect(
      (
        await call(childId, {
          recipeId,
          foods: [
            { foodId: foodIds.carrot, status: "tried" },
            { foodId: foodIds.carrot, status: "liked" },
          ],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(childId, {
          recipeId,
          eatenAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          foods: [{ foodId: foodIds.carrot, status: "tried" }],
        })
      ).status,
    ).toBe(400);
    expect(
      (await call(childId, { foods: [{ foodId: foodIds.carrot, status: "tried" }] })).status,
    ).toBe(400);
  });

  it("prevents cross-family logging and foreign planned meals", async () => {
    auth.userId = users.outsider;
    const foreignChild = await call(childId, {
      recipeId,
      foods: [{ foodId: foodIds.carrot, status: "tried" }],
    });
    expect(foreignChild.status).toBe(404);

    auth.userId = users.owner;
    const foreignPlannedMeal = await call(childId, {
      plannedMealId: otherPlannedMealId,
      foods: [{ foodId: foodIds.carrot, status: "tried" }],
    });
    expect(foreignPlannedMeal.status).toBe(404);
    expect(
      await prisma.foodDiaryEntry.count({ where: { plannedMealId: otherPlannedMealId } }),
    ).toBe(0);
  });

  it("forbids viewers, signed-out users and cross-origin requests", async () => {
    auth.userId = users.viewer;
    const body = { recipeId, foods: [{ foodId: foodIds.carrot, status: "tried" }] };
    expect((await call(childId, body)).status).toBe(403);
    auth.userId = "";
    expect((await call(childId, body)).status).toBe(401);
    auth.userId = users.owner;
    expect((await call(childId, body, "https://evil.example")).status).toBe(403);
  });
});
