import { NextResponse } from "next/server";
import { requireFamily, requireMealPlan } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { aggregateIngredients } from "@/lib/recipes";
import { prisma } from "@/lib/prisma";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const family = await requireFamily(user.id);
    const lists = await prisma.shoppingList.findMany({
      where: { familyId: family.id },
      include: {
        items: {
          include: {
            ingredient: true,
            sources: { include: { recipe: { select: { id: true, title: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(lists);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const family = await requireFamily(user.id, "write");
    const input = z
      .object({ name: nameSchema, planId: z.uuid().optional() })
      .parse(await readJson(request));
    let childId: string | null = null;
    let ingredients: Array<{
      ingredientId: string;
      name: string;
      quantity: number;
      unit: string;
      recipeId: string;
    }> = [];
    if (input.planId) {
      const plan = await requireMealPlan(user.id, input.planId, "write");
      const child = await prisma.child.findFirst({
        where: { id: plan.childId, familyId: family.id },
        select: { id: true },
      });
      if (!child) throw new HttpError(404, "Meal plan not found.");
      childId = plan.childId;
      const meals = await prisma.plannedMeal.findMany({
        where: { mealPlanId: plan.id, recipeId: { not: null } },
        include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
      });
      ingredients = meals.flatMap((meal) =>
        meal.recipe!.ingredients.map((row) => ({
          ingredientId: row.ingredientId,
          name: row.ingredient.name,
          quantity: (row.quantity.toNumber() * meal.servings) / meal.recipe!.servings,
          unit: row.unit,
          recipeId: meal.recipe!.id,
        })),
      );
    }
    const aggregates = aggregateIngredients(ingredients);
    const list = await prisma.$transaction(async (transaction) => {
      const created = await transaction.shoppingList.create({
        data: { familyId: family.id, childId, name: input.name },
      });
      for (const item of aggregates) {
        const savedItem = await transaction.shoppingListItem.create({
          data: {
            shoppingListId: created.id,
            ingredientId: item.ingredientId,
            label: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: (
              await transaction.ingredient.findUniqueOrThrow({
                where: { id: item.ingredientId },
                select: { category: true },
              })
            ).category,
          },
        });
        await transaction.shoppingListItemSource.createMany({
          data: item.recipeIds.map((recipeId) => ({ itemId: savedItem.id, recipeId })),
        });
      }
      return transaction.shoppingList.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: {
            include: {
              sources: { include: { recipe: { select: { id: true, title: true } } } },
            },
          },
        },
      });
    });
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
