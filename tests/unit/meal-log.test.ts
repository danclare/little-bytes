import { describe, expect, it } from "vitest";
import { recipeLogFoods, toLocalInputValue } from "@/lib/meal-log";

describe("recipeLogFoods", () => {
  const foods = [
    { id: "f-carrot", name: "Carrot", category: "vegetable", ingredient: { id: "i-carrot" } },
    { id: "f-pear", name: "Pear", category: "fruit", ingredient: { id: "i-pear" } },
    { id: "f-oat", name: "Oats", category: "grain", ingredient: null },
  ];

  it("maps recipe ingredients to catalogue foods and lists untracked ingredients", () => {
    const result = recipeLogFoods(
      [
        { ingredientId: "i-carrot", ingredient: { name: "carrot" } },
        { ingredientId: "i-cinnamon", ingredient: { name: "cinnamon" } },
        { ingredientId: "i-pear", ingredient: { name: "pear" } },
        { ingredientId: "i-water", ingredient: { name: "water" } },
      ],
      foods,
    );
    expect(result.loggable.map((food) => food.id)).toEqual(["f-carrot", "f-pear"]);
    expect(result.untracked).toEqual(["cinnamon", "water"]);
  });

  it("does not list the same food twice when an ingredient appears in two units", () => {
    const result = recipeLogFoods(
      [
        { ingredientId: "i-carrot", ingredient: { name: "carrot" } },
        { ingredientId: "i-carrot", ingredient: { name: "carrot" } },
      ],
      foods,
    );
    expect(result.loggable).toHaveLength(1);
  });
});

describe("toLocalInputValue", () => {
  it("formats a date for a datetime-local input", () => {
    expect(toLocalInputValue(new Date(2026, 0, 5, 7, 3))).toBe("2026-01-05T07:03");
  });
});
