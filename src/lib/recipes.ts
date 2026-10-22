export interface ScalableIngredient {
  ingredientId: string;
  name: string;
  quantity: number | string | { toNumber(): number };
  unit: string;
}

export interface ScaledIngredient extends ScalableIngredient {
  scaledQuantity: number;
  formattedQuantity: string;
}

export function scaleRecipe(
  ingredients: ScalableIngredient[],
  originalServings: number,
  targetServings: number,
): ScaledIngredient[] {
  if (!Number.isFinite(originalServings) || originalServings <= 0) {
    throw new RangeError("Recipe servings must be greater than zero.");
  }
  if (!Number.isInteger(targetServings) || targetServings < 1 || targetServings > 100) {
    throw new RangeError("Target servings must be a whole number from 1 to 100.");
  }
  const factor = targetServings / originalServings;
  return ingredients.map((ingredient) => {
    const quantity =
      typeof ingredient.quantity === "object"
        ? ingredient.quantity.toNumber()
        : Number(ingredient.quantity);
    if (!Number.isFinite(quantity) || quantity < 0)
      throw new RangeError("Ingredient quantity must be non-negative.");
    const scaledQuantity = Math.round(quantity * factor * 1000) / 1000;
    return { ...ingredient, scaledQuantity, formattedQuantity: formatQuantity(scaledQuantity) };
  });
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(value);
}

export interface AggregateIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  recipeIds: string[];
}

export function aggregateIngredients(
  rows: Array<{
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
    recipeId: string;
  }>,
): AggregateIngredient[] {
  const grouped = new Map<string, AggregateIngredient>();
  for (const row of rows) {
    const key = `${row.ingredientId}:${row.unit.trim().toLowerCase()}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + row.quantity) * 1000) / 1000;
      if (!existing.recipeIds.includes(row.recipeId)) existing.recipeIds.push(row.recipeId);
    } else {
      grouped.set(key, {
        ingredientId: row.ingredientId,
        name: row.name,
        quantity: Math.round(row.quantity * 1000) / 1000,
        unit: row.unit,
        recipeIds: [row.recipeId],
      });
    }
  }
  return [...grouped.values()];
}
