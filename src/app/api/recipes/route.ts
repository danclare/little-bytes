import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().slice(0, 100);
    const mealType = params.get("mealType");
    const recipes = await prisma.recipe.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(mealType && ["breakfast", "lunch", "dinner"].includes(mealType) ? { mealType } : {}),
      },
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: [{ mealType: "asc" }, { title: "asc" }],
      take: 100,
    });
    return NextResponse.json(recipes);
  } catch (error) {
    return jsonError(error);
  }
}
