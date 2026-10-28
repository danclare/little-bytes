import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireFamily } from "@/lib/access";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { childInputSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { photosEnabled } from "@/lib/env";

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
    return NextResponse.json(
      children.map(({ photoObjectKey, ...child }) => ({
        ...child,
        hasPhoto: photosEnabled() && Boolean(photoObjectKey),
      })),
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit(request, "child-create", 10);
    const family = await requireFamily(user.id, "manage");
    const input = childInputSchema.parse(await readJson(request));
    const childCount = await prisma.child.count({ where: { familyId: family.id } });
    if (childCount >= 8)
      return NextResponse.json(
        { error: "A family can have up to eight child profiles." },
        { status: 409 },
      );
    const dob = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    if (dob > new Date())
      return NextResponse.json(
        { error: "Date of birth cannot be in the future." },
        { status: 400 },
      );
    const child = await prisma.child.create({
      data: {
        familyId: family.id,
        name: input.name,
        dateOfBirth: dob,
        pronouns: input.pronouns,
        dietaryNotes: input.dietaryNotes,
        readiness: input.readiness,
      },
    });
    return NextResponse.json(child, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
