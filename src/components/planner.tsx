"use client";

import { FormEvent, useState } from "react";
import { planningBlockReason } from "../lib/dates";
import { mealTitle } from "./today";
import {
  EmptyState,
  SectionTitle,
  addDays,
  api,
  capitalise,
  dateOnly,
  dayLabel,
  mealEmoji,
  mondayOf,
  weekDays,
  type Child,
  type Food,
  type MealPlan,
  type MealPlanTemplate,
  type PlanMeal,
  type PlannedMealSelection,
  type Recipe,
} from "./shared";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

function mealsOn(meals: PlanMeal[], day: string) {
  return meals
    .filter((meal) => String(meal.date).slice(0, 10) === day)
    .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
}

export function PlannerPage({
  child,
  foods,
  weekStart,
  setWeekStart,
  plan,
  preview,
  recipes,
  templates,
  busy,
  canEdit,
  onGenerate,
  onPreviewTemplate,
  onSave,
  onDiscard,
  onMove,
  onReplace,
  onRemove,
  setPreview,
  setFailure,
  setSuccess,
  loadWeek,
  onOpenRecipe,
}: {
  child: Child;
  foods: Food[];
  weekStart: string;
  setWeekStart: (value: string) => void;
  plan: MealPlan | null;
  preview: PlanMeal[];
  recipes: Recipe[];
  templates: MealPlanTemplate[];
  busy: boolean;
  canEdit: boolean;
  onGenerate: () => void;
  onPreviewTemplate: (id: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onMove: (meal: PlanMeal, date: string) => void;
  onReplace: (meal: PlanMeal, selection: PlannedMealSelection) => void;
  onRemove: (meal: PlanMeal) => void;
  setPreview: (meals: PlanMeal[]) => void;
  setFailure: (error: unknown) => void;
  setSuccess: (message: string) => void;
  loadWeek: () => Promise<void>;
  onOpenRecipe: (recipe: Recipe) => void;
}) {
  const [newMeal, setNewMeal] = useState({
    date: "",
    mealType: "breakfast",
    recipeId: "",
    foodId: "",
  });
  const [duplicate, setDuplicate] = useState({ fromDate: "", toDate: "" });
  const [actionBusy, setActionBusy] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [editing, setEditing] = useState(false);
  const days = weekDays(weekStart);
  const today = dateOnly();
  const blockReason = planningBlockReason({
    name: child.name,
    dateOfBirth: new Date(`${String(child.dateOfBirth).slice(0, 10)}T00:00:00.000Z`),
    readiness: child.readiness,
  });
  const selectedMealDate = days.includes(newMeal.date) ? newMeal.date : weekStart;
  const duplicateFromDate = days.includes(duplicate.fromDate) ? duplicate.fromDate : days[0];
  const duplicateToDate = days.includes(duplicate.toDate) ? duplicate.toDate : days[1];
  const planId = plan?.id;
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const weekRange = `${dayLabel(days[0], "short")} – ${dayLabel(days[6], "short")}`;
  const isThisWeek = weekStart === mondayOf();

  async function addMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planId) return;
    setActionBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/meal-plans/${planId}/meals`, {
        method: "POST",
        body: JSON.stringify({
          date: form.get("date"),
          mealType: form.get("mealType"),
          ...(form.get("recipeId") ? { recipeId: form.get("recipeId") } : {}),
          ...(form.get("foodId") ? { foodId: form.get("foodId") } : {}),
          servings: 1,
        }),
      });
      await loadWeek();
      setSuccess("Meal added.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setActionBusy(false);
    }
  }

  async function duplicateDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planId) return;
    setActionBusy(true);
    try {
      await api(`/api/meal-plans/${planId}/duplicate-day`, {
        method: "POST",
        body: JSON.stringify({ fromDate: duplicateFromDate, toDate: duplicateToDate }),
      });
      await loadWeek();
      setSuccess("Day copied.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setActionBusy(false);
    }
  }

  async function reusePreviousPlan() {
    const sourceWeek = addDays(weekStart, -7);
    setActionBusy(true);
    try {
      const source = await api<MealPlan | null>(
        `/api/meal-plans?childId=${child.id}&weekStart=${sourceWeek}`,
      );
      if (!source) throw new Error("There is no saved plan in the previous week to reuse.");
      if (!source.meals.length) throw new Error("The previous week's plan is empty.");
      await api(`/api/meal-plans/${source.id}/reuse`, {
        method: "POST",
        body: JSON.stringify({ weekStart }),
      });
      await loadWeek();
      setSuccess("Last week's meals were copied into this week.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setActionBusy(false);
    }
  }

  function replaceDraft(index: number, recipeId: string) {
    const meal = preview[index];
    const recipe = recipeById.get(recipeId);
    if (!recipe || recipe.mealType !== meal.mealType) {
      setFailure(new Error("Choose a recipe for the same meal type."));
      return;
    }
    const next = [...preview];
    next[index] = { ...meal, recipeId, title: recipe.title, allergens: recipe.allergens };
    setPreview(next);
  }

  function openRecipe(meal: PlanMeal) {
    const recipe = meal.recipeId ? recipeById.get(meal.recipeId) : undefined;
    if (recipe) onOpenRecipe(recipe);
  }

  const startOptions = (
    <>
      <div className="planner-options">
        <div className="option-card option-card-primary">
          <h3>Smart draft</h3>
          <p className="muted">
            Mixes familiar and new foods, avoids exclusions and respects allergen preferences.
          </p>
          <button type="button" className="button" disabled={busy} onClick={onGenerate}>
            {busy ? "Working…" : "Generate a draft"}
          </button>
        </div>
        {!plan && (
          <div className="option-card">
            <h3>Reuse last week</h3>
            <p className="muted">Copy every meal from the previous week&apos;s saved plan.</p>
            <button
              type="button"
              className="button button-secondary"
              disabled={busy || actionBusy}
              onClick={() => void reusePreviousPlan()}
            >
              Reuse previous week
            </button>
          </div>
        )}
      </div>
      <h3 className="templates-title">Or start from a template</h3>
      <div className="template-grid" role="list">
        {templates.map((template) => (
          <article
            role="listitem"
            key={template.id}
            className={`template-card${templateId === template.id ? " is-selected" : ""}`}
          >
            <h4>{template.name}</h4>
            <p className="muted">{template.description}</p>
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={busy}
              aria-label={`Preview ${template.name}`}
              onClick={() => {
                setTemplateId(template.id);
                onPreviewTemplate(template.id);
              }}
            >
              Preview
            </button>
          </article>
        ))}
      </div>
    </>
  );

  return (
    <>
      <SectionTitle
        eyebrow={`${child.name}'s week`}
        title="Weekly planner"
        subtitle="Generate a draft or start from a template, review every meal, then approve it."
      />

      <section className="card card-soft week-toolbar" aria-label="Choose week">
        <button
          type="button"
          className="button button-secondary button-small week-prev"
          aria-label="Previous week"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <span aria-hidden="true">‹</span> Previous<span className="hide-narrow"> week</span>
        </button>
        <div className="week-toolbar-center">
          <label htmlFor="plan-week" className="week-toolbar-label">
            Week starting Monday
          </label>
          <input
            id="plan-week"
            type="date"
            value={weekStart}
            onChange={(event) =>
              event.target.value &&
              setWeekStart(mondayOf(new Date(`${event.target.value}T00:00:00`)))
            }
          />
          <small className="muted">{weekRange}</small>
        </div>
        <div className="week-toolbar-end">
          <button
            type="button"
            className="button button-secondary button-small week-next"
            aria-label="Next week"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Next<span className="hide-narrow"> week</span> <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            className="button button-quiet button-small week-current"
            disabled={isThisWeek}
            onClick={() => setWeekStart(mondayOf())}
          >
            This week
          </button>
        </div>
      </section>

      {blockReason && (
        <p className="notice notice-warning" role="note">
          <strong>Meal ideas are not available yet.</strong> {blockReason}
        </p>
      )}

      {canEdit && !blockReason && !preview.length && !plan && (
        <section className="card" aria-labelledby="start-plan-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">Start planning</p>
              <h2 id="start-plan-title">Create a draft for {weekRange}</h2>
            </div>
          </div>
          {startOptions}
        </section>
      )}

      {!!preview.length && (
        <section className="card draft" aria-labelledby="draft-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                Not saved yet
                {templateId && templates.find((t) => t.id === templateId)
                  ? ` · ${templates.find((t) => t.id === templateId)?.name}`
                  : ""}
              </p>
              <h2 id="draft-title">Review your draft</h2>
            </div>
            <div className="actions">
              <button
                type="button"
                className="button button-quiet button-small"
                disabled={busy}
                onClick={() => {
                  setTemplateId("");
                  onDiscard();
                }}
              >
                Discard
              </button>
              <button type="button" className="button" disabled={busy} onClick={onSave}>
                Approve and save
              </button>
            </div>
          </div>
          <p className="muted">
            Change any meal before approving. Allergens are flagged on each meal.
          </p>
          <div className="day-grid">
            {days.map((day) => {
              const entries = preview
                .map((meal, index) => ({ meal, index }))
                .filter(({ meal }) => String(meal.date).slice(0, 10) === day)
                .sort(
                  (a, b) =>
                    MEAL_ORDER.indexOf(a.meal.mealType) - MEAL_ORDER.indexOf(b.meal.mealType),
                );
              return (
                <section className="day-card" key={day} aria-label={dayLabel(day)}>
                  <h3>{dayLabel(day)}</h3>
                  {!entries.length ? (
                    <p className="muted">No meals.</p>
                  ) : (
                    entries.map(({ meal, index }) => (
                      <div className="draft-meal" key={`${meal.date}-${meal.mealType}`}>
                        <div className="draft-meal-head">
                          <span className="meal-label">
                            <span aria-hidden="true">{mealEmoji(meal.mealType)}</span>{" "}
                            {meal.mealType}
                          </span>
                          {meal.familiarity && <span className="tag">{meal.familiarity}</span>}
                        </div>
                        <label className="sr-only" htmlFor={`draft-${index}`}>
                          Replace {meal.title} ({dayLabel(day)} {meal.mealType})
                        </label>
                        <select
                          id={`draft-${index}`}
                          value={meal.recipeId ?? ""}
                          onChange={(event) => replaceDraft(index, event.target.value)}
                        >
                          {recipes
                            .filter((recipe) => recipe.mealType === meal.mealType)
                            .map((recipe) => (
                              <option key={recipe.id} value={recipe.id}>
                                {recipe.title}
                              </option>
                            ))}
                        </select>
                        {!!meal.allergens?.length && (
                          <small className="allergen-note">
                            Allergens: {meal.allergens.join(", ")}
                          </small>
                        )}
                      </div>
                    ))
                  )}
                </section>
              );
            })}
          </div>
          <div className="actions actions-end">
            <button type="button" className="button" disabled={busy} onClick={onSave}>
              Approve and save
            </button>
          </div>
        </section>
      )}

      {plan && (
        <section className="card saved-plan" aria-labelledby="saved-plan-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">Saved plan · {weekRange}</p>
              <h2 id="saved-plan-title">Meals this week</h2>
            </div>
            {canEdit && (
              <button
                type="button"
                className="button button-secondary button-small"
                aria-pressed={editing}
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "Done editing" : "Edit meals"}
              </button>
            )}
          </div>
          <div className="day-grid" aria-label={`Weekly meals starting ${weekStart}`}>
            {days.map((day) => {
              const entries = mealsOn(plan.meals, day);
              return (
                <section
                  className={`day-card${day === today ? " is-today" : ""}`}
                  key={day}
                  aria-label={dayLabel(day)}
                >
                  <h3>
                    {dayLabel(day)}
                    {day === today && <span className="pill pill-small">Today</span>}
                  </h3>
                  {!entries.length ? (
                    <p className="muted">No meals planned.</p>
                  ) : (
                    entries.map((meal) => (
                      <div className="planned-meal" key={meal.id}>
                        <span className="meal-label">
                          <span aria-hidden="true">{mealEmoji(meal.mealType)}</span> {meal.mealType}
                        </span>
                        {!editing ? (
                          meal.recipeId && recipeById.has(meal.recipeId) ? (
                            <button
                              type="button"
                              className="link-button planned-meal-title"
                              aria-haspopup="dialog"
                              onClick={() => openRecipe(meal)}
                            >
                              {mealTitle(meal)}
                            </button>
                          ) : (
                            <span className="planned-meal-title">{mealTitle(meal)}</span>
                          )
                        ) : (
                          <div className="planned-meal-edit">
                            {meal.mealType === "snack" ? (
                              <select
                                aria-label={`Replace ${meal.food?.name ?? "snack"}`}
                                value={meal.foodId ?? ""}
                                onChange={(event) =>
                                  onReplace(meal, { foodId: event.target.value })
                                }
                              >
                                {foods.map((food) => (
                                  <option key={food.id} value={food.id}>
                                    {food.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                aria-label={`Replace ${mealTitle(meal)}`}
                                value={meal.recipeId ?? ""}
                                onChange={(event) =>
                                  onReplace(meal, { recipeId: event.target.value })
                                }
                              >
                                {recipes
                                  .filter((recipe) => recipe.mealType === meal.mealType)
                                  .map((recipe) => (
                                    <option key={recipe.id} value={recipe.id}>
                                      {recipe.title}
                                    </option>
                                  ))}
                              </select>
                            )}
                            <div className="planned-meal-actions">
                              <select
                                aria-label={`Move ${mealTitle(meal)} to another day`}
                                value={day}
                                onChange={(event) => onMove(meal, event.target.value)}
                              >
                                {days.map((date) => (
                                  <option key={date} value={date}>
                                    Move to {dayLabel(date, "short")}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="button button-danger button-small"
                                onClick={() => onRemove(meal)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </section>
              );
            })}
          </div>
          {canEdit && editing && (
            <div className="grid grid-2 plan-tools">
              <form className="card card-soft form" onSubmit={addMeal}>
                <h3>Add a meal</h3>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="new-meal-date">Day</label>
                    <select
                      id="new-meal-date"
                      name="date"
                      value={selectedMealDate}
                      onChange={(event) =>
                        setNewMeal((current) => ({ ...current, date: event.target.value }))
                      }
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {dayLabel(day)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="new-meal-type">Meal type</label>
                    <select
                      id="new-meal-type"
                      name="mealType"
                      value={newMeal.mealType}
                      onChange={(event) =>
                        setNewMeal((current) => ({
                          ...current,
                          mealType: event.target.value,
                          recipeId: "",
                          foodId: "",
                        }))
                      }
                    >
                      {MEAL_ORDER.map((type) => (
                        <option key={type} value={type}>
                          {capitalise(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {newMeal.mealType === "snack" ? (
                  <div className="field">
                    <label htmlFor="new-meal-food">Food</label>
                    <select
                      id="new-meal-food"
                      name="foodId"
                      required
                      value={newMeal.foodId}
                      onChange={(event) =>
                        setNewMeal((current) => ({ ...current, foodId: event.target.value }))
                      }
                    >
                      <option value="">Choose food</option>
                      {foods.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="new-meal-recipe">Recipe</label>
                    <select
                      id="new-meal-recipe"
                      name="recipeId"
                      required
                      value={newMeal.recipeId}
                      onChange={(event) =>
                        setNewMeal((current) => ({ ...current, recipeId: event.target.value }))
                      }
                    >
                      <option value="">Choose recipe</option>
                      {recipes
                        .filter((recipe) => recipe.mealType === newMeal.mealType)
                        .map((recipe) => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div className="actions">
                  <button className="button button-secondary" disabled={actionBusy}>
                    Add meal
                  </button>
                </div>
              </form>
              <form className="card card-soft form" onSubmit={duplicateDay}>
                <h3>Copy a day</h3>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="copy-from">Copy meals from</label>
                    <select
                      id="copy-from"
                      value={duplicateFromDate}
                      onChange={(event) =>
                        setDuplicate((current) => ({ ...current, fromDate: event.target.value }))
                      }
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {dayLabel(day)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="copy-to">To an empty day</label>
                    <select
                      id="copy-to"
                      value={duplicateToDate}
                      onChange={(event) =>
                        setDuplicate((current) => ({ ...current, toDate: event.target.value }))
                      }
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {dayLabel(day)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="actions">
                  <button className="button button-secondary" disabled={actionBusy}>
                    Duplicate day
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {canEdit && !blockReason && !preview.length && plan && (
        <details className="card start-again">
          <summary>
            <span>
              <span className="eyebrow">Start again</span>
              <strong>Replace this week&rsquo;s plan</strong>
            </span>
          </summary>
          <p className="muted">
            Generate a new draft or preview a template. Approving it will replace the saved plan for{" "}
            {weekRange}.
          </p>
          {startOptions}
        </details>
      )}

      {!plan && !preview.length && (
        <EmptyState
          title="No saved plan for this week"
          text={
            canEdit
              ? blockReason
                ? "Once meal ideas are available you can generate a draft or start from a template."
                : "Generate a draft or preview a template above, then approve it when you are happy."
              : "Nobody has saved a plan for this week yet."
          }
        />
      )}
    </>
  );
}
