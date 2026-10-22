import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM script without type declarations
import { computeNextVersion, releaseType } from "../../scripts/release-version.mjs";

describe("release versioning", () => {
  it("uses the package version for the first release", () => {
    expect(computeNextVersion(null, ["feat: anything"], "1.0.0")).toBe("1.0.0");
  });

  it("bumps patch for fixes and chores", () => {
    expect(computeNextVersion("v1.2.3", ["fix: login copy", "chore: deps"])).toBe("1.2.4");
  });

  it("bumps minor for features and resets patch", () => {
    expect(computeNextVersion("v1.2.3", ["fix: x", "feat(recipes): filters"])).toBe("1.3.0");
  });

  it("bumps major for breaking changes", () => {
    expect(computeNextVersion("v1.2.3", ["feat!: new auth"])).toBe("2.0.0");
    expect(computeNextVersion("v1.2.3", ["refactor: x\n\nBREAKING CHANGE: removes API"])).toBe(
      "2.0.0",
    );
  });

  it("classifies release types", () => {
    expect(releaseType([])).toBe("patch");
    expect(releaseType(["docs: readme"])).toBe("patch");
  });
});
