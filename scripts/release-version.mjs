#!/usr/bin/env node
// Computes the next semantic version from conventional commit messages since the last release tag.
// Usage: node scripts/release-version.mjs   -> prints e.g. 1.4.0
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(value) {
  const match = SEMVER.exec(String(value ?? "").trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function releaseType(commitMessages) {
  let type = "patch";
  for (const message of commitMessages) {
    const [subject = "", ...body] = String(message).split("\n");
    if (
      /^[a-z]+(\([^)]*\))?!:/i.test(subject) ||
      body.some((line) => /^BREAKING[ -]CHANGE:/.test(line))
    ) {
      return "major";
    }
    if (/^feat(\([^)]*\))?:/i.test(subject)) type = "minor";
  }
  return type;
}

/**
 * @param {string | null} lastTag latest release tag (vX.Y.Z) or null when no release exists yet
 * @param {string[]} commitMessages full commit messages since lastTag
 * @param {string} baseVersion version used when no release tag exists (package.json)
 */
export function computeNextVersion(lastTag, commitMessages, baseVersion = "1.0.0") {
  const last = parseVersion(lastTag);
  if (!last) {
    const base = parseVersion(baseVersion);
    if (!base) throw new Error(`Invalid base version: ${baseVersion}`);
    return `${base.major}.${base.minor}.${base.patch}`;
  }
  switch (releaseType(commitMessages)) {
    case "major":
      return `${last.major + 1}.0.0`;
    case "minor":
      return `${last.major}.${last.minor + 1}.0`;
    default:
      return `${last.major}.${last.minor}.${last.patch + 1}`;
  }
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function main() {
  const tags = git(["tag", "--list", "v*.*.*", "--sort=-v:refname"])
    .split("\n")
    .filter((tag) => parseVersion(tag));
  const lastTag = tags[0] ?? null;
  const range = lastTag ? [`${lastTag}..HEAD`] : ["HEAD"];
  const log = git(["log", "--format=%B%x1e", ...range]);
  const messages = log
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  process.stdout.write(`${computeNextVersion(lastTag, messages, pkg.version)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
