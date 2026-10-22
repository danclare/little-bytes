import "server-only";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http";
import { ageInMonths, planningBlockReason } from "@/lib/dates";

export { ageInMonths } from "@/lib/dates";

type RecipeLike = {
  id: string;
  title: string;
  allergens: string[];
  ingredients: Array<{
    ingredientId: string;
    ingredient: { name: string; allergens?: string[]; foods: Array<{ name: string }> };
  }>;
};

function normalizedAllergen(value: string): string {
  const text = value.trim().toLowerCase();
  return (
    (
      {
        eggs: "egg",
        peanuts: "peanut",
        tree_nuts: "tree nut",
        "tree nuts": "tree nut",
        soya: "soya",
      } as Record<string, string>
    )[text] ?? text
  );
}

function childIsReady(child: { name: string; dateOfBirth: Date; readiness: boolean }) {
  const reason = planningBlockReason(child);
  if (reason) throw new HttpError(409, reason);
}

function blockedRecipe(
  recipe: RecipeLike,
  preferences: Array<{ kind: string; value: string }>,
  unavailableFoods: Set<string>,
): boolean {
  const normalizedPreferences = preferences.map((entry) => ({
    kind: entry.kind,
    value: entry.value.trim().toLowerCase(),
  }));
  const exclusions = normalizedPreferences
    .filter((entry) => entry.kind === "allergen_exclusion")
    .map((entry) => normalizedAllergen(entry.value));
  const restrictions = normalizedPreferences
    .filter((entry) => entry.kind === "restriction")
    .map((entry) => entry.value);
  const allergens = [
    ...recipe.allergens,
    ...recipe.ingredients.flatMap((row) => row.ingredient.allergens ?? []),
  ].map(normalizedAllergen);
  if (exclusions.some((excluded) => allergens.includes(excluded))) return true;
  const ingredientNames = recipe.ingredients.flatMap((row) => [
    row.ingredient.name.toLowerCase(),
    ...row.ingredient.foods.map((food) => food.name.toLowerCase()),
  ]);
  if (ingredientNames.some((name) => unavailableFoods.has(name))) return true;
  return restrictions.some((restriction) => {
    const normalizedRestriction = restriction.replaceAll("-", " ");
    return (
      ingredientNames.some((name) => name.includes(normalizedRestriction)) ||
      recipe.title.toLowerCase().includes(normalizedRestriction)
    );
  });
}

function familiarity(recipe: RecipeLike, familiarIngredients: Set<string>): "familiar" | "new" {
  return recipe.ingredients.length > 0 &&
    recipe.ingredients.every((row) => familiarIngredients.has(row.ingredientId))
    ? "familiar"
    : "new";
}

async function childPlanningContext(childId: string) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      preferences: true,
      statuses: { include: { food: { select: { ingredientId: true, name: true } } } },
    },
  });
  if (!child) throw new HttpError(404, "Child profile not found.");
  childIsReady(child);
  const preferences = child.preferences.map((entry) => ({ kind: entry.kind, value: entry.value }));
  const familiarIngredients = new Set(
    child.statuses
      .filter((status) => ["tried", "liked"].includes(status.status))
      .map((status) => status.food.ingredientId)
      .filter((id): id is string => Boolean(id)),
  );
  const unavailableFoods = new Set(
    child.statuses
      .filter((status) => ["disliked", "temporarily_avoided"].includes(status.status))
      .map((status) => status.food.name.toLowerCase()),
  );
  return { child, preferences, familiarIngredients, unavailableFoods };
}

const recipeInclude = {
  ingredients: { include: { ingredient: { include: { foods: { select: { name: true } } } } } },
} as const;

export async function validatePlanSelections(
  childId: string,
  selections: Array<{ recipeId?: string | null; foodId?: string | null }>,
): Promise<void> {
  const { child, preferences, unavailableFoods } = await childPlanningContext(childId);
  const recipeIds = [
    ...new Set(selections.flatMap((entry) => (entry.recipeId ? [entry.recipeId] : []))),
  ];
  const foodIds = [...new Set(selections.flatMap((entry) => (entry.foodId ? [entry.foodId] : [])))];
  const [recipes, foods] = await Promise.all([
    prisma.recipe.findMany({ where: { id: { in: recipeIds } }, include: recipeInclude }),
    prisma.food.findMany({
      where: { id: { in: foodIds }, active: true },
      include: { ingredient: true },
    }),
  ]);
  if (recipes.length !== recipeIds.length || foods.length !== foodIds.length) {
    throw new HttpError(400, "A selected food or recipe is no longer available.");
  }
  for (const recipe of recipes) {
    if (blockedRecipe(recipe, preferences, unavailableFoods)) {
      throw new HttpError(
        400,
        "One or more meals conflict with this child's saved exclusions or food status.",
      );
    }
  }
  const normalized = preferences.map((entry) => ({
    kind: entry.kind,
    value: entry.value.trim().toLowerCase(),
  }));
  for (const food of foods) {
    const allergens = [...food.allergens, ...(food.ingredient?.allergens ?? [])].map(
      normalizedAllergen,
    );
    const excluded = normalized.some(
      (item) =>
        item.kind === "allergen_exclusion" && allergens.includes(normalizedAllergen(item.value)),
    );
    const restricted = normalized.some(
      (item) =>
        item.kind === "restriction" &&
        food.name.toLowerCase().includes(item.value.replaceAll("-", " ")),
    );
    if (excluded || restricted || unavailableFoods.has(food.name.toLowerCase())) {
      throw new HttpError(
        400,
        "One or more meals conflict with this child's saved exclusions or food status.",
      );
    }
  }
  void child;
}

