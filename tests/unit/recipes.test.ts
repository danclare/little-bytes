import { describe, expect, it } from "vitest";
import { aggregateIngredients, formatQuantity, scaleRecipe } from "@/lib/recipes";

describe("recipe scaling", () => {
  it("scales all ingredients by the serving ratio and keeps their units", () => {
    const result = scaleRecipe(
      [
        { ingredientId: "oats", name: "Oats", quantity: 40, unit: "g" },
        { ingredientId: "egg", name: "Egg", quantity: 0.5, unit: "piece" },
      ],
      2,
      3,
    );

    expect(result.map(({ scaledQuantity, unit }) => [scaledQuantity, unit])).toEqual([
      [60, "g"],
      [0.75, "piece"],
    ]);
  });

  it("supports fractional recipe scaling and rounds quantities explicitly to three decimals", () => {
    const result = scaleRecipe(
      [{ ingredientId: "x", name: "X", quantity: 0.3333, unit: "g" }],
      3,
      1,
    );
    expect(result[0].scaledQuantity).toBe(0.111);
    expect(result[0].formattedQuantity).toBe("0.111");
    expect(formatQuantity(1.5)).toBe("1.5");
  });

  it("rejects invalid servings and negative ingredient quantities", () => {
    expect(() => scaleRecipe([], 0, 1)).toThrow(RangeError);
    expect(() => scaleRecipe([], 2, 1.5)).toThrow(RangeError);
    expect(() =>
      scaleRecipe([{ ingredientId: "x", name: "X", quantity: -1, unit: "g" }], 2, 4),
    ).toThrow(RangeError);
  });
});

describe("shopping ingredient aggregation", () => {
  it("combines only identical ingredients with compatible units and retains every recipe source", () => {
    const result = aggregateIngredients([
      { ingredientId: "tomato", name: "Tomato", quantity: 50, unit: "g", recipeId: "recipe-a" },
      { ingredientId: "tomato", name: "Tomato", quantity: 25, unit: "G", recipeId: "recipe-b" },
      { ingredientId: "tomato", name: "Tomato", quantity: 1, unit: "piece", recipeId: "recipe-c" },
      { ingredientId: "carrot", name: "Carrot", quantity: 50, unit: "g", recipeId: "recipe-a" },
    ]);

    expect(result).toHaveLength(3);
    expect(result.find((item) => item.unit === "g")).toMatchObject({
      ingredientId: "tomato",
      quantity: 75,
      recipeIds: ["recipe-a", "recipe-b"],
    });
    expect(result.find((item) => item.unit === "piece")?.quantity).toBe(1);
  });
});
