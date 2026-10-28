"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { roleAllows } from "@/lib/roles";
import { DiaryHistory } from "@/components/diary";
import { FamilyMembers, INVITE_STORAGE_KEY, InvitationPanel } from "@/components/family";
import { FoodDetailModal, FoodsPage } from "@/components/foods";
import { PlannerPage } from "@/components/planner";
import { ReadinessChecklist } from "@/components/readiness";
import { RecipeDetailModal, RecipesPage, type RecipeMode } from "@/components/recipes";
import {
  Brand,
  EmptyState,
  Field,
  ReadOnlyNotice,
  SectionTitle,
  ageText,
  api,
  capitalise,
  dateOnly,
  errorText,
  mondayOf,
  type AppSession,
  type Child,
  type DiaryEntry,
  type Food,
  type ListItem,
  type MealPlan,
  type MealPlanTemplate,
  type Page,
  type PlanMeal,
  type PlannedMealSelection,
  type Recipe,
  type ShoppingList,
} from "@/components/shared";
import { TodayPage } from "@/components/today";

const ACTIVE_CHILD_KEY = "little-bites-active-child";

const pageItems: Array<{ id: Page; icon: string; label: string }> = [
  { id: "today", icon: "☀", label: "Today" },
  { id: "foods", icon: "✿", label: "Foods" },
  { id: "diary", icon: "♡", label: "Diary" },
  { id: "recipes", icon: "♨", label: "Recipes" },
  { id: "planner", icon: "▦", label: "Plan" },
  { id: "shopping", icon: "✓", label: "Shop" },
  { id: "profile", icon: "☻", label: "Profile" },
];

const SIGN_IN_ERRORS: Record<string, string> = {
  "apple:unavailable":
    "Apple sign-in could not be completed. Try another sign-in method or contact support.",
  "entra:unavailable":
    "Microsoft sign-in could not be completed. Try again or use another sign-in method.",
  "entra:unverified":
    "Your Microsoft account did not provide a verified email address. Use another sign-in method.",
};

function rememberedChild(session: AppSession) {
  const remembered = window.localStorage.getItem(ACTIVE_CHILD_KEY) ?? "";
  const childId = session.family?.children.some((child) => child.id === remembered)
    ? remembered
    : (session.family?.children[0]?.id ?? "");
  if (childId) window.localStorage.setItem(ACTIVE_CHILD_KEY, childId);
  return childId;
}

function Messages({ error, message }: { error: string; message: string }) {
  if (!error && !message) return null;
  return error ? (
    <p role="alert" className="error-message">
      {error}
    </p>
  ) : (
    <p role="status" className="success-message">
      {message}
    </p>
  );
}

function ChildAvatar({ child, size = 64 }: { child: Child; size?: number }) {
  return child.hasPhoto ? (
    <Image
      src={`/api/children/${child.id}/photo?v=${encodeURIComponent(child.photoUpdatedAt ?? "")}`}
      alt=""
      width={size}
      height={size}
      unoptimized
    />
  ) : (
    <>{child.name.slice(0, 1).toUpperCase()}</>
  );
}

