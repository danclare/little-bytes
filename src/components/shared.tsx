"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { FamilyRole } from "../lib/roles";

export type { FamilyRole };
export type Child = {
  id: string;
  name: string;
  dateOfBirth: string;
  pronouns?: string | null;
  dietaryNotes?: string | null;
  readiness: boolean;
  photoUpdatedAt?: string | null;
  hasPhoto?: boolean;
};
export type Family = { id: string; name: string; role: FamilyRole; children: Child[] };
export type User = { id: string; email: string; name: string };
export type Food = {
  id: string;
  name: string;
  description: string;
  category: string;
  ageGuidance: string;
  allergens: string[];
  hazards: string[];
  preparationGuides: Record<string, { title: string; instructions: string; hazards: string[] }>;
  ingredient?: { id: string; name: string; category: string; allergens: string[] } | null;
};
export type RecipeIngredient = {
  ingredientId: string;
  quantity: string | number;
  unit: string;
  preparationNote?: string | null;
  ingredient: { id: string; name: string; allergens: string[]; category?: string };
};
export type Recipe = {
  id: string;
  title: string;
  description: string;
  mealType: string;
  suitableAgeMonths: number;
  allergens: string[];
  servings: number;
  preparationMinutes: number;
  cookingMinutes: number;
  instructions: string[];
  ingredients: RecipeIngredient[];
  source?: string;
};
export type DiaryEntry = {
  id: string;
  eatenAt: string;
  preparation: string;
  texture: string;
  amount?: string | null;
  reaction?: string | null;
  notes?: string | null;
  recipeId?: string | null;
  plannedMealId?: string | null;
  food: { id: string; name: string };
};
export type PlanMeal = {
  id?: string;
  date: string;
  mealType: string;
  recipeId?: string | null;
  foodId?: string | null;
  servings: number;
  notes?: string | null;
  recipe?: Partial<Recipe> | null;
  food?: Partial<Food> | null;
  title?: string;
  familiarity?: string;
  allergens?: string[];
};
export type PlannedMealSelection =
  | { recipeId: string; foodId?: never }
  | { foodId: string; recipeId?: never };
export type MealPlan = { id: string; weekStart: string; meals: PlanMeal[] };
export type ListItem = {
  id: string;
  label: string;
  quantity?: string | number | null;
  unit?: string | null;
  checked: boolean;
  category?: string | null;
  sources?: Array<{ recipe: { id?: string; title: string } }>;
};
export type ShoppingList = { id: string; name: string; items: ListItem[] };
export type MealPlanTemplate = { id: string; name: string; description: string };
export type AppSession = {
  user: User;
  family: Family | null;
  appleSignInConfigured: boolean;
  entraSignInConfigured: boolean;
  photosEnabled: boolean;
};
export type Page = "today" | "foods" | "diary" | "recipes" | "planner" | "shopping" | "profile";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

export const READINESS_SIGNS = [
  {
    id: "sits",
    label: "Sits up and holds their head steady",
    detail: "They can stay in a sitting position with good head and neck control.",
  },
  {
    id: "coordinates",
    label: "Coordinates eyes, hands and mouth",
    detail: "They can look at food, pick it up and bring it to their mouth by themselves.",
  },
  {
    id: "swallows",
    label: "Swallows food rather than pushing it out",
    detail: "They swallow food instead of pushing it back out with their tongue.",
  },
] as const;

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    if (!response.ok) throw new Error("Something went wrong. Please try again.");
  }
  if (!response.ok)
    throw new Error(
      typeof body.error === "string" ? body.error : "Something went wrong. Please try again.",
    );
  return body as T;
}

export function dateOnly(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function mondayOf(date = new Date()): string {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return dateOnly(day);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function dayLabel(isoDate: string, format: "long" | "short" = "long"): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: format,
    day: "numeric",
    month: "short",
  });
}

export function ageText(dateString: string): string {
  const birth = new Date(dateString);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  return months < 0
    ? "Age not available"
    : months < 24
      ? `${months} month${months === 1 ? "" : "s"}`
      : `${Math.floor(months / 12)} years`;
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function statusLabel(status?: string) {
  return status ? status.replaceAll("_", " ") : "not tried";
}

export function foodEmoji(category: string) {
  if (category === "fruit") return "🍐";
  if (category === "vegetable") return "🥦";
  if (category === "grain") return "🌾";
  if (category === "dairy") return "🥣";
  if (category === "protein") return "🍲";
  return "🌱";
}

export function mealEmoji(mealType: string) {
  if (mealType === "breakfast") return "🥣";
  if (mealType === "lunch") return "🥪";
  if (mealType === "dinner") return "🍲";
  return "🍎";
}

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">lb.</span>
      <span className="brand-copy">
        <strong>little bites</strong>
        <small>your weaning companion</small>
      </span>
    </Link>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  maxLength,
  minLength,
  max,
  min,
  defaultValue,
  value,
  onChange,
  autoComplete,
  id,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  max?: string;
  min?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoComplete?: string;
  id?: string;
  hint?: string;
}) {
  const fieldId = id ?? name;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        minLength={minLength}
        max={max}
        min={min}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${fieldId}-hint` : undefined}
      />
      {hint && (
        <small id={`${fieldId}-hint`} className="field-hint">
          {hint}
        </small>
      )}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="card card-soft empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}

export function ReadOnlyNotice() {
  return (
    <p className="notice read-only-notice" role="note">
      You have <strong>view-only</strong> access to this family. Ask the family owner or an admin if
      you need to make changes.
    </p>
  );
}

/** Accessible modal built on the native dialog element (focus trapping and Escape handling). */
export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  labelledBy,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("modal-open");
    const handleClose = () => {
      // A stale close event (e.g. from a StrictMode remount) can arrive after reopening.
      if (!dialog.open) closeRef.current();
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      document.body.classList.remove("modal-open");
      if (dialog.open) dialog.close();
      opener?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`modal${wide ? " modal-wide" : ""}`}
      aria-labelledby={labelledBy}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <div className="modal-body">
        <header className="modal-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={labelledBy}>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            ✕
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
