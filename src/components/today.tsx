"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FoodCard } from "./foods";
import { MealLogForm } from "./meal-log";
import type { RecipeMode } from "./recipes";
import {
  Modal,
  MEAL_TYPES,
  ageText,
  capitalise,
  dateOnly,
  dayLabel,
  mealEmoji,
  weekDays,
  type Child,
  type DiaryEntry,
  type Food,
  type MealPlan,
  type Page,
  type PlanMeal,
  type Recipe,
} from "./shared";

const MEAL_ORDER = [...MEAL_TYPES, "snack"];

function sortMeals(meals: PlanMeal[]) {
  return [...meals].sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
}

export function mealTitle(meal: PlanMeal) {
  return meal.recipe?.title ?? meal.food?.name ?? meal.title ?? "Planned meal";
}

export function TodayPage({
  child,
  foods,
  diary,
  statuses,
  familiarCount,
  plan,
  recipes,
  canEdit,
  onNavigate,
  onOpenFood,
  onOpenRecipe,
  onLogged,
}: {
  child: Child;
  foods: Food[];
  diary: DiaryEntry[];
  statuses: Record<string, string>;
  familiarCount: number;
  plan: MealPlan | null;
  recipes: Recipe[];
  canEdit: boolean;
  onNavigate: (page: Page) => void;
  onOpenFood: (food: Food) => void;
  onOpenRecipe: (recipe: Recipe, options?: { mode?: RecipeMode; plannedMealId?: string }) => void;
  onLogged: (message: string) => void;
}) {
  const [loggingMeal, setLoggingMeal] = useState<PlanMeal | null>(null);
  const weekStripRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    // On narrow screens the week strip scrolls sideways; bring today into view.
    const strip = weekStripRef.current;
    const current = strip?.querySelector<HTMLElement>(":scope > li.is-today");
    if (strip && current && strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft = Math.max(0, current.offsetLeft - 8);
    }
  }, [plan]);
  const today = dateOnly();
  const meals = plan?.meals ?? [];
  const todaysMeals = sortMeals(meals.filter((meal) => String(meal.date).slice(0, 10) === today));
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const ideas = [
    ...foods.filter((food) => !statuses[food.id] || statuses[food.id] === "not_tried"),
    ...foods.filter((food) => statuses[food.id] && statuses[food.id] !== "not_tried"),
  ].slice(0, 4);
  const lastEntry = diary[0];
  const loggedMealIds = new Set(
    diary.map((entry) => entry.plannedMealId).filter((id): id is string => Boolean(id)),
  );

  function openMeal(meal: PlanMeal, mode: RecipeMode = "overview") {
    const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
    if (recipe) return onOpenRecipe(recipe, { mode, plannedMealId: meal.id });
    const food = meal.foodId ? foodById.get(meal.foodId) : undefined;
    if (!food) return;
    if (mode === "log") setLoggingMeal(meal);
    else onOpenFood(food);
  }

  const loggingFood = loggingMeal?.foodId ? foodById.get(loggingMeal.foodId) : undefined;

  return (
    <>
      <section className="hero">
        <div className="hero-child">
          <div className="avatar avatar-large" aria-hidden="true">
            {child.hasPhoto ? (
              <Image
                src={`/api/children/${child.id}/photo?v=${encodeURIComponent(child.photoUpdatedAt ?? "")}`}
                alt=""
                width={96}
                height={96}
                unoptimized
              />
            ) : (
              child.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <p className="eyebrow">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1>{child.name}&apos;s day</h1>
            <p className="muted">
              {ageText(child.dateOfBirth)} ·{" "}
              {child.readiness ? "Readiness confirmed" : "Readiness not yet confirmed"}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="hero-actions">
            <button type="button" className="button" onClick={() => onNavigate("diary")}>
              <span aria-hidden="true">♡</span> Log a food
            </button>
          </div>
        )}
      </section>

      <section className="card today-meals" aria-labelledby="today-meals-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">From your saved plan</p>
            <h2 id="today-meals-title">Today&apos;s meals</h2>
          </div>
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => onNavigate("planner")}
          >
            Open planner
          </button>
        </div>
        {!plan ? (
          <div className="empty-inline">
            <p>No meal plan is saved for this week yet.</p>
            {canEdit && (
              <button type="button" className="button" onClick={() => onNavigate("planner")}>
                Plan this week
              </button>
            )}
          </div>
        ) : !todaysMeals.length ? (
          <p className="muted">Nothing planned for today. Check the week below or add a meal.</p>
        ) : (
          <ul className="meal-cards">
            {todaysMeals.map((meal) => {
              const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
              const logged = Boolean(meal.id && loggedMealIds.has(meal.id));
              const title = mealTitle(meal);
              return (
                <li
                  key={meal.id ?? `${meal.mealType}-${meal.recipeId ?? meal.foodId}`}
                  className={`meal-tile${logged ? " is-logged" : ""}`}
                >
                  <button
                    type="button"
                    className="meal-card"
                    onClick={() => openMeal(meal)}
                    aria-haspopup="dialog"
                    aria-label={`${capitalise(meal.mealType)}: ${mealTitle(meal)}. ${recipe ? "View recipe" : "View food guide"}`}
                  >
                    <span className="meal-card-icon" aria-hidden="true">
                      {mealEmoji(meal.mealType)}
                    </span>
                    <span className="meal-card-body">
                      <span className="eyebrow">{meal.mealType}</span>
                      <strong>{mealTitle(meal)}</strong>
                      {recipe && (
                        <small className="muted">
                          {recipe.preparationMinutes + recipe.cookingMinutes} min ·{" "}
                          {recipe.ingredients.length} ingredients
                        </small>
                      )}
                    </span>
                    <span className="card-link" aria-hidden="true">
                      {recipe ? "View recipe →" : "View food →"}
                    </span>
                  </button>
                  {(recipe || logged || canEdit) && (
                    <div className="meal-tile-actions">
                      {recipe && recipe.instructions.length > 0 && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          aria-label={`Cook ${title}`}
                          onClick={() => openMeal(meal, "cook")}
                        >
                          <span aria-hidden="true">👩‍🍳</span> Cook
                        </button>
                      )}
                      {logged ? (
                        <span className="logged-badge">
                          <span aria-hidden="true">✓</span> Logged
                        </span>
                      ) : (
                        canEdit &&
                        meal.id && (
                          <button
                            type="button"
                            className="button button-small"
                            aria-label={`Log ${title} for ${child.name}`}
                            onClick={() => openMeal(meal, "log")}
                          >
                            <span aria-hidden="true">✓</span> Log it
                          </button>
                        )
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {plan && (
        <section className="card week-glance" aria-labelledby="week-glance-title">
          <h2 id="week-glance-title">This week at a glance</h2>
          <ol className="week-strip" ref={weekStripRef}>
            {weekDays(plan.weekStart.slice(0, 10)).map((day) => {
              const entries = sortMeals(
                meals.filter((meal) => String(meal.date).slice(0, 10) === day),
              );
              return (
                <li key={day} className={day === today ? "is-today" : undefined}>
                  <span className="week-strip-day">
                    {dayLabel(day, "short")}
                    {day === today && <span className="sr-only"> (today)</span>}
                  </span>
                  {entries.length ? (
                    <ul>
                      {entries.map((meal) => (
                        <li key={meal.id ?? `${day}-${meal.mealType}`}>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => openMeal(meal)}
                          >
                            <span aria-hidden="true">{mealEmoji(meal.mealType)} </span>
                            <span className="sr-only">{meal.mealType}: </span>
                            {mealTitle(meal)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <small className="muted">No meals</small>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="grid grid-3 stats">
        <div className="stat">
          <strong>{diary.length}</strong>
          <span>food moments logged</span>
        </div>
        <div className="stat">
          <strong>{familiarCount}</strong>
          <span>familiar foods</span>
        </div>
        <div className="stat">
          <strong>{lastEntry ? lastEntry.food.name : "—"}</strong>
          <span>
            {lastEntry
              ? `last logged ${new Date(lastEntry.eatenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
              : "nothing logged yet"}
          </span>
        </div>
      </div>

      <section className="section-head">
        <div>
          <p className="eyebrow">Something new to try</p>
          <h2>Little food ideas</h2>
        </div>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => onNavigate("foods")}
        >
          All foods
        </button>
      </section>
      <div className="grid grid-4">
        {ideas.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            status={statuses[food.id] ?? ""}
            onSelect={onOpenFood}
          />
        ))}
      </div>

      {loggingMeal?.id && loggingFood && (
        <Modal
          title={loggingFood.name}
          eyebrow={`✓ Log ${loggingMeal.mealType} for ${child.name}`}
          labelledBy="meal-log-title"
          onClose={() => setLoggingMeal(null)}
        >
          <MealLogForm
            child={child}
            sourceTitle={loggingFood.name}
            plannedMealId={loggingMeal.id}
            loggable={[
              { id: loggingFood.id, name: loggingFood.name, category: loggingFood.category },
            ]}
            statuses={statuses}
            onCancel={() => setLoggingMeal(null)}
            onLogged={(message) => {
              setLoggingMeal(null);
              onLogged(message);
            }}
          />
        </Modal>
      )}
    </>
  );
}
