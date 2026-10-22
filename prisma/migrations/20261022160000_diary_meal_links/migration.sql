-- Links diary entries to the recipe and planned meal they were logged from (additive, nullable).
-- AlterTable
ALTER TABLE "food_diary_entries" ADD COLUMN     "planned_meal_id" UUID,
ADD COLUMN     "recipe_id" UUID;

-- CreateIndex
CREATE INDEX "food_diary_entries_planned_meal_id_idx" ON "food_diary_entries"("planned_meal_id");

-- CreateIndex
CREATE INDEX "food_diary_entries_recipe_id_idx" ON "food_diary_entries"("recipe_id");

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_planned_meal_id_fkey" FOREIGN KEY ("planned_meal_id") REFERENCES "planned_meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

