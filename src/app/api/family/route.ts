import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireFamily } from "@/lib/access";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { nameSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requireUser();
    const family = await requireFamily(user.id);
    const children = await prisma.child.findMany({
      where: { familyId: family.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        pronouns: true,
        dietaryNotes: true,
        readiness: true,
        photoUpdatedAt: true,
        photoObjectKey: true,
      },
    });
    return NextResponse.json({
      ...family,
      children: children.map(({ photoObjectKey, ...child }) => ({
        ...child,
        hasPhoto: Boolean(photoObjectKey),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { name } = z.object({ name: nameSchema }).parse(await readJson(request));
    const existing = await prisma.familyMembership.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) throw new HttpError(409, "Your family is already set up.");
    const family = await prisma.family.create({
      data: {
        name,
        ownerUserId: user.id,
        memberships: { create: { userId: user.id, role: "owner" } },
      },
    });
    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { name } = z.object({ name: nameSchema }).parse(await readJson(request));
    const family = await requireFamily(user.id, "manage");
    const updated = await prisma.family.updateMany({
      where: { id: family.id, memberships: { some: { userId: user.id } } },
      data: { name },
    });
    if (updated.count !== 1) throw new HttpError(404, "Family not found.");
    return NextResponse.json({ id: family.id, name });
  } catch (error) {
    return jsonError(error);
  }
}
