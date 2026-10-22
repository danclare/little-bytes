import { NextResponse } from "next/server";
import { requireMealPlan } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ planId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { planId } = await context.params;
    const plan = await requireMealPlan(user.id, planId, "write");
    await prisma.mealPlan.delete({ where: { id: plan.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
