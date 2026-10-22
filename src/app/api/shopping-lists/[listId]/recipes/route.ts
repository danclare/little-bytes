import { NextResponse } from "next/server";
import { z } from "zod";
import { requireShoppingList } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { scaleRecipe } from "@/lib/recipes";
import { idSchema } from "@/lib/validation";

type Context = { params: Promise<{ listId: string }> };

const inputSchema = z.object({
  recipeId: idSchema,
  servings: z.number().int().min(1).max(100),
  ingredientIds: z.array(idSchema).min(1).max(50),
});

/** Adds selected (scaled) recipe ingredients to a list, merging with matching unchecked items. */
export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { listId } = await context.params;
    const list = await requireShoppingList(user.id, listId, "write");
    const input = inputSchema.parse(await readJson(request));
    const recipe = await prisma.recipe.findUnique({
      where: { id: input.recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!recipe) throw new HttpError(404, "Recipe not found.");
    const wanted = new Set(input.ingredientIds);
    const rows = recipe.ingredients.filter((row) => wanted.has(row.ingredientId));
    if (rows.length !== wanted.size) {
      throw new HttpError(400, "Choose ingredients that belong to this recipe.");
    }
    const scaled = scaleRecipe(
      rows.map((row) => ({
        ingredientId: row.ingredientId,
        name: row.ingredient.name,
        quantity: row.quantity,
        unit: row.unit,
      })),
      recipe.servings,
      input.servings,
    );
    const categories = new Map(rows.map((row) => [row.ingredientId, row.ingredient.category]));

    const result = await prisma.$transaction(async (transaction) => {
      let added = 0;
      let merged = 0;
      for (const item of scaled) {
        const existing = await transaction.shoppingListItem.findFirst({
          where: {
            shoppingListId: list.id,
            ingredientId: item.ingredientId,
            unit: { equals: item.unit.trim(), mode: "insensitive" },
            checked: false,
          },
        });
        let itemId: string;
        if (existing) {
          const current = existing.quantity?.toNumber() ?? 0;
          await transaction.shoppingListItem.update({
            where: { id: existing.id },
            data: { quantity: Math.round((current + item.scaledQuantity) * 1000) / 1000 },
          });
          itemId = existing.id;
          merged += 1;
        } else {
          const created = await transaction.shoppingListItem.create({
            data: {
              shoppingListId: list.id,
              ingredientId: item.ingredientId,
              recipeId: recipe.id,
              label: item.name,
              quantity: item.scaledQuantity,
              unit: item.unit,
              category: categories.get(item.ingredientId) ?? null,
            },
          });
          itemId = created.id;
          added += 1;
        }
        await transaction.shoppingListItemSource.upsert({
          where: { itemId_recipeId: { itemId, recipeId: recipe.id } },
          create: { itemId, recipeId: recipe.id },
          update: {},
        });
      }
      await transaction.shoppingList.update({
        where: { id: list.id },
        data: { updatedAt: new Date() },
      });
      return { added, merged };
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
