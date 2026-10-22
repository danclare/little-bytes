import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { mealLogSchema } from "@/lib/validation";

type Context = { params: Promise<{ childId: string }> };

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Logs the catalogue foods from a cooked recipe or planned meal to the child's diary in one step.
 * Only foods that are actually part of the recipe/planned meal may be logged.
 */
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(request, "diary-write", 30);
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    const input = mealLogSchema.parse(await readJson(request));

    const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date();
    if (eatenAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new HttpError(400, "The meal time cannot be in the future.");
    }

    let recipeId = input.recipeId ?? null;
    let plannedFoodId: string | null = null;
    if (input.plannedMealId) {
      const planned = await prisma.plannedMeal.findFirst({
        where: { id: input.plannedMealId, plan: { childId: child.id } },
        select: { id: true, recipeId: true, foodId: true },
      });
      if (!planned) throw new HttpError(404, "Planned meal not found.");
      if (recipeId && planned.recipeId !== recipeId) {
        throw new HttpError(400, "That recipe is not part of this planned meal.");
      }
      recipeId = planned.recipeId;
      plannedFoodId = planned.foodId;
    }

    let recipeTitle: string | null = null;
    const allowedFoodIds = new Set<string>();
    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { title: true, ingredients: { select: { ingredientId: true } } },
      });
      if (!recipe) throw new HttpError(404, "Recipe not found.");
      recipeTitle = recipe.title;
      const foods = await prisma.food.findMany({
        where: {
          active: true,
          ingredientId: { in: recipe.ingredients.map((row) => row.ingredientId) },
        },
        select: { id: true },
      });
      foods.forEach((food) => allowedFoodIds.add(food.id));
    }
    if (plannedFoodId) allowedFoodIds.add(plannedFoodId);

    const outside = input.foods.find((food) => !allowedFoodIds.has(food.foodId));
    if (outside) throw new HttpError(400, "One or more foods are not part of this meal.");

    const preparation = recipeTitle ? `Cooked in "${recipeTitle}"`.slice(0, 500) : "As planned";
    const entries = await prisma.$transaction(async (transaction) => {
      const created = [];
      for (const food of input.foods) {
        created.push(
          await transaction.foodDiaryEntry.create({
            data: {
              childId: child.id,
              foodId: food.foodId,
              eatenAt,
              preparation,
              texture: "As served",
              amount: input.amount || null,
              notes: input.notes || null,
              recipeId,
              plannedMealId: input.plannedMealId ?? null,
            },
            include: { food: { select: { id: true, name: true, category: true } } },
          }),
        );
        await transaction.childFoodStatus.upsert({
          where: { childId_foodId: { childId: child.id, foodId: food.foodId } },
          create: { childId: child.id, foodId: food.foodId, status: food.status },
          update: { status: food.status },
        });
      }
      return created;
    });
    return NextResponse.json({ logged: entries.length, entries }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
