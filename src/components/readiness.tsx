"use client";

import { useState } from "react";
import { planningBlockReason } from "../lib/dates";
import { READINESS_SIGNS } from "./shared";

/**
 * Lists the three readiness signs explicitly so parents know exactly what they are confirming.
 * Readiness is only recorded when every sign has been ticked; the value is submitted through a
 * hidden `readiness` input so it works inside ordinary forms.
 */
export function ReadinessChecklist({
  idPrefix,
  initiallyReady = false,
  childName,
  dateOfBirth,
}: {
  idPrefix: string;
  initiallyReady?: boolean;
  childName?: string;
  dateOfBirth?: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(READINESS_SIGNS.map((sign) => [sign.id, initiallyReady])),
  );
  const allChecked = READINESS_SIGNS.every((sign) => checked[sign.id]);
  const parsedBirth = dateOfBirth ? new Date(`${dateOfBirth.slice(0, 10)}T00:00:00.000Z`) : null;
  const ageReason =
    parsedBirth && !Number.isNaN(parsedBirth.getTime())
      ? planningBlockReason({
          name: childName?.trim() || "Your child",
          dateOfBirth: parsedBirth,
          readiness: allChecked,
        })
      : null;
  return (
    <fieldset className="readiness">
      <legend>Readiness for solid food</legend>
      <p className="muted readiness-intro">
        Tick each sign you have seen yourself. Meal ideas are only offered once all three are
        present and your baby is around six months old.
      </p>
      <input type="hidden" name="readiness" value={allChecked ? "on" : ""} />
      <ul className="readiness-list">
        {READINESS_SIGNS.map((sign) => (
          <li key={sign.id}>
            <label className="check-card" htmlFor={`${idPrefix}-${sign.id}`}>
              <input
                id={`${idPrefix}-${sign.id}`}
                type="checkbox"
                checked={checked[sign.id] ?? false}
                onChange={(event) =>
                  setChecked((current) => ({ ...current, [sign.id]: event.target.checked }))
                }
              />
              <span>
                <strong>{sign.label}</strong>
                <small>{sign.detail}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className={allChecked ? "readiness-status ready" : "readiness-status"} aria-live="polite">
        {allChecked
          ? "All three readiness signs confirmed."
          : `${READINESS_SIGNS.filter((sign) => checked[sign.id]).length} of 3 signs confirmed.`}
      </p>
      {ageReason && allChecked && <p className="notice notice-info">{ageReason}</p>}
    </fieldset>
  );
}
