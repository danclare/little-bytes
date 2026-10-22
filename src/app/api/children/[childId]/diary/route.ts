import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { diaryInputSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

type Context = { params: Promise<{ childId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId);
    const params = new URL(request.url).searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (from) z.iso.datetime().parse(from);
    if (to) z.iso.datetime().parse(to);
    const entries = await prisma.foodDiaryEntry.findMany({
      where: {
        childId: child.id,
        ...(from || to
          ? {
              eatenAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { food: { select: { id: true, name: true, category: true } } },
      orderBy: { eatenAt: "desc" },
      take: 200,
    });
    return NextResponse.json(entries);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(request, "diary-write", 30);
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    const input = diaryInputSchema.parse(await readJson(request));
    const food = await prisma.food.findUnique({
      where: { id: input.foodId },
      select: { id: true },
    });
    if (!food) throw new HttpError(404, "Food not found.");
    const status = input.status ?? "tried";
    const entry = await prisma.$transaction(async (transaction) => {
      const created = await transaction.foodDiaryEntry.create({
        data: {
          childId: child.id,
          foodId: input.foodId,
          eatenAt: input.eatenAt ? new Date(input.eatenAt) : new Date(),
          preparation: input.preparation,
          texture: input.texture,
          amount: input.amount,
          reaction: input.reaction,
          notes: input.notes,
        },
        include: { food: { select: { id: true, name: true } } },
      });
      await transaction.childFoodStatus.upsert({
        where: { childId_foodId: { childId: child.id, foodId: input.foodId } },
        create: { childId: child.id, foodId: input.foodId, status },
        update: { status },
      });
      return created;
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
