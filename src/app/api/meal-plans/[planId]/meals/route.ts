import { NextResponse } from "next/server";
import { requireMealPlan } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { mealInputSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { validatePlanSelections } from "@/lib/planning";

type Context = { params: Promise<{ planId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { planId } = await context.params;
    const plan = await requireMealPlan(user.id, planId, "write");
    const input = mealInputSchema.parse(await readJson(request));
    const date = new Date(`${input.date}T00:00:00.000Z`);
    const end = new Date(plan.weekStart);
    end.setUTCDate(end.getUTCDate() + 7);
    if (date < plan.weekStart || date >= end)
      throw new HttpError(400, "Choose a date in this plan's week.");
    await validatePlanSelections(plan.childId, [
      { recipeId: input.recipeId, foodId: input.foodId },
    ]);
    const meal = await prisma.plannedMeal.create({
      data: {
        mealPlanId: plan.id,
        date,
        mealType: input.mealType,
        recipeId: input.recipeId,
        foodId: input.foodId,
        servings: input.servings,
        notes: input.notes,
      },
    });
    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
