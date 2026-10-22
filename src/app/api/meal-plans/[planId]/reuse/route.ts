import { NextResponse } from "next/server";
import { requireMealPlan } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { validatePlanSelections } from "@/lib/planning";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Context = { params: Promise<{ planId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { planId } = await context.params;
    const source = await requireMealPlan(user.id, planId, "write");
    const { weekStart } = z.object({ weekStart: z.iso.date() }).parse(await readJson(request));
    const target = new Date(`${weekStart}T00:00:00.000Z`);
    if (target.getTime() === source.weekStart.getTime())
      throw new HttpError(400, "Choose a different week to reuse this plan.");
    const meals = await prisma.plannedMeal.findMany({ where: { mealPlanId: source.id } });
    await validatePlanSelections(source.childId, meals);
    const existing = await prisma.mealPlan.findUnique({
      where: { childId_weekStart: { childId: source.childId, weekStart: target } },
      select: { id: true },
    });
    if (existing)
      throw new HttpError(
        409,
        "A plan already exists for that week. Remove it before reusing another plan.",
      );
    const copied = await prisma.$transaction(async (transaction) => {
      const plan = await transaction.mealPlan.create({
        data: { childId: source.childId, weekStart: target, status: "approved" },
      });
      await transaction.plannedMeal.createMany({
        data: meals.map((meal) => {
          const dayOffset = Math.round(
            (meal.date.getTime() - source.weekStart.getTime()) / 86_400_000,
          );
          const date = new Date(target);
          date.setUTCDate(date.getUTCDate() + dayOffset);
          return {
            mealPlanId: plan.id,
            date,
            mealType: meal.mealType,
            recipeId: meal.recipeId,
            foodId: meal.foodId,
            servings: meal.servings,
            notes: meal.notes,
          };
        }),
      });
      return transaction.mealPlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: { meals: { include: { recipe: true, food: true } } },
      });
    });
    return NextResponse.json(copied, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
