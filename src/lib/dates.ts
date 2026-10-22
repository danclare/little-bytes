export function ageInMonths(dateOfBirth: Date, onDate = new Date()): number {
  let months =
    (onDate.getUTCFullYear() - dateOfBirth.getUTCFullYear()) * 12 +
    onDate.getUTCMonth() -
    dateOfBirth.getUTCMonth();
  if (onDate.getUTCDate() < dateOfBirth.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export const PLANNING_MINIMUM_AGE_MONTHS = 6;

/** The first date on which a child reaches the minimum planning age (UTC date-only). */
export function planningAvailableFrom(dateOfBirth: Date): Date {
  const date = new Date(
    Date.UTC(dateOfBirth.getUTCFullYear(), dateOfBirth.getUTCMonth(), dateOfBirth.getUTCDate()),
  );
  date.setUTCMonth(date.getUTCMonth() + PLANNING_MINIMUM_AGE_MONTHS);
  return date;
}

/**
 * Returns a parent-facing explanation of why meal ideas are unavailable, or null when the child is
 * old enough and readiness has been confirmed. Age and readiness are reported separately so a
 * parent who has confirmed readiness understands that age is the remaining reason.
 */
export function planningBlockReason(
  child: { name: string; dateOfBirth: Date; readiness: boolean },
  onDate = new Date(),
): string | null {
  const months = ageInMonths(child.dateOfBirth, onDate);
  const tooYoung = months < PLANNING_MINIMUM_AGE_MONTHS;
  if (!tooYoung && child.readiness) return null;
  const from = planningAvailableFrom(child.dateOfBirth).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const age = `${months} month${months === 1 ? "" : "s"}`;
  if (tooYoung && child.readiness) {
    return `${child.name} is ${age} old. Meal ideas start from around six months, so planning opens on ${from}. Readiness is already confirmed — nothing else to do.`;
  }
  if (tooYoung) {
    return `${child.name} is ${age} old. Meal ideas start from around six months (from ${from}) and once all three readiness signs are confirmed in Profile.`;
  }
  return `Confirm all three readiness signs in Profile before generating meal ideas for ${child.name}.`;
}
