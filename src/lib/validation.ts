import { z } from "zod";

export const idSchema = z.uuid();
export const nameSchema = z.string().trim().min(1).max(80);
export const emailSchema = z.email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const childInputSchema = z.object({
  name: nameSchema,
  dateOfBirth: z.iso.date(),
  pronouns: z.string().trim().max(40).optional().nullable(),
  dietaryNotes: z.string().trim().max(1000).optional().nullable(),
  readiness: z.boolean().default(false),
});
export const diaryInputSchema = z.object({
  foodId: idSchema,
  eatenAt: z.iso.datetime().optional(),
  preparation: z.string().trim().min(1).max(500),
  texture: z.string().trim().min(1).max(120),
  amount: z.string().trim().max(120).optional().nullable(),
  reaction: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["not_tried", "tried", "liked", "disliked", "temporarily_avoided"]).optional(),
});
export const mealLogSchema = z
  .object({
    recipeId: idSchema.optional(),
    plannedMealId: idSchema.optional(),
    eatenAt: z.iso.datetime().optional(),
    amount: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    foods: z
      .array(z.object({ foodId: idSchema, status: z.enum(["tried", "liked", "disliked"]) }))
      .min(1)
      .max(30)
      .refine((foods) => new Set(foods.map((food) => food.foodId)).size === foods.length, {
        message: "Each food can only be logged once per meal.",
      }),
  })
  .refine((input) => input.recipeId || input.plannedMealId, {
    message: "Choose a recipe or planned meal to log.",
  });
export const preferenceSchema = z.object({
  kind: z.enum(["preference", "restriction", "allergen_exclusion"]),
  value: z.string().trim().min(1).max(100),
});
export const mealPlanInputSchema = z.object({
  childId: idSchema,
  weekStart: z.iso.date(),
  templateId: idSchema.optional(),
  mealTypes: z
    .array(z.enum(["breakfast", "lunch", "dinner", "snack"]))
    .min(1)
    .max(28),
  accept: z.literal(true),
  meals: z
    .array(
      z
        .object({
          date: z.iso.date(),
          mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
          recipeId: idSchema.optional(),
          foodId: idSchema.optional(),
          servings: z.number().int().min(1).max(20).default(1),
          notes: z.string().trim().max(500).optional().nullable(),
        })
        .refine((meal) => Boolean(meal.recipeId) !== Boolean(meal.foodId), {
          message: "Choose exactly one recipe or food.",
        }),
    )
    .min(1)
    .max(28),
});
export const mealInputSchema = z
  .object({
    date: z.iso.date(),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
    recipeId: idSchema.optional(),
    foodId: idSchema.optional(),
    servings: z.number().int().min(1).max(20).default(1),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((meal) => Boolean(meal.recipeId) !== Boolean(meal.foodId), {
    message: "Choose exactly one recipe or food.",
  });
export const shoppingItemInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  ingredientId: idSchema.optional().nullable(),
  quantity: z.number().positive().max(100000).optional().nullable(),
  unit: z.string().trim().max(30).optional().nullable(),
  category: z.string().trim().max(40).optional().nullable(),
  recipeId: idSchema.optional().nullable(),
});
