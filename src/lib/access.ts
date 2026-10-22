import "server-only";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { idSchema } from "@/lib/validation";
import { type FamilyPermission, normalizeRole, roleAllows } from "@/lib/roles";

const FORBIDDEN = "Your family role does not allow this change. Ask a family admin for access.";

function assertAllowed(role: string, permission: FamilyPermission) {
  if (!roleAllows(role, permission)) throw new HttpError(403, FORBIDDEN);
}

export async function requireMembership(userId: string, permission: FamilyPermission = "read") {
  const membership = await prisma.familyMembership.findFirst({
    where: { userId },
    include: { family: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) throw new HttpError(409, "Set up your family to continue.");
  assertAllowed(membership.role, permission);
  return { ...membership, role: normalizeRole(membership.role) };
}

export async function requireFamily(userId: string, permission: FamilyPermission = "read") {
  return (await requireMembership(userId, permission)).family;
}

async function roleInFamily(userId: string, familyId: string) {
  const membership = await prisma.familyMembership.findUnique({
    where: { familyId_userId: { familyId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function requireChild(
  userId: string,
  childId: string,
  permission: FamilyPermission = "read",
) {
  if (!idSchema.safeParse(childId).success) throw new HttpError(404, "Child profile not found.");
  const child = await prisma.child.findFirst({
    where: { id: childId, family: { memberships: { some: { userId } } } },
  });
  if (!child) throw new HttpError(404, "Child profile not found.");
  assertAllowed((await roleInFamily(userId, child.familyId)) ?? "", permission);
  return child;
}

export async function requireFamilyResource<T extends { familyId: string }>(
  userId: string,
  resource: T | null,
  permission: FamilyPermission = "read",
): Promise<T> {
  if (!resource) throw new HttpError(404, "This item was not found.");
  const role = await roleInFamily(userId, resource.familyId);
  if (!role) throw new HttpError(404, "This item was not found.");
  assertAllowed(role, permission);
  return resource;
}

export async function requireMealPlan(
  userId: string,
  planId: string,
  permission: FamilyPermission = "read",
) {
  if (!idSchema.safeParse(planId).success) throw new HttpError(404, "Meal plan not found.");
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, child: { family: { memberships: { some: { userId } } } } },
    include: { child: { select: { familyId: true } } },
  });
  if (!plan) throw new HttpError(404, "Meal plan not found.");
  assertAllowed((await roleInFamily(userId, plan.child.familyId)) ?? "", permission);
  const { child: _child, ...rest } = plan;
  void _child;
  return rest;
}

export async function requireShoppingList(
  userId: string,
  listId: string,
  permission: FamilyPermission = "read",
) {
  if (!idSchema.safeParse(listId).success) throw new HttpError(404, "Shopping list not found.");
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, family: { memberships: { some: { userId } } } },
  });
  if (!list) throw new HttpError(404, "Shopping list not found.");
  assertAllowed((await roleInFamily(userId, list.familyId)) ?? "", permission);
  return list;
}
