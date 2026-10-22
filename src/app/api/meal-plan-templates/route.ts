import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireUser();
    const templates = await prisma.mealPlanTemplate.findMany({
      include: {
        meals: {
          include: {
            recipe: { select: { id: true, title: true, mealType: true, allergens: true } },
          },
          orderBy: [{ dayOffset: "asc" }, { mealType: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    return jsonError(error);
  }
}
