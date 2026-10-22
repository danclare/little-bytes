import { NextResponse } from "next/server";
import { requireShoppingList } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ listId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { listId } = await context.params;
    await requireShoppingList(user.id, listId);
    const list = await prisma.shoppingList.findUniqueOrThrow({
      where: { id: listId },
      include: {
        items: {
          include: {
            ingredient: true,
            sources: { include: { recipe: { select: { id: true, title: true } } } },
          },
        },
      },
    });
    return NextResponse.json(list);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { listId } = await context.params;
    const list = await requireShoppingList(user.id, listId, "write");
    await prisma.shoppingList.delete({ where: { id: list.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
