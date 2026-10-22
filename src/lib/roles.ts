export const FAMILY_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export type FamilyRole = (typeof FAMILY_ROLES)[number];
export const ASSIGNABLE_ROLES = ["admin", "editor", "viewer"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export type FamilyPermission = "read" | "write" | "manage";

const RANK: Record<FamilyRole, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };
const REQUIRED: Record<FamilyPermission, number> = { read: 0, write: 1, manage: 2 };

export function normalizeRole(role: string): FamilyRole {
  return (FAMILY_ROLES as readonly string[]).includes(role) ? (role as FamilyRole) : "viewer";
}

export function roleAllows(role: string, permission: FamilyPermission): boolean {
  return RANK[normalizeRole(role)] >= REQUIRED[permission];
}

/** Owners manage everyone except themselves; admins manage editors and viewers only. */
export function canManageMember(actorRole: string, targetRole: string): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (target === "owner") return false;
  if (actor === "owner") return true;
  return actor === "admin" && RANK[target] < RANK.admin;
}

/** Admins may grant editor/viewer; only the owner may grant admin. */
export function canAssignRole(actorRole: string, role: AssignableRole): boolean {
  const actor = normalizeRole(actorRole);
  if (actor === "owner") return true;
  return actor === "admin" && role !== "admin";
}

export const ROLE_DESCRIPTIONS: Record<FamilyRole, string> = {
  owner: "Full control, including family members and administrators.",
  admin: "Manage children, invitations and editors/viewers, plus everything an editor can do.",
  editor: "Log foods, plan meals, edit child details and manage shopping lists.",
  viewer: "Read-only access to children, diary, plans and shopping lists.",
};
