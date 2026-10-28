import { NextResponse } from "next/server";
import { deletePhoto } from "@/lib/photos";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { childInputSchema } from "@/lib/validation";
import { photosEnabled } from "@/lib/env";

type Context = { params: Promise<{ childId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId);
    const { photoObjectKey, ...profile } = child;
    return NextResponse.json({ ...profile, hasPhoto: photosEnabled() && Boolean(photoObjectKey) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId } = await context.params;
    const existing = await requireChild(user.id, childId, "write");
    const input = childInputSchema.partial().parse(await readJson(request));
    if (Object.keys(input).length === 0)
      throw new HttpError(400, "Add at least one profile change.");
    if (input.dateOfBirth && new Date(`${input.dateOfBirth}T00:00:00.000Z`) > new Date()) {
      throw new HttpError(400, "Date of birth cannot be in the future.");
    }
    const child = await prisma.child.update({
      where: { id: existing.id, familyId: existing.familyId },
      data: {
        ...input,
        ...(input.dateOfBirth
          ? { dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`) }
          : {}),
      },
    });
    const { photoObjectKey, ...profile } = child;
    return NextResponse.json({ ...profile, hasPhoto: photosEnabled() && Boolean(photoObjectKey) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "manage");
    await prisma.child.delete({ where: { id: child.id, familyId: child.familyId } });
    if (child.photoObjectKey && photosEnabled()) await deletePhoto(child.photoObjectKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
