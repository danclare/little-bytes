import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation";

type Context = { params: Promise<{ recipeId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireUser();
    const { recipeId } = await context.params;
    idSchema.parse(recipeId);
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!recipe) throw new HttpError(404, "Recipe not found.");
    return NextResponse.json(recipe);
  } catch (error) {
    return jsonError(error);
  }
}
