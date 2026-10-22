import { NextResponse } from "next/server";
import { requireMealPlan } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Context = { params: Promise<{ planId: string }> };
const inputSchema = z.object({ fromDate: z.iso.date(), toDate: z.iso.date() });

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { planId } = await context.params;
    const plan = await requireMealPlan(user.id, planId, "write");
    const input = inputSchema.parse(await readJson(request));
    const from = new Date(`${input.fromDate}T00:00:00.000Z`);
    const to = new Date(`${input.toDate}T00:00:00.000Z`);
    const end = new Date(plan.weekStart);
    end.setUTCDate(end.getUTCDate() + 7);
    if (
      from < plan.weekStart ||
      from >= end ||
      to < plan.weekStart ||
      to >= end ||
      from.getTime() === to.getTime()
    ) {
      throw new HttpError(400, "Choose two different days in this plan's week.");
    }
    const source = await prisma.plannedMeal.findMany({
      where: { mealPlanId: plan.id, date: from },
    });
    if (!source.length) throw new HttpError(404, "There are no meals to copy from that day.");
    const existing = await prisma.plannedMeal.count({ where: { mealPlanId: plan.id, date: to } });
    if (existing)
      throw new HttpError(409, "Remove the destination day's meals before copying another day.");
    await prisma.plannedMeal.createMany({
      data: source.map((meal) => ({
        mealPlanId: plan.id,
        date: to,
        mealType: meal.mealType,
        recipeId: meal.recipeId,
        foodId: meal.foodId,
        servings: meal.servings,
        notes: meal.notes,
      })),
    });
    return NextResponse.json({ copied: source.length }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
