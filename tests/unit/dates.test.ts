import { describe, expect, it } from "vitest";
import { ageInMonths, planningAvailableFrom, planningBlockReason } from "@/lib/dates";

describe("age in months", () => {
  it("uses completed calendar months in UTC", () => {
    expect(
      ageInMonths(new Date("2026-04-22T00:00:00.000Z"), new Date("2026-10-22T00:00:00.000Z")),
    ).toBe(6);
    expect(
      ageInMonths(new Date("2026-04-23T00:00:00.000Z"), new Date("2026-10-22T00:00:00.000Z")),
    ).toBe(5);
    expect(
      ageInMonths(new Date("2026-11-01T00:00:00.000Z"), new Date("2026-10-22T00:00:00.000Z")),
    ).toBe(0);
  });
});

describe("meal planning eligibility", () => {
  const today = new Date("2026-10-22T09:00:00.000Z");
  const fiveMonths = new Date("2026-05-10T00:00:00.000Z");
  const sevenMonths = new Date("2026-03-01T00:00:00.000Z");

  it("allows planning once the child is six months and readiness is confirmed", () => {
    expect(
      planningBlockReason({ name: "Ada", dateOfBirth: sevenMonths, readiness: true }, today),
    ).toBeNull();
  });

  it("explains that age is the remaining reason when readiness is already confirmed", () => {
    const reason = planningBlockReason(
      { name: "Ada", dateOfBirth: fiveMonths, readiness: true },
      today,
    );
    expect(reason).toContain("Ada is 5 months old");
    expect(reason).toContain("10 November 2026");
    expect(reason).toContain("Readiness is already confirmed");
  });

  it("mentions both age and readiness when neither is met", () => {
    const reason = planningBlockReason(
      { name: "Ada", dateOfBirth: fiveMonths, readiness: false },
      today,
    );
    expect(reason).toContain("5 months old");
    expect(reason).toContain("readiness signs");
  });

  it("asks only for readiness when the child is old enough", () => {
    expect(
      planningBlockReason({ name: "Ada", dateOfBirth: sevenMonths, readiness: false }, today),
    ).toBe("Confirm all three readiness signs in Profile before generating meal ideas for Ada.");
  });

  it("calculates the six-month date from the date of birth", () => {
    expect(planningAvailableFrom(fiveMonths).toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });
});
