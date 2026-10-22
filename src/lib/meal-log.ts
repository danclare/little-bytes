export type LoggableFood = { id: string; name: string; category: string };

type IngredientRow = { ingredientId: string; ingredient: { name: string } };
type CatalogueFood = LoggableFood & { ingredient?: { id: string } | null };

/**
 * Splits a recipe's ingredients into catalogue foods that can be logged to the diary and
 * ingredients (e.g. spices or water) that have no catalogue entry and are not tracked.
 */
export function recipeLogFoods(ingredients: IngredientRow[], foods: CatalogueFood[]) {
  const foodByIngredient = new Map<string, CatalogueFood>();
  for (const food of foods) {
    if (food.ingredient?.id && !foodByIngredient.has(food.ingredient.id)) {
      foodByIngredient.set(food.ingredient.id, food);
    }
  }
  const loggable: LoggableFood[] = [];
  const untracked: string[] = [];
  const seen = new Set<string>();
  for (const row of ingredients) {
    const food = foodByIngredient.get(row.ingredientId);
    if (!food) {
      if (!untracked.includes(row.ingredient.name)) untracked.push(row.ingredient.name);
      continue;
    }
    if (seen.has(food.id)) continue;
    seen.add(food.id);
    loggable.push({ id: food.id, name: food.name, category: food.category });
  }
  return { loggable, untracked };
}

/** Formats a Date for a datetime-local input in the user's local time zone. */
export function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