export default function HomePage() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [appleConfigured, setAppleConfigured] = useState(false);
  const [entraConfigured, setEntraConfigured] = useState(false);
  const [page, setPage] = useState<Page>("today");
  const [activeChildId, setActiveChildId] = useState("");
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [todayPlan, setTodayPlan] = useState<MealPlan | null>(null);
  const [preview, setPreview] = useState<PlanMeal[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeOptions, setRecipeOptions] = useState<{
    mode?: RecipeMode;
    plannedMealId?: string;
  }>({});
  const [prefilledFoodId, setPrefilledFoodId] = useState("");
  const [foodSearch, setFoodSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [weekStart, setWeekStart] = useState(mondayOf());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeChild =
    session?.family?.children.find((child) => child.id === activeChildId) ??
    session?.family?.children[0] ??
    null;
  const role = session?.family?.role ?? "viewer";
  const canEdit = roleAllows(role, "write");
  const canManage = roleAllows(role, "manage");

  const setFailure = useCallback((caught: unknown) => {
    setError(errorText(caught));
    setMessage("");
  }, []);
  const setSuccess = useCallback((text: string) => {
    setMessage(text);
    setError("");
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const navigate = useCallback((next: Page) => {
    setPage(next);
    setSelectedFood(null);
    setSelectedRecipe(null);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0 });
  }, []);

  const openRecipe = useCallback(
    (recipe: Recipe, options: { mode?: RecipeMode; plannedMealId?: string } = {}) => {
      setRecipeOptions(options);
      setSelectedRecipe(recipe);
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    const next = await api<AppSession>("/api/auth/session");
    setSession(next);
    setActiveChildId(rememberedChild(next));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const invite = hash.get("invite");
    let changed = false;
    if (invite) {
      window.sessionStorage.setItem(INVITE_STORAGE_KEY, invite);
      url.hash = "";
      changed = true;
    }
    for (const provider of ["apple", "entra"]) {
      const value = url.searchParams.get(provider);
      if (value) {
        const text = SIGN_IN_ERRORS[`${provider}:${value}`];
        if (text) queueMicrotask(() => setError(text));
        url.searchParams.delete(provider);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    api<{ configured: boolean }>("/api/auth/apple/status")
      .then((result) => setAppleConfigured(result.configured))
      .catch(() => setAppleConfigured(false));
    api<{ configured: boolean }>("/api/auth/entra/status")
      .then((result) => setEntraConfigured(result.configured))
      .catch(() => setEntraConfigured(false));
    api<AppSession>("/api/auth/session")
      .then((next) => {
        setSession(next);
        setActiveChildId(rememberedChild(next));
      })
      .catch(() => setSession(null))
      .finally(() => setInitializing(false));
  }, []);

  const loadCatalogue = useCallback(async () => {
    const [foods, recipeList] = await Promise.all([
      api<Food[]>("/api/foods"),
      api<Recipe[]>("/api/recipes"),
    ]);
    setAllFoods(foods);
    setRecipes(recipeList);
  }, []);

  const loadFoodResults = useCallback(async (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    setFoodResults(await api<Food[]>(`/api/foods?${params.toString()}`));
  }, []);

  const loadChildData = useCallback(async () => {
    if (!activeChild) return;
    const [entries, childStatuses] = await Promise.all([
      api<DiaryEntry[]>(`/api/children/${activeChild.id}/diary`),
      api<Record<string, string>>(`/api/children/${activeChild.id}/food-statuses`),
    ]);
    setDiary(entries);
    setStatuses(childStatuses);
  }, [activeChild]);

  const onMealLogged = useCallback(
    (text: string) => {
      setSuccess(text);
      void loadChildData().catch(setFailure);
    },
    [loadChildData, setFailure, setSuccess],
  );

  const loadToday = useCallback(async () => {
    if (!activeChild) return;
    setTodayPlan(
      await api<MealPlan | null>(
        `/api/meal-plans?childId=${activeChild.id}&weekStart=${mondayOf()}`,
      ),
    );
  }, [activeChild]);

  const loadWeek = useCallback(async () => {
    if (!activeChild) return;
    const [currentPlan, lists, availableTemplates] = await Promise.all([
      api<MealPlan | null>(`/api/meal-plans?childId=${activeChild.id}&weekStart=${weekStart}`),
      api<ShoppingList[]>("/api/shopping-lists"),
      api<MealPlanTemplate[]>("/api/meal-plan-templates"),
    ]);
    setPlan(currentPlan);
    setShoppingLists(lists);
    setTemplates(availableTemplates);
    if (weekStart === mondayOf()) setTodayPlan(currentPlan);
  }, [activeChild, weekStart]);

  const hasFamilyChildren = !!session?.family?.children.length;
  useEffect(() => {
    if (!hasFamilyChildren) return;
    queueMicrotask(() => void loadCatalogue().catch(setFailure));
  }, [hasFamilyChildren, loadCatalogue, setFailure]);

  useEffect(() => {
    if (!session || page !== "foods") return;
    const timer = window.setTimeout(() => void loadFoodResults(foodSearch).catch(setFailure), 200);
    return () => window.clearTimeout(timer);
  }, [session, page, foodSearch, loadFoodResults, setFailure]);

  useEffect(() => {
    if (!session || !activeChild) return;
    const timer = window.setTimeout(() => {
      if (["today", "diary", "foods"].includes(page)) void loadChildData().catch(setFailure);
      if (page === "today") void loadToday().catch(setFailure);
      if (page === "planner" || page === "shopping") void loadWeek().catch(setFailure);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [session, page, activeChild, loadChildData, loadToday, loadWeek, setFailure]);

  async function submitAuth(event: FormEvent<HTMLFormElement>, mode: "login" | "register") {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      await refreshSession();
      setPage("today");
      setSuccess(mode === "register" ? "Welcome. Let's set up your family." : "You're signed in.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message: string }>("/api/auth/reset", {
        method: "POST",
        body: JSON.stringify({ email: values.get("email") }),
      });
      setSuccess(result.message);
      return true;
    } catch (caught) {
      setFailure(caught);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function consumePasswordReset(event: FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/auth/reset/consume", {
        method: "POST",
        body: JSON.stringify({ token: values.get("token"), password: values.get("password") }),
      });
      setSuccess("Your password has been updated. Sign in with your new password.");
      return true;
    } catch (caught) {
      setFailure(caught);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const values = new FormData(event.currentTarget);
      await api("/api/family", {
        method: "POST",
        body: JSON.stringify({ name: values.get("name") }),
      });
      await refreshSession();
      setSuccess("Family created. Add a child profile to get started.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function addFirstChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const values = new FormData(event.currentTarget);
      const child = await api<Child>("/api/children", {
        method: "POST",
        body: JSON.stringify({
          name: values.get("name"),
          dateOfBirth: values.get("dateOfBirth"),
          readiness: values.get("readiness") === "on",
        }),
      });
      await refreshSession();
      selectChild(child.id);
      setSuccess("Child profile saved.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  function selectChild(id: string) {
    setActiveChildId(id);
    window.localStorage.setItem(ACTIVE_CHILD_KEY, id);
    setPreview([]);
    setPlan(null);
    setTodayPlan(null);
    setDiary([]);
    setStatuses({});
  }

  async function addDiaryEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeChild) return;
    setBusy(true);
    try {
      const form = event.currentTarget;
      const values = new FormData(form);
      const eatenAt = values.get("eatenAt");
      await api(`/api/children/${activeChild.id}/diary`, {
        method: "POST",
        body: JSON.stringify({
          foodId: values.get("foodId"),
          eatenAt: eatenAt ? new Date(String(eatenAt)).toISOString() : undefined,
          preparation: values.get("preparation"),
          texture: values.get("texture"),
          amount: values.get("amount"),
          reaction: values.get("reaction"),
          notes: values.get("notes"),
          status: values.get("status"),
        }),
      });
      form.reset();
      setPrefilledFoodId("");
      await loadChildData();
      setSuccess("Food moment saved to this child's diary.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function updateFoodStatus(foodId: string, status: string) {
    if (!activeChild) return;
    try {
      await api(`/api/children/${activeChild.id}/foods/${foodId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setStatuses((current) => ({ ...current, [foodId]: status }));
      setSuccess("Food status updated. Diary history stays unchanged.");
    } catch (caught) {
      setFailure(caught);
    }
  }

  async function generatePlan() {
    if (!activeChild) return;
    setBusy(true);
    setError("");
    setPreview([]);
    try {
      const result = await api<{ meals: PlanMeal[] }>("/api/meal-plans/generate", {
        method: "POST",
        body: JSON.stringify({
          childId: activeChild.id,
          weekStart,
          mealTypes: ["breakfast", "lunch", "dinner"],
        }),
      });
      setPreview(result.meals);
      setSuccess("Draft ready. Review and edit every meal before saving.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function savePlan() {
    if (!activeChild || !preview.length) return;
    setBusy(true);
    try {
      const saved = await api<MealPlan>("/api/meal-plans", {
        method: "POST",
        body: JSON.stringify({
          childId: activeChild.id,
          weekStart,
          mealTypes: ["breakfast", "lunch", "dinner"],
          accept: true,
          meals: preview.map(({ date, mealType, recipeId, foodId, servings, notes }) => ({
            date,
            mealType,
            recipeId,
            foodId,
            servings: servings || 1,
            notes,
          })),
        }),
      });
      setPlan(saved);
      if (weekStart === mondayOf()) setTodayPlan(saved);
      setPreview([]);
      setSuccess(
        weekStart === mondayOf()
          ? "Your meal plan is saved. Today's meals now appear on the Today tab."
          : "Your meal plan is saved.",
      );
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function previewTemplate(templateId: string) {
    if (!activeChild) return;
    setBusy(true);
    setError("");
    setPreview([]);
    try {
      const result = await api<{ meals: PlanMeal[] }>(
        `/api/meal-plan-templates/${templateId}/preview`,
        { method: "POST", body: JSON.stringify({ childId: activeChild.id, weekStart }) },
      );
      setPreview(result.meals);
      setSuccess("Template preview ready. Review and edit the meals before approving.");
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function changeMeal(meal: PlanMeal, body: object, text: string) {
    if (!plan || !meal.id) return;
    try {
      await api(`/api/meal-plans/${plan.id}/meals/${meal.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await loadWeek();
      setSuccess(text);
    } catch (caught) {
      setFailure(caught);
    }
  }

  async function removeMeal(meal: PlanMeal) {
    if (!plan || !meal.id || !window.confirm("Remove this planned meal?")) return;
    try {
      await api(`/api/meal-plans/${plan.id}/meals/${meal.id}`, { method: "DELETE" });
      await loadWeek();
      setSuccess("Meal removed.");
    } catch (caught) {
      setFailure(caught);
    }
  }

  async function createShoppingList(event: FormEvent<HTMLFormElement>, fromPlan: boolean) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      const values = new FormData(form);
      await api("/api/shopping-lists", {
        method: "POST",
        body: JSON.stringify({
          name: values.get("name"),
          ...(fromPlan && plan ? { planId: plan.id } : {}),
        }),
      });
      form.reset();
      await loadWeek();
      setSuccess(
        fromPlan && plan
          ? "Shopping list created from your planned recipes."
          : "Empty shopping list created.",
      );
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
      setSession(null);
      setActiveChildId("");
      setPage("today");
      setSuccess("You have signed out.");
      window.localStorage.removeItem(ACTIVE_CHILD_KEY);
    } catch (caught) {
      setFailure(caught);
    }
  }

  const familiarCount = useMemo(
    () => Object.values(statuses).filter((status) => ["tried", "liked"].includes(status)).length,
    [statuses],
  );

  if (initializing) {
    return (
      <main className="auth-wrap">
        <div className="spinner" role="status" aria-label="Loading Little Bites" />
      </main>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        busy={busy}
        error={error}
        message={message}
        appleConfigured={appleConfigured}
        entraConfigured={entraConfigured}
        onSubmit={submitAuth}
        onRequestPasswordReset={requestPasswordReset}
        onConsumePasswordReset={consumePasswordReset}
        clearMessages={() => {
          setError("");
          setMessage("");
        }}
      />
    );
  }

  if (!session.family) {
    return (
      <main className="auth-wrap">
        <section className="auth-card">
          <Brand />
          <p className="eyebrow">A little at a time</p>
          <h1>Welcome, {session.user.name.split(" ")[0]}.</h1>
          <Messages error={error} message={message} />
          <InvitationPanel
            hasFamily={false}
            onAccepted={async (familyName) => {
              await refreshSession();
              setSuccess(`Welcome to ${familyName}.`);
            }}
          />
          <p>
            Start by giving your family a name. Your family information stays private to the people
            you invite.
          </p>
          <form className="form" onSubmit={createFamily}>
            <Field
              label="Family name"
              name="name"
              placeholder="The Clare family"
              required
              maxLength={80}
            />
            <button className="button button-block" disabled={busy}>
              {busy ? "Saving…" : "Create family"}
            </button>
          </form>
          <p className="muted small-print">
            Been invited by someone else? Open the invitation link from their email or message while
            signed in with the invited email address.
          </p>
          <button className="button button-quiet button-block" onClick={() => void signOut()}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  if (!session.family.children.length) {
    return (
      <main className="auth-wrap">
        <section className="auth-card auth-card-wide">
          <Brand />
          <p className="eyebrow">Your family · {session.family.name}</p>
          {canManage ? (
            <OnboardingChild busy={busy} error={error} message={message} onSubmit={addFirstChild} />
          ) : (
            <>
              <h1>No child profiles yet.</h1>
              <p>
                An owner or admin of {session.family.name} needs to add a child profile before you
                can see anything here.
              </p>
            </>
          )}
          <button className="button button-quiet button-block" onClick={() => void signOut()}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  const family = session.family;
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <div className="top-actions">
            <div className="child-switcher">
              <label className="sr-only" htmlFor="active-child">
                Switch child
              </label>
              <select
                id="active-child"
                value={activeChild?.id ?? ""}
                onChange={(event) => selectChild(event.target.value)}
              >
                {family.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
            {activeChild && (
              <button
                type="button"
                className="avatar"
                aria-label={`${activeChild.name}'s profile`}
                onClick={() => navigate("profile")}
              >
                <ChildAvatar child={activeChild} />
              </button>
            )}
          </div>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Main navigation">
        <div className="nav-inner">
          {pageItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className="nav-button"
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <span aria-hidden="true" className="nav-icon">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="content" id="main">
        <div className="toast-region">
          <Messages error={error} message={message} />
        </div>
        {!canEdit && <ReadOnlyNotice />}
        {page === "today" && activeChild && (
          <TodayPage
            child={activeChild}
            foods={allFoods}
            diary={diary}
            statuses={statuses}
            familiarCount={familiarCount}
            plan={todayPlan}
            recipes={recipes}
            canEdit={canEdit}
            onNavigate={navigate}
            onOpenFood={setSelectedFood}
            onOpenRecipe={openRecipe}
            onLogged={onMealLogged}
          />
        )}
        {page === "foods" && (
          <FoodsPage
            foods={foodResults}
            search={foodSearch}
            setSearch={setFoodSearch}
            statuses={statuses}
            onSelect={setSelectedFood}
          />
        )}
        {page === "diary" && activeChild && (
          <DiaryPage
            key={`${activeChild.id}-${prefilledFoodId}`}
            child={activeChild}
            foods={allFoods}
            diary={diary}
            canEdit={canEdit}
            onSubmit={addDiaryEntry}
            prefilledFoodId={prefilledFoodId}
            busy={busy}
          />
        )}
        {page === "recipes" && (
          <RecipesPage
            recipes={recipes.filter((recipe) =>
              `${recipe.title} ${recipe.description}`
                .toLowerCase()
                .includes(recipeSearch.trim().toLowerCase()),
            )}
            search={recipeSearch}
            setSearch={setRecipeSearch}
            onOpen={(recipe) => openRecipe(recipe)}
          />
        )}
        {page === "planner" && activeChild && (
          <PlannerPage
            key={activeChild.id}
            child={activeChild}
            foods={allFoods}
            weekStart={weekStart}
            setWeekStart={(value) => {
              setWeekStart(value);
              setPreview([]);
              setPlan(null);
            }}
            plan={plan}
            preview={preview}
            recipes={recipes}
            templates={templates}
            busy={busy}
            canEdit={canEdit}
            onGenerate={generatePlan}
            onPreviewTemplate={previewTemplate}
            onSave={savePlan}
            onDiscard={() => setPreview([])}
            onMove={(meal, date) => void changeMeal(meal, { date }, "Meal moved.")}
            onReplace={(meal, selection: PlannedMealSelection) =>
              void changeMeal(meal, selection, "Meal replaced.")
            }
            onRemove={removeMeal}
            setPreview={setPreview}
            setFailure={setFailure}
            setSuccess={setSuccess}
            loadWeek={loadWeek}
            onOpenRecipe={(recipe) => openRecipe(recipe)}
          />
        )}
        {page === "shopping" && activeChild && (
          <ShoppingPage
            plan={plan}
            weekStart={weekStart}
            lists={shoppingLists}
            busy={busy}
            canEdit={canEdit}
            onCreate={createShoppingList}
            onReload={loadWeek}
            setFailure={setFailure}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            session={session}
            child={activeChild}
            canEdit={canEdit}
            canManage={canManage}
            onSignOut={signOut}
            onRefresh={refreshSession}
            onSelectChild={selectChild}
            setFailure={setFailure}
            setSuccess={setSuccess}
          />
        )}
        <footer className="safe-footer">
          <strong>Safety comes first.</strong>
          <p className="muted">
            General food information, not medical advice. Stay with your baby while eating. Honey
            should not be given before 12 months. For serious symptoms call 999; for reactions or
            feeding concerns contact a health professional.
          </p>
          <Link href="/docs/food-safety-sources" target="_blank" rel="noreferrer">
            Read food-safety sources
          </Link>
        </footer>
      </main>
      {selectedFood && (
        <FoodDetailModal
          key={selectedFood.id}
          food={selectedFood}
          child={activeChild}
          status={statuses[selectedFood.id]}
          canEdit={canEdit}
          onClose={() => setSelectedFood(null)}
          onStatus={updateFoodStatus}
          onLog={() => {
            setPrefilledFoodId(selectedFood.id);
            setSelectedFood(null);
            setPage("diary");
            setError("");
            setMessage("");
          }}
        />
      )}
      {selectedRecipe && (
        <RecipeDetailModal
          key={`${selectedRecipe.id}-${recipeOptions.plannedMealId ?? ""}-${recipeOptions.mode ?? ""}`}
          recipe={selectedRecipe}
          canEdit={canEdit}
          child={activeChild}
          foods={allFoods}
          statuses={statuses}
          plannedMealId={recipeOptions.plannedMealId}
          initialMode={recipeOptions.mode}
          onLogged={onMealLogged}
          onClose={() => {
            setSelectedRecipe(null);
            setRecipeOptions({});
          }}
          onAdded={() => {
            if (page === "shopping") void loadWeek().catch(setFailure);
          }}
        />
      )}
    </div>
  );
}

function OnboardingChild({
  busy,
  error,
  message,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  return (
    <>
      <h1>Set up your little one.</h1>
      <p>
        Age and readiness help make food guidance more relevant. You only need their name or
        nickname and date of birth to get started.
      </p>
      <Messages error={error} message={message} />
      <form className="form" onSubmit={onSubmit}>
        <Field
          label="Child's name or nickname"
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={setName}
        />
        <Field
          label="Date of birth"
          name="dateOfBirth"
          type="date"
          required
          max={dateOnly()}
          value={dateOfBirth}
          onChange={setDateOfBirth}
        />
        <ReadinessChecklist idPrefix="onboarding" childName={name} dateOfBirth={dateOfBirth} />
        <button className="button button-block" disabled={busy}>
          {busy ? "Saving…" : "Save child profile"}
        </button>
      </form>
    </>
  );
}

function AuthScreen({
  busy,
  error,
  message,
  appleConfigured,
  entraConfigured,
  onSubmit,
  onRequestPasswordReset,
  onConsumePasswordReset,
  clearMessages,
}: {
  busy: boolean;
  error: string;
  message: string;
  appleConfigured: boolean;
  entraConfigured: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>, mode: "login" | "register") => Promise<void>;
  onRequestPasswordReset: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onConsumePasswordReset: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  clearMessages: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register" | "request-reset" | "consume-reset">(
    "login",
  );
  const [resetToken, setResetToken] = useState("");
  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHasInvite(!!window.sessionStorage.getItem(INVITE_STORAGE_KEY));
      const url = new URL(window.location.href);
      const token = new URLSearchParams(url.hash.slice(1)).get("reset");
      if (!token) return;
      setResetToken(token);
      setMode("consume-reset");
      url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    });
  }, []);

  function switchMode(next: typeof mode) {
    clearMessages();
    setMode(next);
  }

  const showProviders =
    (mode === "login" || mode === "register") && (appleConfigured || entraConfigured);

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <Brand />
        <p className="eyebrow">A little at a time</p>
        <h1>
          {mode === "register"
            ? "Start your family's story."
            : mode === "request-reset"
              ? "Request a password reset."
              : mode === "consume-reset"
                ? "Choose a new password."
                : "First foods, made simpler."}
        </h1>
        <p className="muted">
          A calm place to plan, explore and remember the little wins — without the pressure.
        </p>
        {hasInvite && (mode === "login" || mode === "register") && (
          <p className="notice notice-info">
            <strong>You have a family invitation.</strong> Sign in or create an account with the
            email address it was sent to, and you can accept it straight away.
          </p>
        )}
        <Messages error={error} message={message} />
        {mode === "request-reset" ? (
          <form className="form" onSubmit={(event) => void onRequestPasswordReset(event)}>
            <Field
              label="Email address"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
            <button className="button button-block" disabled={busy}>
              {busy ? "Please wait…" : "Send reset link"}
            </button>
            <button
              className="button button-secondary button-block"
              type="button"
              onClick={() => switchMode("login")}
            >
              Back to sign in
            </button>
          </form>
        ) : mode === "consume-reset" ? (
          <form
            className="form"
            onSubmit={(event) =>
              void onConsumePasswordReset(event).then((success) => {
                if (success) {
                  setMode("login");
                  setResetToken("");
                }
              })
            }
          >
            <input type="hidden" name="token" value={resetToken} readOnly />
            <Field
              label="New password"
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              hint="Use at least 12 characters."
            />
            <button className="button button-block" disabled={busy}>
              {busy ? "Please wait…" : "Update password"}
            </button>
            <button
              className="button button-secondary button-block"
              type="button"
              onClick={() => {
                setResetToken("");
                switchMode("login");
              }}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={(event) => void onSubmit(event, mode)}>
            {mode === "register" && (
              <Field label="Your name" name="name" required maxLength={80} autoComplete="name" />
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 12 : undefined}
              maxLength={128}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              hint={
                mode === "register"
                  ? "Use at least 12 characters. Passwords are hashed with Argon2id."
                  : undefined
              }
            />
            <button className="button button-block" disabled={busy}>
              {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}
        {showProviders && (
          <div className="provider-buttons">
            <p className="divider">
              <span>or</span>
            </p>
            {entraConfigured && (
              <a
                className="button button-secondary button-block provider"
                href="/api/auth/entra/start"
              >
                <svg aria-hidden="true" viewBox="0 0 21 21" width="18" height="18">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Continue with Microsoft
              </a>
            )}
            {appleConfigured && (
              <a
                className="button button-secondary button-block provider"
                href="/api/auth/apple/start"
              >
                Continue with Apple
              </a>
            )}
          </div>
        )}
        {(mode === "login" || mode === "register") && (
          <div className="auth-links">
            <button
              type="button"
              className="button button-quiet"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create an account" : "Already have an account? Sign in"}
            </button>
            {mode === "login" && (
              <button
                type="button"
                className="button button-quiet"
                onClick={() => switchMode("request-reset")}
              >
                Forgot your password?
              </button>
            )}
          </div>
        )}
        <div className="notice">
          <strong>Ready when they’re ready.</strong>
          <br />
          Most babies are ready for solids at around six months, when all three readiness signs are
          present.
        </div>
      </section>
    </main>
  );
}

function DiaryPage({
  child,
  foods,
  diary,
  canEdit,
  onSubmit,
  busy,
  prefilledFoodId,
}: {
  child: Child;
  foods: Food[];
  diary: DiaryEntry[];
  canEdit: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  prefilledFoodId: string;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filteredDiary = diary.filter((entry) => {
    const entryDate = entry.eatenAt.slice(0, 10);
    return (!fromDate || entryDate >= fromDate) && (!toDate || entryDate <= toDate);
  });
  return (
    <>
      <SectionTitle
        eyebrow={`${child.name}'s story`}
        title="Food diary"
        subtitle="A food status is a current snapshot. Diary entries stay as a separate history."
      />
      {canEdit && (
        <section className="card">
          <h2>Log a food moment</h2>
          <form className="form" onSubmit={onSubmit}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="diary-food">Food</label>
                <select id="diary-food" name="foodId" required defaultValue={prefilledFoodId}>
                  <option value="" disabled>
                    Choose a food
                  </option>
                  {foods.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.name}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="When" name="eatenAt" type="datetime-local" />
            </div>
            <div className="form-row">
              <Field
                label="Preparation"
                name="preparation"
                required
                placeholder="Steamed florets"
                maxLength={500}
              />
              <Field
                label="Texture"
                name="texture"
                required
                placeholder="Very soft pieces"
                maxLength={120}
              />
            </div>
            <div className="form-row">
              <Field
                label="Amount (optional)"
                name="amount"
                placeholder="A few tastes"
                maxLength={120}
              />
              <div className="field">
                <label htmlFor="diary-status">Current food status</label>
                <select id="diary-status" name="status">
                  <option value="tried">Tried</option>
                  <option value="liked">Liked</option>
                  <option value="disliked">Disliked</option>
                  <option value="temporarily_avoided">Temporarily avoided</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <Field
                label="Observed reaction (optional)"
                name="reaction"
                placeholder="What you observed"
                maxLength={500}
              />
              <Field
                label="Notes (optional)"
                name="notes"
                placeholder="Anything you want to remember"
                maxLength={1000}
              />
            </div>
            <p className="muted small-print">
              Record observations, not diagnoses. Seek professional advice for suspected reactions,
              swallowing concerns, poor growth or medical needs. Severe allergic symptoms need
              emergency help.
            </p>
            <div className="actions">
              <button className="button" disabled={busy}>
                {busy ? "Saving…" : "Save diary entry"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="section-head">
        <div>
          <p className="eyebrow">Keep the little wins</p>
          <h2>Food diary history</h2>
        </div>
      </section>
      <section className="card card-soft toolbar toolbar-dates">
        <Field
          label="From date"
          name="diary-from"
          type="date"
          value={fromDate}
          onChange={setFromDate}
        />
        <Field label="To date" name="diary-to" type="date" value={toDate} onChange={setToDate} />
        {(fromDate || toDate) && (
          <div className="toolbar-action">
            <button
              className="button button-quiet button-small"
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Clear date filters
            </button>
          </div>
        )}
      </section>
      {!diary.length ? (
        <EmptyState
          title="Nothing logged yet"
          text="Your first diary entry will appear here and stay saved to this child's profile."
        />
      ) : !filteredDiary.length ? (
        <EmptyState
          title="No diary entries in this date range"
          text="Change or clear the date filters to see more food moments."
        />
      ) : (
        <DiaryHistory entries={filteredDiary} />
      )}
    </>
  );
}

function ShoppingPage({
  plan,
  weekStart,
  lists,
  busy,
  canEdit,
  onCreate,
  onReload,
  setFailure,
}: {
  plan: MealPlan | null;
  weekStart: string;
  lists: ShoppingList[];
  busy: boolean;
  canEdit: boolean;
  onCreate: (event: FormEvent<HTMLFormElement>, fromPlan: boolean) => void;
  onReload: () => Promise<void>;
  setFailure: (error: unknown) => void;
}) {
  const weekText = new Date(`${weekStart}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await onReload();
    } catch (caught) {
      setFailure(caught);
    }
  }
  async function addItem(event: FormEvent<HTMLFormElement>, listId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await run(async () => {
      await api(`/api/shopping-lists/${listId}/items`, {
        method: "POST",
        body: JSON.stringify({
          label: values.get("label"),
          quantity: values.get("quantity") ? Number(values.get("quantity")) : null,
          unit: values.get("unit") || null,
        }),
      });
      form.reset();
    });
  }
  return (
    <>
      <SectionTitle
        eyebrow="Bring it together"
        title="Shopping lists"
        subtitle="Shared with everyone in your family. Matching ingredients and units are combined."
      />
      {canEdit && (
        <section className="card">
          <h2>New shopping list</h2>
          <p className="muted">
            {plan
              ? `Build a list from the saved plan for the week of ${weekText}, or start an empty list.`
              : `There is no saved plan for the week of ${weekText}. Start an empty list, or add ingredients from any recipe.`}
          </p>
          <form className="form" onSubmit={(event) => onCreate(event, !!plan)}>
            <div className="form-row form-row-action">
              <Field
                label="List name"
                name="name"
                placeholder="This week's groceries"
                required
                maxLength={80}
              />
              <div className="actions">
                <button className="button" disabled={busy}>
                  {busy ? "Creating…" : plan ? "Generate list" : "Create list"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}
      {!lists.length ? (
        <EmptyState
          title="No shopping lists yet"
          text="Create a list from your plan, or open a recipe and add its ingredients."
        />
      ) : (
        <div className="grid grid-2 lists-grid">
          {lists.map((list) => {
            const remaining = list.items.filter((item) => !item.checked).length;
            const items = [...list.items].sort((a, b) => Number(a.checked) - Number(b.checked));
            return (
              <section className="card shopping-card" key={list.id} aria-label={list.name}>
                <div className="section-head">
                  <div>
                    <p className="eyebrow">
                      {list.items.length
                        ? `${remaining} of ${list.items.length} left`
                        : "Empty list"}
                    </p>
                    <h2>{list.name}</h2>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="button button-danger button-small"
                      onClick={() => {
                        if (window.confirm("Delete this shopping list and its items?"))
                          void run(() =>
                            api(`/api/shopping-lists/${list.id}`, { method: "DELETE" }),
                          );
                      }}
                    >
                      Delete list
                    </button>
                  )}
                </div>
                {!items.length ? (
                  <p className="muted">No items yet.</p>
                ) : (
                  <ul className="list shopping-items">
                    {items.map((item: ListItem) => (
                      <li className={`list-item${item.checked ? " is-checked" : ""}`} key={item.id}>
                        <label className="inline-check list-item-main">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            disabled={!canEdit}
                            onChange={() =>
                              void run(() =>
                                api(`/api/shopping-lists/${list.id}/items/${item.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ checked: !item.checked }),
                                }),
                              )
                            }
                          />
                          <span>
                            <span className="item-label">
                              {item.label}
                              {item.quantity != null && (
                                <span className="muted">
                                  {" "}
                                  · {item.quantity} {item.unit ?? ""}
                                </span>
                              )}
                            </span>
                            <small className="muted">
                              {capitalise(item.category ?? "other")}
                              {!!item.sources?.length &&
                                ` · for ${item.sources.map((source) => source.recipe.title).join(", ")}`}
                            </small>
                          </span>
                        </label>
                        {canEdit && (
                          <div className="list-item-actions">
                            <button
                              type="button"
                              className="button button-quiet button-small"
                              aria-label={`Remove ${item.label}`}
                              onClick={() =>
                                void run(() =>
                                  api(`/api/shopping-lists/${list.id}/items/${item.id}`, {
                                    method: "DELETE",
                                  }),
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && (
                  <details className="add-item">
                    <summary>Add an item</summary>
                    <form className="form" onSubmit={(event) => void addItem(event, list.id)}>
                      <Field
                        id={`item-label-${list.id}`}
                        label="Item"
                        name="label"
                        required
                        maxLength={120}
                      />
                      <div className="form-row">
                        <Field
                          id={`item-quantity-${list.id}`}
                          label="Quantity (optional)"
                          name="quantity"
                          type="number"
                          min="0.001"
                        />
                        <Field
                          id={`item-unit-${list.id}`}
                          label="Unit (optional)"
                          name="unit"
                          maxLength={30}
                        />
                      </div>
                      <div className="actions">
                        <button className="button button-secondary">Add item</button>
                      </div>
                    </form>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

type ProfileTab = "children" | "family" | "account";

function ProfilePage({
  session,
  child,
  canEdit,
  canManage,
  onSignOut,
  onRefresh,
  onSelectChild,
  setFailure,
  setSuccess,
}: {
  session: AppSession;
  child: Child | null;
  canEdit: boolean;
  canManage: boolean;
  onSignOut: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectChild: (id: string) => void;
  setFailure: (error: unknown) => void;
  setSuccess: (message: string) => void;
}) {
  const [tab, setTab] = useState<ProfileTab>("children");
  const family = session.family;
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "children", label: "Children" },
    { id: "family", label: "Family" },
    { id: "account", label: "Account" },
  ];
  return (
    <>
      <SectionTitle
        eyebrow={family?.name ?? "Family"}
        title="Profile & settings"
        subtitle="Child details and preferences are private to your family."
        actions={
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
        }
      />
      <div className="segmented" role="tablist" aria-label="Profile sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`profile-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`profile-panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`profile-panel-${tab}`}
        aria-labelledby={`profile-tab-${tab}`}
        className="profile-panel"
      >
        {tab === "children" &&
          (child ? (
            <ChildSettings
              key={child.id}
              session={session}
              child={child}
              canEdit={canEdit}
              canManage={canManage}
              onRefresh={onRefresh}
              onSelectChild={onSelectChild}
              setFailure={setFailure}
              setSuccess={setSuccess}
            />
          ) : (
            <EmptyState title="No child selected" text="Add a child profile to continue." />
          ))}
        {tab === "family" && family && (
          <div className="stack">
            {canManage && (
              <FamilyNameForm
                name={family.name}
                onRefresh={onRefresh}
                setFailure={setFailure}
                setSuccess={setSuccess}
              />
            )}
            <FamilyMembers
              role={family.role}
              setFailure={setFailure}
              setSuccess={setSuccess}
              onLeft={onRefresh}
            />
          </div>
        )}
        {tab === "account" && (
          <section className="card">
            <h2>Your account</h2>
            <dl className="facts">
              <div>
                <dt>Name</dt>
                <dd>{session.user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd className="truncate">{session.user.email}</dd>
              </div>
              <div>
                <dt>Family role</dt>
                <dd>{capitalise(family?.role ?? "none")}</dd>
              </div>
            </dl>
            <p className="muted">
              To change your password, sign out and use “Forgot your password?”.
            </p>
            <div className="actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void onSignOut()}
              >
                Sign out
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function FamilyNameForm({
  name,
  onRefresh,
  setFailure,
  setSuccess,
}: {
  name: string;
  onRefresh: () => Promise<void>;
  setFailure: (error: unknown) => void;
  setSuccess: (message: string) => void;
}) {
  async function updateFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await api("/api/family", {
        method: "PATCH",
        body: JSON.stringify({ name: values.get("family-name") }),
      });
      await onRefresh();
      setSuccess("Family name updated.");
    } catch (caught) {
      setFailure(caught);
    }
  }
  return (
    <section className="card">
      <h2>Family name</h2>
      <form className="form" onSubmit={updateFamily}>
        <div className="form-row form-row-action">
          <Field
            label="Family name"
            name="family-name"
            required
            maxLength={80}
            defaultValue={name}
          />
          <div className="actions">
            <button className="button button-secondary">Save family name</button>
          </div>
        </div>
      </form>
    </section>
  );
}

function ChildSettings({
  session,
  child,
  canEdit,
  canManage,
  onRefresh,
  onSelectChild,
  setFailure,
  setSuccess,
}: {
  session: AppSession;
  child: Child;
  canEdit: boolean;
  canManage: boolean;
  onRefresh: () => Promise<void>;
  onSelectChild: (id: string) => void;
  setFailure: (error: unknown) => void;
  setSuccess: (message: string) => void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [position, setPosition] = useState("center");
  const [uploading, setUploading] = useState(false);
  const [preferences, setPreferences] = useState<
    Array<{ id: string; kind: string; value: string }>
  >([]);
  const [preferenceValue, setPreferenceValue] = useState("");
  const [preferenceKind, setPreferenceKind] = useState("restriction");
  const children = session.family?.children ?? [];

  useEffect(() => {
    api<typeof preferences>(`/api/children/${child.id}/preferences`)
      .then(setPreferences)
      .catch(setFailure);
  }, [child.id, setFailure]);

  function selectPhoto(file?: File) {
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPhoto(null);
      setPreview("");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }
  async function attempt(action: () => Promise<void>) {
    try {
      await action();
    } catch (caught) {
      setFailure(caught);
    }
  }
  async function uploadPhoto() {
    if (!photo) return;
    setUploading(true);
    const data = new FormData();
    data.append("photo", photo);
    data.append("position", position);
    await attempt(async () => {
      await api(`/api/children/${child.id}/photo`, { method: "POST", body: data });
      selectPhoto();
      await onRefresh();
      setSuccess("Private profile photo saved.");
    });
    setUploading(false);
  }
  async function removePhoto() {
    if (!window.confirm("Remove this child's profile photo?")) return;
    await attempt(async () => {
      await api(`/api/children/${child.id}/photo`, { method: "DELETE" });
      await onRefresh();
      setSuccess("Profile photo removed.");
    });
  }
  async function addPreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preferenceValue.trim()) return;
    await attempt(async () => {
      const saved = await api<{ id: string; kind: string; value: string }>(
        `/api/children/${child.id}/preferences`,
        { method: "POST", body: JSON.stringify({ kind: preferenceKind, value: preferenceValue }) },
      );
      setPreferences((items) => [...items.filter((item) => item.id !== saved.id), saved]);
      setPreferenceValue("");
      setSuccess("Preference saved. Meal suggestions will account for it.");
    });
  }
  async function removePreference(id: string) {
    await attempt(async () => {
      await api(`/api/children/${child.id}/preferences`, {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setPreferences((items) => items.filter((item) => item.id !== id));
    });
  }
  async function updateReadiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const readiness = values.get("readiness") === "on";
    await attempt(async () => {
      await api(`/api/children/${child.id}`, {
        method: "PATCH",
        body: JSON.stringify({ readiness }),
      });
      await onRefresh();
      setSuccess(
        readiness
          ? "Readiness confirmed and saved."
          : "Readiness saved as not yet confirmed. Tick all three signs once you have seen them.",
      );
    });
  }
  async function updateChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await attempt(async () => {
      await api(`/api/children/${child.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: values.get("child-name"),
          dateOfBirth: values.get("child-date-of-birth"),
        }),
      });
      await onRefresh();
      setSuccess("Child profile updated.");
    });
  }
  async function deleteChild() {
    if (
      !window.confirm(
        `Remove ${child.name}'s profile and its diary and meal plans? This cannot be undone.`,
      )
    )
      return;
    await attempt(async () => {
      await api(`/api/children/${child.id}`, { method: "DELETE" });
      await onRefresh();
      setSuccess("Child profile removed.");
    });
  }
  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await attempt(async () => {
      const newChild = await api<Child>("/api/children", {
        method: "POST",
        body: JSON.stringify({
          name: values.get("name"),
          dateOfBirth: values.get("dateOfBirth"),
          readiness: false,
        }),
      });
      form.reset();
      await onRefresh();
      onSelectChild(newChild.id);
      setSuccess(
        `${newChild.name}'s profile was created. Confirm their readiness signs below when you have seen them.`,
      );
    });
  }

  return (
    <div className="stack">
      <section className="card children-overview" aria-labelledby="children-title">
        <div className="section-head">
          <h2 id="children-title">Children in {session.family?.name}</h2>
        </div>
        <ul className="child-chips">
          {children.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="child-chip"
                aria-pressed={item.id === child.id}
                onClick={() => onSelectChild(item.id)}
              >
                <span className="avatar avatar-small" aria-hidden="true">
                  <ChildAvatar child={item} size={40} />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>{ageText(item.dateOfBirth)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {canManage && children.length < 8 && (
          <details className="add-child">
            <summary>Add another child</summary>
            <form className="form" onSubmit={addChild}>
              <div className="form-row form-row-action">
                <Field
                  id="new-child-name"
                  label="Name or nickname"
                  name="name"
                  required
                  maxLength={80}
                />
                <Field
                  id="new-child-dob"
                  label="Date of birth"
                  name="dateOfBirth"
                  type="date"
                  required
                  max={dateOnly()}
                />
                <div className="actions">
                  <button className="button button-secondary">Add child</button>
                </div>
              </div>
            </form>
          </details>
        )}
      </section>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="child-details-title">
          <div className="child-header">
            <div className="avatar avatar-large">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview of selected profile photo"
                  width={96}
                  height={96}
                  unoptimized
                  className="photo-preview"
                  style={{ objectPosition: position === "attention" ? "center" : position }}
                />
              ) : (
                <ChildAvatar child={child} size={96} />
              )}
            </div>
            <div>
              <h2 id="child-details-title">{child.name}</h2>
              <p className="muted">{ageText(child.dateOfBirth)}</p>
              {canEdit && session.photosEnabled && (
                <div className="actions">
                  <label className="button button-secondary button-small" htmlFor="profile-photo">
                    {child.hasPhoto ? "Replace photo" : "Choose optional photo"}
                  </label>
                  <input
                    id="profile-photo"
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => selectPhoto(event.target.files?.[0])}
                  />
                  {child.hasPhoto && (
                    <button
                      type="button"
                      className="button button-quiet button-small"
                      onClick={() => void removePhoto()}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              )}
              {!session.photosEnabled && (
                <p className="muted">Profile photos are unavailable on this deployment.</p>
              )}
            </div>
          </div>
          {session.photosEnabled && preview && (
            <div className="card card-soft photo-crop">
              <p>Preview crop and position before saving. JPEG, PNG or WebP up to 8 MB.</p>
              <div className="field">
                <label htmlFor="photo-position">Crop position</label>
                <select
                  id="photo-position"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                >
                  <option value="attention">Auto-select subject</option>
                  <option value="center">Centre</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => void uploadPhoto()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Save photo"}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => selectPhoto()}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {canEdit ? (
            <form className="form" onSubmit={updateChild}>
              <Field
                label="Name or nickname"
                name="child-name"
                required
                maxLength={80}
                defaultValue={child.name}
              />
              <Field
                label="Date of birth"
                name="child-date-of-birth"
                type="date"
                required
                max={dateOnly()}
                defaultValue={String(child.dateOfBirth).slice(0, 10)}
              />
              <div className="actions">
                <button className="button button-secondary">Save profile details</button>
              </div>
            </form>
          ) : (
            <p className="muted">
              Born {new Date(child.dateOfBirth).toLocaleDateString("en-GB", { dateStyle: "long" })}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="readiness-title">
          <h2 id="readiness-title">Readiness</h2>
          {canEdit ? (
            <form className="form" onSubmit={updateReadiness}>
              <ReadinessChecklist
                idPrefix={`readiness-${child.id}`}
                initiallyReady={child.readiness}
                childName={child.name}
                dateOfBirth={String(child.dateOfBirth)}
              />
              <div className="actions">
                <button className="button button-secondary">Save readiness</button>
              </div>
            </form>
          ) : (
            <p>{child.readiness ? "All three readiness signs confirmed." : "Not yet confirmed."}</p>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="preferences-title">
        <h2 id="preferences-title">Food preferences and exclusions</h2>
        <p className="muted">
          Record ingredients to avoid or preferences. These are not allergy diagnoses; tell a health
          professional about suspected reactions.
        </p>
        {canEdit && (
          <form className="form" onSubmit={addPreference}>
            <div className="form-row form-row-action">
              <div className="field">
                <label htmlFor="preference-kind">Type</label>
                <select
                  id="preference-kind"
                  value={preferenceKind}
                  onChange={(event) => setPreferenceKind(event.target.value)}
                >
                  <option value="restriction">Ingredient restriction</option>
                  <option value="allergen_exclusion">Allergen to exclude from suggestions</option>
                  <option value="preference">Preference</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="preference-value">Ingredient or preference</label>
                <input
                  id="preference-value"
                  value={preferenceValue}
                  onChange={(event) => setPreferenceValue(event.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="actions">
                <button className="button button-secondary">Add</button>
              </div>
            </div>
          </form>
        )}
        {preferences.length > 0 ? (
          <ul className="list">
            {preferences.map((item) => (
              <li key={item.id} className="list-item">
                <div className="list-item-main">
                  <strong>{item.value}</strong>
                  <small className="muted">{capitalise(item.kind.replace("_", " "))}</small>
                </div>
                {canEdit && (
                  <div className="list-item-actions">
                    <button
                      type="button"
                      className="button button-quiet button-small"
                      onClick={() => void removePreference(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No preferences recorded.</p>
        )}
      </section>

      {canManage && (
        <section className="card danger-zone" aria-labelledby="danger-title">
          <h2 id="danger-title">Remove {child.name}</h2>
          <p className="muted">
            Permanently deletes this child&apos;s profile, diary, food statuses and meal plans.
          </p>
          <div className="actions">
            <button
              type="button"
              className="button button-danger"
              onClick={() => void deleteChild()}
            >
              Remove {child.name}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
