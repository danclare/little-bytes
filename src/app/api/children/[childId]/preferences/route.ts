import { NextResponse } from "next/server";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { preferenceSchema } from "@/lib/validation";
import { z } from "zod";

type Context = { params: Promise<{ childId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { childId } = await context.params;
    await requireChild(user.id, childId);
    return NextResponse.json(
      await prisma.childPreference.findMany({ where: { childId }, orderBy: { kind: "asc" } }),
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    const input = preferenceSchema.parse(await readJson(request));
    const preference = await prisma.childPreference.upsert({
      where: { childId_kind_value: { childId: child.id, kind: input.kind, value: input.value } },
      create: { childId: child.id, ...input },
      update: {},
    });
    return NextResponse.json(preference, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    const input = z.object({ id: z.uuid() }).parse(await readJson(request));
    const deleted = await prisma.childPreference.deleteMany({
      where: { id: input.id, childId: child.id },
    });
    if (!deleted.count) throw new HttpError(404, "Preference not found.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
