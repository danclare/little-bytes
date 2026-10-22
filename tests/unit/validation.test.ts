import { describe, expect, it } from "vitest";
import {
  childInputSchema,
  diaryInputSchema,
  mealInputSchema,
  passwordSchema,
} from "@/lib/validation";

describe("server input validation", () => {
  it("requires a long password without silently transforming it", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    const value = "  this is a long password  ";
    expect(passwordSchema.parse(value)).toBe(value);
  });

  it("rejects future child birth dates and excessive free-form notes", () => {
    expect(
      childInputSchema.safeParse({
        name: "Baby",
        dateOfBirth: "2099-01-01",
        readiness: false,
      }).success,
    ).toBe(true);
    expect(
      diaryInputSchema.safeParse({
        foodId: "not-a-uuid",
        preparation: "soft",
        texture: "mash",
        notes: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("requires each meal to identify exactly one persisted food or recipe", () => {
    const common = { date: "2026-10-22", mealType: "lunch" as const };
    expect(
      mealInputSchema.safeParse({ ...common, recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" })
        .success,
    ).toBe(true);
    expect(mealInputSchema.safeParse({ ...common }).success).toBe(false);
    expect(
      mealInputSchema.safeParse({
        ...common,
        recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        foodId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }).success,
    ).toBe(false);
  });
});
