"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { recipeLogFoods } from "../lib/meal-log";
import { scaleRecipe } from "../lib/recipes";
import { CookMode, MealLogForm } from "./meal-log";
import {
  EmptyState,
  Modal,
  SectionTitle,
  api,
  capitalise,
  errorText,
  mealEmoji,
  type Child,
  type Food,
  type Recipe,
  type ShoppingList,
} from "./shared";

export type RecipeMode = "overview" | "cook" | "log";

const FILTERS = [
  { id: "", label: "All" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
] as const;

export function totalMinutes(recipe: Pick<Recipe, "preparationMinutes" | "cookingMinutes">) {
  return recipe.preparationMinutes + recipe.cookingMinutes;
}

export function RecipeCard({
  recipe,
  onOpen,
}: {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <button
      type="button"
      className="recipe-card"
      onClick={() => onOpen(recipe)}
      aria-haspopup="dialog"
    >
      <span className="recipe-card-top">
        <span className="pill">
          <span aria-hidden="true">{mealEmoji(recipe.mealType)}</span> {capitalise(recipe.mealType)}
        </span>
        <span className="muted">{totalMinutes(recipe)} min</span>
      </span>
      <strong className="recipe-card-title">{recipe.title}</strong>
      <small className="recipe-card-text">{recipe.description}</small>
      <span className="recipe-card-meta">
        <span>{recipe.ingredients.length} ingredients</span>
        <span>From {recipe.suitableAgeMonths} months</span>
      </span>
      {!!recipe.allergens.length && (
        <span className="tag-list">
          {recipe.allergens.map((allergen) => (
            <span className="tag tag-warning" key={allergen}>
              {allergen}
            </span>
          ))}
        </span>
      )}
      <span className="card-link" aria-hidden="true">
        View recipe →
      </span>
    </button>
  );
}

export function RecipesPage({
  recipes,
  search,
  setSearch,
  onOpen,
}: {
  recipes: Recipe[];
  search: string;
  setSearch: (value: string) => void;
  onOpen: (recipe: Recipe) => void;
}) {
  const [mealType, setMealType] = useState("");
  const shown = mealType ? recipes.filter((recipe) => recipe.mealType === mealType) : recipes;
  return (
    <>
      <SectionTitle
        eyebrow="Made for little appetites"
        title="Recipe library"
        subtitle="Ideas for the whole family. Tap a recipe for the method, scaling and shopping."
      />
      <section className="card card-soft toolbar toolbar-stack">
        <div className="field">
          <label htmlFor="recipe-search">Search recipes</label>
          <input
            id="recipe-search"
            type="search"
            placeholder="Search by recipe name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="chip-row" role="group" aria-label="Filter by meal">
          {FILTERS.map((filter) => (
            <button
              key={filter.id || "all"}
              type="button"
              className="chip"
              aria-pressed={mealType === filter.id}
              onClick={() => setMealType(filter.id)}
            >
              {filter.id && <span aria-hidden="true">{mealEmoji(filter.id)} </span>}
              {filter.label}
            </button>
          ))}
        </div>
      </section>
      <p className="result-count muted" aria-live="polite">
        {shown.length} recipe{shown.length === 1 ? "" : "s"}
        {mealType ? ` for ${mealType}` : ""}
      </p>
      {!shown.length ? (
        <EmptyState title="No recipes found" text="Try a different search or meal filter." />
      ) : (
        <div className="grid grid-3">
          {shown.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onOpen={onOpen} />
          ))}
        </div>
      )}
      <p className="muted small-print">
        Recipes are ideas, not personalised medical or nutrition plans. Check ingredients and
        textures for your child.
      </p>
    </>
  );
}

