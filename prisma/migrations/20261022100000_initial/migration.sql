-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_credentials" (
    "user_id" UUID NOT NULL,
    "password" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_memberships" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "pronouns" TEXT,
    "dietary_notes" TEXT,
    "readiness" BOOLEAN NOT NULL DEFAULT false,
    "photo_object_key" TEXT,
    "photo_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_preferences" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "supported_units" TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "age_guidance" TEXT NOT NULL,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_key" TEXT,
    "preparation_guides" JSONB NOT NULL,
    "hazards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ingredient_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_food_statuses" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_food_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_diary_entries" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "eaten_at" TIMESTAMP(3) NOT NULL,
    "preparation" TEXT NOT NULL,
    "texture" TEXT NOT NULL,
    "amount" TEXT,
    "reaction" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "meal_type" TEXT NOT NULL,
    "suitable_age_months" INTEGER NOT NULL,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "servings" INTEGER NOT NULL,
    "preparation_minutes" INTEGER NOT NULL,
    "cooking_minutes" INTEGER NOT NULL,
    "instructions" TEXT[],
    "image_key" TEXT,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "preparation_note" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_meals" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "day_offset" INTEGER NOT NULL,
    "meal_type" TEXT NOT NULL,

    CONSTRAINT "template_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_meals" (
    "id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" TEXT NOT NULL,
    "recipe_id" UUID,
    "food_id" UUID,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "planned_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "child_id" UUID,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" UUID NOT NULL,
    "shopping_list_id" UUID NOT NULL,
    "ingredient_id" UUID,
    "recipe_id" UUID,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" TEXT,
    "category" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_item_sources" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,

    CONSTRAINT "shopping_list_item_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_attempts" (
    "id" UUID NOT NULL,
    "key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "families_owner_user_id_idx" ON "families"("owner_user_id");

-- CreateIndex
CREATE INDEX "family_memberships_user_id_idx" ON "family_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_memberships_family_id_user_id_key" ON "family_memberships"("family_id", "user_id");

-- CreateIndex
CREATE INDEX "children_family_id_idx" ON "children"("family_id");

-- CreateIndex
CREATE INDEX "child_preferences_child_id_kind_idx" ON "child_preferences"("child_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "child_preferences_child_id_kind_value_key" ON "child_preferences"("child_id", "kind", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_slug_key" ON "ingredients"("slug");

-- CreateIndex
CREATE INDEX "ingredients_category_idx" ON "ingredients"("category");

-- CreateIndex
CREATE UNIQUE INDEX "foods_slug_key" ON "foods"("slug");

-- CreateIndex
CREATE INDEX "foods_category_active_idx" ON "foods"("category", "active");

-- CreateIndex
CREATE INDEX "foods_name_idx" ON "foods"("name");

-- CreateIndex
CREATE INDEX "child_food_statuses_child_id_status_idx" ON "child_food_statuses"("child_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "child_food_statuses_child_id_food_id_key" ON "child_food_statuses"("child_id", "food_id");

-- CreateIndex
CREATE INDEX "food_diary_entries_child_id_eaten_at_idx" ON "food_diary_entries"("child_id", "eaten_at");

-- CreateIndex
CREATE INDEX "food_diary_entries_food_id_idx" ON "food_diary_entries"("food_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_meal_type_suitable_age_months_idx" ON "recipes"("meal_type", "suitable_age_months");

-- CreateIndex
CREATE INDEX "recipes_title_idx" ON "recipes"("title");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_ingredient_id_unit_key" ON "recipe_ingredients"("recipe_id", "ingredient_id", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_templates_slug_key" ON "meal_plan_templates"("slug");

-- CreateIndex
CREATE INDEX "template_meals_recipe_id_idx" ON "template_meals"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_meals_template_id_day_offset_meal_type_key" ON "template_meals"("template_id", "day_offset", "meal_type");

-- CreateIndex
CREATE INDEX "meal_plans_child_id_week_start_idx" ON "meal_plans"("child_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_child_id_week_start_key" ON "meal_plans"("child_id", "week_start");

-- CreateIndex
CREATE INDEX "planned_meals_meal_plan_id_date_meal_type_idx" ON "planned_meals"("meal_plan_id", "date", "meal_type");

-- CreateIndex
CREATE INDEX "planned_meals_recipe_id_idx" ON "planned_meals"("recipe_id");

-- CreateIndex
CREATE INDEX "planned_meals_food_id_idx" ON "planned_meals"("food_id");

-- CreateIndex
CREATE INDEX "shopping_lists_family_id_status_idx" ON "shopping_lists"("family_id", "status");

-- CreateIndex
CREATE INDEX "shopping_list_items_shopping_list_id_checked_idx" ON "shopping_list_items"("shopping_list_id", "checked");

-- CreateIndex
CREATE INDEX "shopping_list_items_ingredient_id_idx" ON "shopping_list_items"("ingredient_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_recipe_id_idx" ON "shopping_list_item_sources"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_item_sources_item_id_recipe_id_key" ON "shopping_list_item_sources"("item_id", "recipe_id");

-- CreateIndex
CREATE INDEX "rate_limit_attempts_key_hash_created_at_idx" ON "rate_limit_attempts"("key_hash", "created_at");

-- AddForeignKey
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_preferences" ADD CONSTRAINT "child_preferences_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_food_statuses" ADD CONSTRAINT "child_food_statuses_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_food_statuses" ADD CONSTRAINT "child_food_statuses_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_meals" ADD CONSTRAINT "template_meals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "meal_plan_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_meals" ADD CONSTRAINT "template_meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "shopping_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
