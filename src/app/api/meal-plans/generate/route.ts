import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { generateMealPlan } from "@/lib/planning";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { mealPlanInputSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(request, "plan-generation", 10);
    const input = mealPlanInputSchema
      .omit({ accept: true, meals: true })
      .parse(await readJson(request));
    await requireChild(user.id, input.childId, "write");
    const plan = await generateMealPlan(input.childId, input.weekStart, input.mealTypes);
    return NextResponse.json({ ...plan, saved: false });
  } catch (error) {
    return jsonError(error);
  }
}
