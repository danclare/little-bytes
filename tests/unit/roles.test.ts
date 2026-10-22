import { describe, expect, it } from "vitest";
import { canAssignRole, canManageMember, normalizeRole, roleAllows } from "@/lib/roles";

describe("family roles", () => {
  it("grants permissions by role rank", () => {
    expect(roleAllows("viewer", "read")).toBe(true);
    expect(roleAllows("viewer", "write")).toBe(false);
    expect(roleAllows("editor", "write")).toBe(true);
    expect(roleAllows("editor", "manage")).toBe(false);
    expect(roleAllows("admin", "manage")).toBe(true);
    expect(roleAllows("owner", "manage")).toBe(true);
  });

  it("treats unknown or legacy roles as read-only viewers", () => {
    expect(normalizeRole("superuser")).toBe("viewer");
    expect(normalizeRole("")).toBe("viewer");
    expect(roleAllows("superuser", "write")).toBe(false);
  });

  it("only lets owners manage administrators and nobody manage the owner", () => {
    expect(canManageMember("owner", "admin")).toBe(true);
    expect(canManageMember("owner", "viewer")).toBe(true);
    expect(canManageMember("owner", "owner")).toBe(false);
    expect(canManageMember("admin", "editor")).toBe(true);
    expect(canManageMember("admin", "viewer")).toBe(true);
    expect(canManageMember("admin", "admin")).toBe(false);
    expect(canManageMember("admin", "owner")).toBe(false);
    expect(canManageMember("editor", "viewer")).toBe(false);
    expect(canManageMember("viewer", "viewer")).toBe(false);
  });

  it("only lets the owner grant the admin role", () => {
    expect(canAssignRole("owner", "admin")).toBe(true);
    expect(canAssignRole("admin", "admin")).toBe(false);
    expect(canAssignRole("admin", "editor")).toBe(true);
    expect(canAssignRole("admin", "viewer")).toBe(true);
    expect(canAssignRole("editor", "viewer")).toBe(false);
    expect(canAssignRole("viewer", "viewer")).toBe(false);
  });
});
