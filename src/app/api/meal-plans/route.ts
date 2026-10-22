import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { mealPlanInputSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { validatePlanSelections } from "@/lib/planning";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const childId = params.get("childId") ?? "";
    const weekStart = params.get("weekStart") ?? "";
    const child = await requireChild(user.id, childId);
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    if (!Number.isFinite(start.getTime())) throw new HttpError(400, "Choose a valid week.");
    const plan = await prisma.mealPlan.findUnique({
      where: { childId_weekStart: { childId: child.id, weekStart: start } },
      include: {
        meals: {
          include: { recipe: true, food: true },
          orderBy: [{ date: "asc" }, { mealType: "asc" }],
        },
      },
    });
    return NextResponse.json(plan);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = mealPlanInputSchema.parse(await readJson(request));
    const child = await requireChild(user.id, input.childId, "write");
    const start = new Date(`${input.weekStart}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    if (
      input.meals.some((meal) => {
        const date = new Date(`${meal.date}T00:00:00.000Z`);
        return date < start || date >= end;
      })
    )
      throw new HttpError(400, "Every meal must fall within the selected week.");
    await validatePlanSelections(child.id, input.meals);
    const plan = await prisma.$transaction(async (transaction) => {
      const savedPlan = await transaction.mealPlan.upsert({
        where: { childId_weekStart: { childId: child.id, weekStart: start } },
        create: { childId: child.id, weekStart: start, status: "approved" },
        update: { status: "approved" },
      });
      await transaction.plannedMeal.deleteMany({ where: { mealPlanId: savedPlan.id } });
      await transaction.plannedMeal.createMany({
        data: input.meals.map((meal) => ({
          mealPlanId: savedPlan.id,
          date: new Date(`${meal.date}T00:00:00.000Z`),
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          foodId: meal.foodId,
          servings: meal.servings,
          notes: meal.notes,
        })),
      });
      return transaction.mealPlan.findUniqueOrThrow({
        where: { id: savedPlan.id },
        include: { meals: { include: { recipe: true, food: true } } },
      });
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
