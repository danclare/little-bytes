import { NextResponse } from "next/server";
import { requireMealPlan } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validatePlanSelections } from "@/lib/planning";

type Context = { params: Promise<{ planId: string; mealId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { planId, mealId } = await context.params;
    const plan = await requireMealPlan(user.id, planId, "write");
    const input = z
      .object({
        date: z.iso.date().optional(),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
        recipeId: z.uuid().nullable().optional(),
        foodId: z.uuid().nullable().optional(),
        servings: z.number().int().min(1).max(20).optional(),
        notes: z.string().trim().max(500).nullable().optional(),
      })
      .refine((value) => !(value.recipeId && value.foodId), {
        message: "Choose either a recipe or a food, not both.",
      })
      .parse(await readJson(request));
    const meal = await prisma.plannedMeal.findFirst({ where: { id: mealId, mealPlanId: plan.id } });
    if (!meal) throw new HttpError(404, "Planned meal not found.");
    const date = input.date ? new Date(`${input.date}T00:00:00.000Z`) : meal.date;
    const end = new Date(plan.weekStart);
    end.setUTCDate(end.getUTCDate() + 7);
    if (date < plan.weekStart || date >= end)
      throw new HttpError(400, "Choose a date in this plan's week.");
    let recipeId = meal.recipeId;
    let foodId = meal.foodId;
    if (input.recipeId !== undefined) {
      recipeId = input.recipeId;
      if (input.recipeId) foodId = null;
    }
    if (input.foodId !== undefined) {
      foodId = input.foodId;
      if (input.foodId) recipeId = null;
    }
    if (Boolean(recipeId) === Boolean(foodId))
      throw new HttpError(400, "A planned meal must reference exactly one food or recipe.");
    await validatePlanSelections(plan.childId, [{ recipeId, foodId }]);
    const data = {
      ...(input.date ? { date } : {}),
      ...(input.mealType ? { mealType: input.mealType } : {}),
      ...(input.servings ? { servings: input.servings } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      recipeId,
      foodId,
    };
    if (input.recipeId) {
      const exists = await prisma.recipe.findUnique({
        where: { id: input.recipeId },
        select: { id: true },
      });
      if (!exists) throw new HttpError(404, "Recipe not found.");
    }
    if (input.foodId) {
      const exists = await prisma.food.findUnique({
        where: { id: input.foodId, active: true },
        select: { id: true },
      });
      if (!exists) throw new HttpError(404, "Food not found.");
    }
    const updated = await prisma.plannedMeal.update({
      where: { id: meal.id, mealPlanId: plan.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { planId, mealId } = await context.params;
    const plan = await requireMealPlan(user.id, planId, "write");
    const deleted = await prisma.plannedMeal.deleteMany({
      where: { id: mealId, mealPlanId: plan.id },
    });
    if (!deleted.count) throw new HttpError(404, "Planned meal not found.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
