import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { appleSignInConfigured, entraSignInConfigured } from "@/lib/env";
import { normalizeRole } from "@/lib/roles";

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await prisma.familyMembership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        family: {
          include: {
            children: {
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
            },
          },
        },
      },
    });
    return NextResponse.json({
      user,
      family: membership?.family
        ? {
            id: membership.family.id,
            name: membership.family.name,
            role: normalizeRole(membership.role),
            children: membership.family.children.map(({ photoObjectKey, ...child }) => ({
              ...child,
              hasPhoto: Boolean(photoObjectKey),
            })),
          }
        : null,
      appleSignInConfigured: appleSignInConfigured(),
      entraSignInConfigured: entraSignInConfigured(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
