import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireUser();
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim().slice(0, 100);
    const category = (params.get("category") ?? "").trim().slice(0, 40);
    const foods = await prisma.food.findMany({
      where: {
        active: true,
        ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { description: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: {
        ingredient: { select: { id: true, name: true, category: true, allergens: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });
    return NextResponse.json(foods);
  } catch (error) {
    return jsonError(error);
  }
}
