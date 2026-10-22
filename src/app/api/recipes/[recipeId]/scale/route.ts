import { NextResponse } from "next/server";
import { scaleRecipe } from "@/lib/recipes";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation";
import { z } from "zod";

type Context = { params: Promise<{ recipeId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireUser();
    const { recipeId } = await context.params;
    idSchema.parse(recipeId);
    const targetServings = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(new URL(request.url).searchParams.get("servings"));
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { ingredient: { select: { id: true, name: true } } } } },
    });
    if (!recipe) throw new HttpError(404, "Recipe not found.");
    const scaled = scaleRecipe(
      recipe.ingredients.map((row) => ({
        ingredientId: row.ingredientId,
        name: row.ingredient.name,
        quantity: row.quantity,
        unit: row.unit,
      })),
      recipe.servings,
      targetServings,
    );
    return NextResponse.json({ servings: targetServings, ingredients: scaled });
  } catch (error) {
    return jsonError(error);
  }
}
