import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { previewMealTemplate } from "@/lib/planning";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { idSchema } from "@/lib/validation";
import { z } from "zod";

type Context = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { templateId } = await context.params;
    idSchema.parse(templateId);
    const input = z
      .object({ childId: idSchema, weekStart: z.iso.date() })
      .parse(await readJson(request));
    await requireChild(user.id, input.childId, "write");
    return NextResponse.json(await previewMealTemplate(input.childId, templateId, input.weekStart));
  } catch (error) {
    return jsonError(error);
  }
}
