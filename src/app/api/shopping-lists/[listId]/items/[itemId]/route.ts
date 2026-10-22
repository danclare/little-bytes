import { NextResponse } from "next/server";
import { requireShoppingList } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { shoppingItemInputSchema } from "@/lib/validation";
import { z } from "zod";

type Context = { params: Promise<{ listId: string; itemId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { listId, itemId } = await context.params;
    const list = await requireShoppingList(user.id, listId, "write");
    const body = await readJson(request);
    const checkedInput = z.object({ checked: z.boolean() }).safeParse(body);
    if (checkedInput.success) {
      const updated = await prisma.shoppingListItem.updateMany({
        where: { id: itemId, shoppingListId: list.id },
        data: { checked: checkedInput.data.checked },
      });
      if (!updated.count) throw new HttpError(404, "Shopping item not found.");
      return NextResponse.json({ id: itemId, checked: checkedInput.data.checked });
    }
    const input = shoppingItemInputSchema.partial().parse(body);
    if (
      input.ingredientId &&
      !(await prisma.ingredient.findUnique({
        where: { id: input.ingredientId },
        select: { id: true },
      }))
    ) {
      throw new HttpError(404, "Ingredient not found.");
    }
    if (
      input.recipeId &&
      !(await prisma.recipe.findUnique({ where: { id: input.recipeId }, select: { id: true } }))
    ) {
      throw new HttpError(404, "Recipe not found.");
    }
    const updated = await prisma.shoppingListItem.updateMany({
      where: { id: itemId, shoppingListId: list.id },
      data: input,
    });
    if (!updated.count) throw new HttpError(404, "Shopping item not found.");
    return NextResponse.json({ id: itemId, ...input });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { listId, itemId } = await context.params;
    const list = await requireShoppingList(user.id, listId, "write");
    const deleted = await prisma.shoppingListItem.deleteMany({
      where: { id: itemId, shoppingListId: list.id },
    });
    if (!deleted.count) throw new HttpError(404, "Shopping item not found.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