export async function generateMealPlan(childId: string, weekStart: string, mealTypes: string[]) {
  const { child, preferences, familiarIngredients, unavailableFoods } =
    await childPlanningContext(childId);
  const months = ageInMonths(child.dateOfBirth);
  const recipes = await prisma.recipe.findMany({
    include: recipeInclude,
    orderBy: { slug: "asc" },
  });
  const safeRecipes = recipes.filter(
    (recipe) => !blockedRecipe(recipe, preferences, unavailableFoods),
  );
  const preferred = preferences
    .filter((entry) => entry.kind === "preference")
    .map((entry) => entry.value.toLowerCase());
  safeRecipes.sort((left, right) => {
    const score = (recipe: typeof left) => {
      const searchable =
        `${recipe.title} ${recipe.description} ${recipe.ingredients.map((row) => row.ingredient.name).join(" ")}`.toLowerCase();
      return preferred.filter((value) => searchable.includes(value)).length;
    };
    return score(right) - score(left) || left.slug.localeCompare(right.slug);
  });
  if (safeRecipes.length === 0)
    throw new HttpError(
      409,
      "No recipes match the saved exclusions. Adjust them before generating ideas.",
    );

  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const meals: Array<{
    date: string;
    mealType: string;
    recipeId: string;
    title: string;
    servings: number;
    familiarity: "familiar" | "new";
    allergens: string[];
    notes: string;
  }> = [];
  const sortedTypes = [...new Set(mealTypes)];
  for (let day = 0; day < 7; day += 1) {
    for (const mealType of sortedTypes) {
      const candidates = safeRecipes.filter((recipe) => recipe.mealType === mealType);
      if (!candidates.length) continue;
      const used = new Set(meals.map((meal) => meal.recipeId));
      const available = candidates.filter((recipe) => !used.has(recipe.id));
      const pool = available.length ? available : candidates;
      const offset = (day * sortedTypes.length + sortedTypes.indexOf(mealType)) % pool.length;
      const recipe = pool[offset];
      const ingredientIds = recipe.ingredients.map((row) => row.ingredientId);
      const isFamiliar =
        ingredientIds.length > 0 && ingredientIds.every((id) => familiarIngredients.has(id));
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + day);
      meals.push({
        date: date.toISOString().slice(0, 10),
        mealType,
        recipeId: recipe.id,
        title: recipe.title,
        servings: 1,
        familiarity: isFamiliar ? "familiar" : "new",
        allergens: recipe.allergens,
        notes: `Offer an age-appropriate texture and supervise every meal. ${isFamiliar ? "Familiar ingredients." : "Includes ingredients that may be new to this child."}`,
      });
    }
  }
  return { childId, weekStart, ageInMonths: months, meals };
}

export async function previewMealTemplate(childId: string, templateId: string, weekStart: string) {
  const { child, preferences, familiarIngredients, unavailableFoods } =
    await childPlanningContext(childId);
  const template = await prisma.mealPlanTemplate.findUnique({
    where: { id: templateId },
    include: {
      meals: {
        include: { recipe: { include: recipeInclude } },
        orderBy: [{ dayOffset: "asc" }, { mealType: "asc" }],
      },
    },
  });
  if (!template) throw new HttpError(404, "Meal-plan template not found.");
  const recipes = await prisma.recipe.findMany({
    include: recipeInclude,
    orderBy: { slug: "asc" },
  });
  const allowed = recipes.filter((recipe) => !blockedRecipe(recipe, preferences, unavailableFoods));
  const week = new Date(`${weekStart}T00:00:00.000Z`);
  const used = new Set<string>();
  const meals = template.meals.map((entry) => {
    const originalAllowed = !blockedRecipe(entry.recipe, preferences, unavailableFoods);
    const candidates = allowed.filter(
      (recipe) => recipe.mealType === entry.mealType && !used.has(recipe.id),
    );
    const recipe =
      originalAllowed && !used.has(entry.recipe.id)
        ? entry.recipe
        : (candidates.find((candidate) => candidate.mealType === entry.mealType) ??
          allowed.find((candidate) => candidate.mealType === entry.mealType));
    if (!recipe)
      throw new HttpError(
        409,
        "This template has a meal that cannot be safely replaced for the saved exclusions.",
      );
    used.add(recipe.id);
    const date = new Date(week);
    date.setUTCDate(week.getUTCDate() + entry.dayOffset);
    return {
      date: date.toISOString().slice(0, 10),
      mealType: entry.mealType,
      recipeId: recipe.id,
      title: recipe.title,
      servings: 1,
      familiarity: familiarity(recipe, familiarIngredients),
      allergens: recipe.allergens,
      notes: "Template idea; offer an age-appropriate texture and supervise every meal.",
      replacedForRestrictions: !originalAllowed,
    };
  });
  return { childId, weekStart, ageInMonths: ageInMonths(child.dateOfBirth), meals };
}
