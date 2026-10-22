import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation";
import { z } from "zod";

type Context = { params: Promise<{ childId: string; foodId: string }> };
const statusSchema = z.enum(["not_tried", "tried", "liked", "disliked", "temporarily_avoided"]);

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { childId, foodId } = await context.params;
    await requireChild(user.id, childId);
    idSchema.parse(foodId);
    const status = await prisma.childFoodStatus.findUnique({
      where: { childId_foodId: { childId, foodId } },
    });
    return NextResponse.json(status);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId, foodId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    idSchema.parse(foodId);
    const { status } = z.object({ status: statusSchema }).parse(await readJson(request));
    const food = await prisma.food.findUnique({ where: { id: foodId }, select: { id: true } });
    if (!food) throw new HttpError(404, "Food not found.");
    const result = await prisma.childFoodStatus.upsert({
      where: { childId_foodId: { childId: child.id, foodId } },
      create: { childId: child.id, foodId, status },
      update: { status },
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
