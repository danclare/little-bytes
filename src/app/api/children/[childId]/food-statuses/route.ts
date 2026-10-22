import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ childId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId);
    const statuses = await prisma.childFoodStatus.findMany({
      where: { childId: child.id },
      select: { foodId: true, status: true },
    });
    return NextResponse.json(
      Object.fromEntries(statuses.map(({ foodId, status }) => [foodId, status])),
    );
  } catch (error) {
    return jsonError(error);
  }
}
