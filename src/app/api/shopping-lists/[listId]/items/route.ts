import { NextResponse } from "next/server";
import { requireShoppingList } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { shoppingItemInputSchema } from "@/lib/validation";

type Context = { params: Promise<{ listId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { listId } = await context.params;
    const list = await requireShoppingList(user.id, listId, "write");
    const input = shoppingItemInputSchema.parse(await readJson(request));
    let category = input.category;
    if (
      input.recipeId &&
      !(await prisma.recipe.findUnique({ where: { id: input.recipeId }, select: { id: true } }))
    ) {
      throw new HttpError(404, "Recipe not found.");
    }
    if (input.ingredientId) {
      const ingredient = await prisma.ingredient.findUnique({ where: { id: input.ingredientId } });
      if (!ingredient) throw new HttpError(404, "Ingredient not found.");
      category ??= ingredient.category;
    }
    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: list.id,
        label: input.label,
        ingredientId: input.ingredientId,
        recipeId: input.recipeId,
        quantity: input.quantity,
        unit: input.unit,
        category,
      },
    });
    if (input.recipeId)
      await prisma.shoppingListItemSource.create({
        data: { itemId: item.id, recipeId: input.recipeId },
      });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
