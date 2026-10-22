"use client";

import { FormEvent, useEffect, useState } from "react";
import { toLocalInputValue, type LoggableFood } from "../lib/meal-log";
import { api, errorText, foodEmoji, type Child } from "./shared";

type Reaction = "skip" | "tried" | "liked" | "disliked";

const REACTIONS: Array<{ id: Reaction; label: string; emoji: string }> = [
  { id: "liked", label: "Loved it", emoji: "😋" },
  { id: "tried", label: "Tried it", emoji: "🙂" },
  { id: "disliked", label: "Not keen", emoji: "😕" },
  { id: "skip", label: "Didn't eat", emoji: "–" },
];

const AMOUNTS = ["A taste", "A few bites", "About half", "Most of it", "All of it"];

export function MealLogForm({
  child,
  sourceTitle,
  recipeId,
  plannedMealId,
  loggable,
  untracked = [],
  statuses,
  onCancel,
  cancelLabel = "Cancel",
  onLogged,
}: {
  child: Child;
  sourceTitle: string;
  recipeId?: string;
  plannedMealId?: string;
  loggable: LoggableFood[];
  untracked?: string[];
  statuses: Record<string, string>;
  onCancel?: () => void;
  cancelLabel?: string;
  onLogged: (message: string, count: number) => void;
}) {
  const [choices, setChoices] = useState<Record<string, Reaction>>(() =>
    Object.fromEntries(loggable.map((food) => [food.id, "tried" as Reaction])),
  );
  const [amount, setAmount] = useState("");
  const [eatenAt, setEatenAt] = useState(() => toLocalInputValue(new Date()));
  const [latestTime] = useState(() => toLocalInputValue(new Date(Date.now() + 5 * 60 * 1000)));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = loggable.filter((food) => choices[food.id] && choices[food.id] !== "skip");
  const firstTastes = chosen.filter(
    (food) => !statuses[food.id] || statuses[food.id] === "not_tried",
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen.length) {
      setError("Choose at least one food that was eaten, or cancel.");
      return;
    }
    const when = new Date(eatenAt);
    if (Number.isNaN(when.getTime())) {
      setError("Enter a valid time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ logged: number }>(`/api/children/${child.id}/diary/meals`, {
        method: "POST",
        body: JSON.stringify({
          recipeId,
          plannedMealId,
          eatenAt: when.toISOString(),
          amount: amount || undefined,
          notes: notes.trim() || undefined,
          foods: chosen.map((food) => ({ foodId: food.id, status: choices[food.id] })),
        }),
      });
      onLogged(
        `Logged ${result.logged} food${result.logged === 1 ? "" : "s"} for ${child.name} from “${sourceTitle}”.`,
        result.logged,
      );
    } catch (caught) {
      setError(errorText(caught));
      setBusy(false);
    }
  }

  if (!loggable.length) {
    return (
      <div className="meal-log">
        <p className="notice notice-info">
          None of the ingredients in “{sourceTitle}” are in the food catalogue yet, so there is
          nothing to add to {child.name}&apos;s diary. You can still log individual foods from the
          Diary tab.
        </p>
        {onCancel && (
          <div className="sheet-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="meal-log" onSubmit={submit} aria-describedby="meal-log-help">
      <p id="meal-log-help" className="muted">
        How did {child.name} get on? Each food is added to the diary and their food progress is
        updated.
      </p>
      <ul className="log-foods">
        {loggable.map((food) => {
          const isNew = !statuses[food.id] || statuses[food.id] === "not_tried";
          return (
            <li key={food.id}>
              <fieldset className="log-food">
                <legend>
                  <span aria-hidden="true">{foodEmoji(food.category)}</span> {food.name}
                  {isNew && <span className="pill pill-new">First taste</span>}
                </legend>
                <div className="choice-chips">
                  {REACTIONS.map((reaction) => (
                    <label key={reaction.id} className="chip-option">
                      <input
                        type="radio"
                        name={`log-${food.id}`}
                        value={reaction.id}
                        checked={choices[food.id] === reaction.id}
                        onChange={() =>
                          setChoices((current) => ({ ...current, [food.id]: reaction.id }))
                        }
                      />
                      <span>
                        <span aria-hidden="true">{reaction.emoji}</span> {reaction.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>
      {!!untracked.length && (
        <p className="muted small-print">Not tracked in the diary: {untracked.join(", ")}.</p>
      )}
      {firstTastes.length > 0 && (
        <p className="notice notice-info">
          First taste of {firstTastes.map((food) => food.name).join(", ")}. Watch for any reaction
          and note it below. For serious symptoms call 999.
        </p>
      )}
      <fieldset className="log-food">
        <legend>How much did they eat? (optional)</legend>
        <div className="choice-chips">
          {AMOUNTS.map((option) => (
            <label key={option} className="chip-option">
              <input
                type="radio"
                name="log-amount"
                value={option}
                checked={amount === option}
                onChange={() => setAmount(option)}
                onClick={() => amount === option && setAmount("")}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="meal-log-time">When</label>
        <input
          id="meal-log-time"
          type="datetime-local"
          required
          value={eatenAt}
          max={latestTime}
          onChange={(event) => setEatenAt(event.target.value)}
        />
      </div>
      <details className="log-notes">
        <summary>Add a note or reaction</summary>
        <div className="field">
          <label htmlFor="meal-log-notes">Notes</label>
          <textarea
            id="meal-log-notes"
            maxLength={1000}
            rows={3}
            placeholder="e.g. loved the texture, a little redness around the mouth"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </details>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="sheet-actions">
        {onCancel && (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
        <button className="button" disabled={busy || !chosen.length}>
          {busy
            ? "Logging…"
            : `Log ${chosen.length} food${chosen.length === 1 ? "" : "s"} for ${child.name}`}
        </button>
      </div>
    </form>
  );
}

type WakeLockHandle = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> };
};

/** Keeps the screen awake while cooking, where the browser supports the Screen Wake Lock API. */
function useScreenWakeLock() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const wakeNavigator = navigator as WakeLockNavigator;
    if (!wakeNavigator.wakeLock) return;
    let handle: WakeLockHandle | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const lock = await wakeNavigator.wakeLock!.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        handle = lock;
        setActive(true);
      } catch {
        setActive(false);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void handle?.release().catch(() => undefined);
    };
  }, []);
  return active;
}

export function CookMode({
  steps,
  ingredients,
  servings,
  finishLabel,
  finishAriaLabel,
  onExit,
  onFinish,
}: {
  steps: string[];
  ingredients: Array<{ key: string; text: string }>;
  servings: number;
  finishLabel: string;
  finishAriaLabel?: string;
  onExit: () => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const awake = useScreenWakeLock();
  const last = step >= steps.length - 1;

  return (
    <div className="cook-mode">
      <div className="cook-progress">
        <strong id="cook-step-label">
          Step {step + 1} of {steps.length}
        </strong>
        <progress max={steps.length} value={step + 1} aria-labelledby="cook-step-label" />
      </div>
      <p className="cook-step" aria-live="polite">
        {steps[step]}
      </p>
      <details className="cook-ingredients">
        <summary>
          Ingredients ({servings} serving{servings === 1 ? "" : "s"})
        </summary>
        <ul>
          {ingredients.map((row) => (
            <li key={row.key}>{row.text}</li>
          ))}
        </ul>
      </details>
      <p className="muted small-print">
        {awake ? "Your screen will stay on while you cook. " : ""}Cool food before serving and
        always stay with your baby while they eat.
      </p>
      <div className="sheet-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => (step === 0 ? onExit() : setStep((value) => value - 1))}
        >
          {step === 0 ? "← Recipe" : "← Back"}
        </button>
        {last ? (
          <button type="button" className="button" aria-label={finishAriaLabel} onClick={onFinish}>
            {finishLabel}
          </button>
        ) : (
          <button type="button" className="button" onClick={() => setStep((value) => value + 1)}>
            Next step →
          </button>
        )}
      </div>
    </div>
  );
}