export function RecipeDetailModal({
  recipe,
  canEdit,
  onClose,
  onAdded,
  child,
  foods = [],
  statuses = {},
  plannedMealId,
  initialMode = "overview",
  onLogged,
}: {
  recipe: Recipe;
  canEdit: boolean;
  onClose: () => void;
  onAdded?: (message: string) => void;
  child?: Child | null;
  foods?: Food[];
  statuses?: Record<string, string>;
  plannedMealId?: string;
  initialMode?: RecipeMode;
  onLogged?: (message: string) => void;
}) {
  const canLog = Boolean(canEdit && child && onLogged);
  const canCook = recipe.instructions.length > 0;
  const [mode, setMode] = useState<RecipeMode>(() =>
    initialMode === "log" && !canLog
      ? "overview"
      : initialMode === "cook" && !canCook
        ? "overview"
        : initialMode,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const dialog = contentRef.current?.closest("dialog");
    if (dialog) dialog.scrollTop = 0;
    contentRef.current?.focus({ preventScroll: true });
  }, [mode]);
  const logFoods = useMemo(() => recipeLogFoods(recipe.ingredients, foods), [recipe, foods]);
  const [servings, setServings] = useState(recipe.servings);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(recipe.ingredients.map((row) => [row.ingredientId, true])),
  );
  const [lists, setLists] = useState<ShoppingList[] | null>(null);
  const [listId, setListId] = useState("");
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const scaled = useMemo(
    () =>
      scaleRecipe(
        recipe.ingredients.map((row) => ({
          ingredientId: row.ingredientId,
          name: row.ingredient.name,
          quantity: row.quantity,
          unit: row.unit,
        })),
        recipe.servings,
        servings,
      ),
    [recipe, servings],
  );

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    api<ShoppingList[]>("/api/shopping-lists")
      .then((loaded) => {
        if (cancelled) return;
        setLists(loaded);
        setListId(loaded[0]?.id ?? "new");
      })
      .catch((caught) => !cancelled && setError(errorText(caught)));
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  const chosen = recipe.ingredients.filter((row) => selected[row.ingredientId]);
  const allSelected = chosen.length === recipe.ingredients.length;

  async function addToList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen.length) {
      setError("Choose at least one ingredient to add.");
      return;
    }
    setBusy(true);
    setError("");
    setResult("");
    try {
      let targetId = listId;
      let targetName = lists?.find((list) => list.id === listId)?.name ?? "";
      if (listId === "new" || !listId) {
        const name = newListName.trim() || `${recipe.title} shopping`;
        const created = await api<ShoppingList>("/api/shopping-lists", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        targetId = created.id;
        targetName = created.name;
        setLists((current) => [created, ...(current ?? [])]);
        setListId(created.id);
        setNewListName("");
      }
      const added = await api<{ added: number; merged: number }>(
        `/api/shopping-lists/${targetId}/recipes`,
        {
          method: "POST",
          body: JSON.stringify({
            recipeId: recipe.id,
            servings,
            ingredientIds: chosen.map((row) => row.ingredientId),
          }),
        },
      );
      const text = `Added ${added.added + added.merged} ingredient${
        added.added + added.merged === 1 ? "" : "s"
      } to “${targetName}”.`;
      setResult(text);
      onAdded?.(text);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  const eyebrow =
    mode === "cook"
      ? "👩‍🍳 Cooking"
      : mode === "log" && child
        ? `✓ Log for ${child.name}`
        : `${mealEmoji(recipe.mealType)} ${capitalise(recipe.mealType)} · ${totalMinutes(recipe)} min`;

  return (
    <Modal
      title={recipe.title}
      eyebrow={eyebrow}
      labelledBy="recipe-detail-title"
      onClose={onClose}
      wide
    >
      <div ref={contentRef} tabIndex={-1} className="recipe-mode" data-mode={mode}>
        {mode === "cook" ? (
          <CookMode
            steps={recipe.instructions}
            servings={servings}
            ingredients={recipe.ingredients.map((row, index) => ({
              key: `${row.ingredientId}-${index}`,
              text: `${scaled[index].formattedQuantity} ${row.unit} ${row.ingredient.name}${
                row.preparationNote ? ` — ${row.preparationNote}` : ""
              }`,
            }))}
            finishLabel={canLog ? "Finished – log it" : "Finished"}
            finishAriaLabel={canLog && child ? `Finished – log it for ${child.name}` : undefined}
            onExit={() => setMode("overview")}
            onFinish={() => (canLog ? setMode("log") : setMode("overview"))}
          />
        ) : mode === "log" && canLog && child && onLogged ? (
          <MealLogForm
            child={child}
            sourceTitle={recipe.title}
            recipeId={recipe.id}
            plannedMealId={plannedMealId}
            loggable={logFoods.loggable}
            untracked={logFoods.untracked}
            statuses={statuses}
            cancelLabel="Back"
            onCancel={() => setMode("overview")}
            onLogged={(message) => {
              onLogged(message);
              onClose();
            }}
          />
        ) : (
          renderOverview()
        )}
      </div>
    </Modal>
  );

  function renderOverview() {
    return (
      <>
        <p>{recipe.description}</p>
        <dl className="facts facts-row">
          <div>
            <dt>Prep</dt>
            <dd>{recipe.preparationMinutes} min</dd>
          </div>
          <div>
            <dt>Cook</dt>
            <dd>{recipe.cookingMinutes} min</dd>
          </div>
          <div>
            <dt>Suitable from</dt>
            <dd>{recipe.suitableAgeMonths} months</dd>
          </div>
          <div>
            <dt>Makes</dt>
            <dd>{recipe.servings} servings</dd>
          </div>
        </dl>
        {!!recipe.allergens.length && (
          <p className="notice notice-warning">
            <strong>Contains allergens:</strong> {recipe.allergens.join(", ")}. Introduce common
            allergens one at a time and seek advice if you have concerns.
          </p>
        )}
        <div className="recipe-detail-grid">
          <section aria-labelledby="recipe-ingredients-title">
            <div className="section-head compact">
              <h3 id="recipe-ingredients-title">Ingredients</h3>
              <div className="stepper" role="group" aria-label="Servings">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Fewer servings"
                  disabled={servings <= 1}
                  onClick={() => setServings((value) => Math.max(1, value - 1))}
                >
                  −
                </button>
                <label className="sr-only" htmlFor="recipe-servings">
                  Servings
                </label>
                <input
                  id="recipe-servings"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={servings}
                  onChange={(event) => {
                    const value = Math.round(Number(event.target.value));
                    if (Number.isFinite(value)) setServings(Math.min(100, Math.max(1, value)));
                  }}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="More servings"
                  disabled={servings >= 100}
                  onClick={() => setServings((value) => Math.min(100, value + 1))}
                >
                  +
                </button>
                <span className="stepper-label" aria-hidden="true">
                  servings
                </span>
              </div>
            </div>
            {canEdit && (
              <div className="select-all">
                <button
                  type="button"
                  className="button button-quiet button-small"
                  onClick={() =>
                    setSelected(
                      Object.fromEntries(
                        recipe.ingredients.map((row) => [row.ingredientId, !allSelected]),
                      ),
                    )
                  }
                >
                  {allSelected ? "Clear selection" : "Select all"}
                </button>
                <small className="muted">Untick anything you already have.</small>
              </div>
            )}
            <ul className="ingredient-list">
              {recipe.ingredients.map((row, index) => {
                const quantity = scaled[index];
                const text = (
                  <>
                    <span className="ingredient-qty">
                      {quantity.formattedQuantity} {row.unit}
                    </span>{" "}
                    <span>
                      {row.ingredient.name}
                      {row.preparationNote && (
                        <small className="muted"> — {row.preparationNote}</small>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={`${row.ingredientId}-${index}`}>
                    {canEdit ? (
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={selected[row.ingredientId] ?? false}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [row.ingredientId]: event.target.checked,
                            }))
                          }
                        />
                        <span>{text}</span>
                      </label>
                    ) : (
                      text
                    )}
                  </li>
                );
              })}
            </ul>
            <small className="muted">
              Quantities scale proportionally; units stay the same. A scaled serving is not a
              recommended baby portion.
            </small>
            {canEdit && (
              <form className="card card-soft add-to-list" onSubmit={addToList}>
                <h4>Add to a shopping list</h4>
                {lists === null && !error ? (
                  <p className="muted">Loading your lists…</p>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="recipe-list">Shopping list</label>
                      <select
                        id="recipe-list"
                        value={listId}
                        onChange={(event) => setListId(event.target.value)}
                      >
                        {(lists ?? []).map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name}
                          </option>
                        ))}
                        <option value="new">+ New list…</option>
                      </select>
                    </div>
                    {listId === "new" && (
                      <div className="field">
                        <label htmlFor="recipe-new-list">New list name</label>
                        <input
                          id="recipe-new-list"
                          maxLength={80}
                          placeholder={`${recipe.title} shopping`}
                          value={newListName}
                          onChange={(event) => setNewListName(event.target.value)}
                        />
                      </div>
                    )}
                    <button className="button" disabled={busy || !chosen.length}>
                      {busy
                        ? "Adding…"
                        : `Add ${chosen.length} selected item${chosen.length === 1 ? "" : "s"}`}
                    </button>
                  </>
                )}
                {error && (
                  <p role="alert" className="error-message">
                    {error}
                  </p>
                )}
                {result && (
                  <p role="status" className="success-message">
                    {result}
                  </p>
                )}
              </form>
            )}
          </section>
          <section aria-labelledby="recipe-method-title">
            <h3 id="recipe-method-title">Method</h3>
            <ol className="method-list">
              {recipe.instructions.map((step, index) => (
                <li key={`${index}-${step}`}>{step}</li>
              ))}
            </ol>
            <p className="notice notice-info">
              Check the texture suits your child, cool food before serving and always stay with your
              baby while they eat.
            </p>
          </section>
        </div>
        {(canCook || canLog) && (
          <div className="sheet-actions recipe-actions">
            {canCook && (
              <button
                type="button"
                className={canLog ? "button button-secondary" : "button"}
                onClick={() => setMode("cook")}
              >
                <span aria-hidden="true">👩‍🍳</span> Start cooking
              </button>
            )}
            {canLog && child && (
              <button
                type="button"
                className="button"
                aria-label={`Log it for ${child.name}`}
                onClick={() => setMode("log")}
              >
                <span aria-hidden="true">✓</span> Log it
              </button>
            )}
          </div>
        )}
      </>
    );
  }
}
