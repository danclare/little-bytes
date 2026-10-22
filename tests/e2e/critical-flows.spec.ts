import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

const cleanupPrisma = new PrismaClient();
const createdEmails: string[] = [];

test.beforeAll(async () => {
  await cleanupPrisma.rateLimitAttempt.deleteMany();
});

test.afterEach(async () => {
  if (!createdEmails.length) return;
  const users = await cleanupPrisma.user.findMany({
    where: { normalizedEmail: { in: createdEmails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    const children = await cleanupPrisma.child.findMany({
      where: { family: { ownerUserId: { in: userIds } } },
      select: { photoObjectKey: true },
    });
    if (process.env.PHOTO_STORAGE === "local") {
      const directory = process.env.PHOTO_LOCAL_DIRECTORY ?? "var/private-uploads";
      for (const { photoObjectKey } of children) {
        if (photoObjectKey && /^[0-9a-f-]{36}\.jpg$/i.test(photoObjectKey)) {
          await rm(path.resolve(directory, photoObjectKey), { force: true });
        }
      }
    }
    await cleanupPrisma.family.deleteMany({ where: { ownerUserId: { in: userIds } } });
    await cleanupPrisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  createdEmails.length = 0;
});

test.afterAll(async () => {
  await cleanupPrisma.$disconnect();
});

test("authenticated weaning journey, persistence, responsive layout and family isolation", async ({
  page,
}) => {
  test.skip(
    !process.env.TEST_DATABASE_URL,
    "Set TEST_DATABASE_URL to a dedicated migrated PostgreSQL test database.",
  );

  const baseURL = test.info().project.use.baseURL as string;
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `parent-${unique}@example.test`;
  const otherEmail = `other-${unique}@example.test`;
  const password = "Little-Bites-secure-test-passphrase-42";
  createdEmails.push(ownerEmail, otherEmail);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // The first request compiles the dev server bundle, which can take a while on a cold cache.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });

  expect((await page.context().request.get(`${baseURL}/api/children`)).status()).toBe(401);
  const loginAxe = await new AxeBuilder({ page }).analyze();
  expect(loginAxe.violations).toEqual([]);

  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Request a password reset." })).toBeVisible();
  await page.getByLabel("Email address").fill(ownerEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText("Password reset is unavailable until email delivery is configured.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to sign in" }).click();

  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Test Parent");
  await page.getByLabel("Email address").fill(ownerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Family name").fill("Test Family");
  await page.getByRole("button", { name: "Create family" }).click();

  const dateOfBirth = new Date();
  dateOfBirth.setMonth(dateOfBirth.getMonth() - 8);
  await page.getByLabel("Child's name or nickname").fill("First child");
  await page.getByLabel("Date of birth").fill(dateOfBirth.toISOString().slice(0, 10));
  for (const sign of [
    "Sits up and holds their head steady",
    "Coordinates eyes, hands and mouth",
    "Swallows food rather than pushing it out",
  ]) {
    await page.getByLabel(sign).check();
  }
  await expect(page.getByText("All three readiness signs confirmed.")).toBeVisible();
  await page.getByRole("button", { name: "Save child profile" }).click();

  const nav = (name: string) =>
    page.locator(".bottom-nav").getByRole("button", { name, exact: true }).click();
  await nav("Profile");
  const secondBirth = new Date();
  secondBirth.setMonth(secondBirth.getMonth() - 9);
  await page.getByText("Add another child").click();
  await page.locator("#new-child-name").fill("Second child");
  await page.locator("#new-child-dob").fill(secondBirth.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Add child" }).click();
  await expect(page.getByRole("heading", { name: "Second child", exact: true })).toBeVisible();
  await page.getByLabel("Switch child").selectOption({ label: "First child" });

  const sessionResponse = await page.context().request.get(`${baseURL}/api/auth/session`);
  const session = await sessionResponse.json();
  const firstChildId = session.family.children.find(
    (child: { name: string }) => child.name === "First child",
  ).id as string;
  const secondChildId = session.family.children.find(
    (child: { name: string }) => child.name === "Second child",
  ).id as string;

  await nav("Diary");
  await page.getByLabel("Food", { exact: true }).selectOption({ label: "Banana" });
  await page.getByLabel("Preparation").fill("Mashed ripe banana");
  await page.getByLabel("Texture").fill("Soft mash");
  await page.getByRole("button", { name: "Save diary entry" }).click();
  await expect(page.getByText("Food moment saved to this child's diary.")).toBeVisible();
  await page.reload();
  await nav("Diary");
  await expect(page.getByText("Banana", { exact: true }).last()).toBeVisible();
  const secondChildDiary = await page
    .context()
    .request.get(`${baseURL}/api/children/${secondChildId}/diary`);
  expect(await secondChildDiary.json()).toEqual([]);
  await page.getByLabel("Switch child").selectOption({ label: "Second child" });
  await expect(page.getByLabel("Switch child")).toHaveValue(secondChildId);
  await page.getByLabel("Switch child").selectOption({ label: "First child" });
  await expect(page.getByLabel("Switch child")).toHaveValue(firstChildId);
  await nav("Diary");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.getByLabel("From date").fill(tomorrow.toISOString().slice(0, 10));
  await expect(page.getByText("No diary entries in this date range")).toBeVisible();
  await page.getByRole("button", { name: "Clear date filters" }).click();
  await expect(page.getByText("Banana", { exact: true }).last()).toBeVisible();

  await nav("Foods");
  const avocadoSearch = page.waitForResponse(
    (response) =>
      response.url().includes("/api/foods?q=Avocado") &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page.getByLabel("Search foods").fill("Avocado");
  await avocadoSearch;
  await page.locator(".food-card", { hasText: "Avocado" }).first().click();
  await expect(page.getByText("Finger-food preparation")).toBeVisible();
  await page.getByLabel("Preparation style").selectOption("mashed");
  await expect(page.getByText("Mashed preparation")).toBeVisible();
  await page.getByRole("button", { name: "Add a diary entry" }).click();

  await nav("Recipes");
  await page.getByRole("button", { name: "Breakfast", exact: true }).click();
  await expect(page.getByRole("button", { name: "Breakfast", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/recipes? for breakfast/)).toBeVisible();
  await page.getByRole("button", { name: "Dinner", exact: true }).click();
  await expect(page.getByRole("button", { name: /Apple and cinnamon oats/ })).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByLabel("Search recipes").fill("Oats");
  await page.getByRole("button", { name: /Apple and cinnamon oats/ }).click();
  const recipeDialog = page.getByRole("dialog", { name: "Apple and cinnamon oats" });
  await expect(recipeDialog).toBeVisible();
  await expect(recipeDialog.getByText("40 g")).toBeVisible();
  await recipeDialog.getByRole("button", { name: "More servings" }).click();
  await expect(recipeDialog.getByRole("spinbutton", { name: "Servings" })).toHaveValue("3");
  await expect(recipeDialog.getByText("60 g")).toBeVisible();
  await recipeDialog.getByRole("checkbox", { name: /Cinnamon/i }).uncheck();
  await recipeDialog.getByLabel("Shopping list").selectOption("new");
  await recipeDialog.getByLabel("New list name").fill("Recipe test list");
  await recipeDialog.getByRole("button", { name: "Add 2 selected items" }).click();
  await expect(
    recipeDialog.getByText(/^Added 2 ingredients to .Recipe test list.\.$/),
  ).toBeVisible();
  const recipeLists = (await (
    await page.context().request.get(`${baseURL}/api/shopping-lists`)
  ).json()) as Array<{ name: string; items: Array<{ label: string; quantity: string | null }> }>;
  const recipeList = recipeLists.find((list) => list.name === "Recipe test list");
  expect(recipeList?.items.map((item) => item.label).sort()).toEqual(["Apple", "Oats"]);
  await recipeDialog.getByRole("button", { name: "Close" }).click();
  await expect(recipeDialog).toHaveCount(0);

  await nav("Plan");
  await page.getByRole("button", { name: "Generate a draft" }).click();
  await expect(page.getByRole("heading", { name: "Review your draft" })).toBeVisible();
  await page.getByRole("button", { name: "Approve and save" }).first().click();
  await expect(page.getByRole("heading", { name: "Meals this week" })).toBeVisible();
  await page.getByRole("button", { name: "Edit meals" }).click();
  await page.getByLabel("Meal type").selectOption("snack");
  await page.getByLabel("Food").selectOption({ label: "Banana" });
  await page.getByRole("button", { name: "Add meal" }).click();
  await expect(page.getByLabel("Replace Banana")).toBeVisible();
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
  const planQuery = await page
    .context()
    .request.get(
      `${baseURL}/api/meal-plans?childId=${firstChildId}&weekStart=${currentWeekStart.toISOString().slice(0, 10)}`,
    );
  expect(planQuery.ok()).toBe(true);
  const savedPlan = (await planQuery.json()) as {
    id: string;
    meals: Array<{ id: string }>;
  };
  expect(savedPlan.meals.length).toBeGreaterThan(0);
  const planId = savedPlan.id;
  const mealId = savedPlan.meals[0].id;

  await nav("Today");
  const todayMeals = page.locator(".today-meals .meal-card");
  await expect(todayMeals.first()).toBeVisible();
  await todayMeals.first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Cook a planned recipe step by step from Today, then log it for the child (mobile viewport).
  const cookButton = page
    .locator(".today-meals .meal-tile")
    .getByRole("button", { name: /^Cook / })
    .first();
  await expect(cookButton).toBeVisible();
  const cookLabel = (await cookButton.getAttribute("aria-label")) ?? "";
  await cookButton.click();
  const cookDialog = page.getByRole("dialog");
  await expect(cookDialog.getByText(/^Step 1 of \d+$/)).toBeVisible();
  expect(
    await cookDialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  const finishButton = cookDialog.getByRole("button", { name: /^Finished – log it for / });
  for (let step = 0; step < 20 && !(await finishButton.isVisible()); step += 1) {
    await cookDialog.getByRole("button", { name: "Next step →" }).click();
  }
  await finishButton.click();
  const logSubmit = cookDialog.getByRole("button", { name: /^Log \d+ foods? for / });
  await expect(logSubmit).toBeVisible();
  await cookDialog.getByRole("radio", { name: "Loved it" }).first().check();
  await cookDialog.getByRole("radio", { name: "A few bites" }).check();
  await logSubmit.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/^Logged \d+ foods? for .+ from “.+”\.$/)).toBeVisible();
  const loggedTile = page.locator(".today-meals .meal-tile", {
    has: page.getByRole("button", { name: cookLabel, exact: true }),
  });
  await expect(loggedTile.locator(".logged-badge")).toBeVisible();
  await expect(loggedTile.getByRole("button", { name: /^Log / })).toHaveCount(0);
  const mealDiary = await page
    .context()
    .request.get(`${baseURL}/api/children/${firstChildId}/diary`);
  const mealEntries = (await mealDiary.json()) as Array<{
    plannedMealId: string | null;
    amount: string | null;
  }>;
  expect(mealEntries.some((entry) => entry.plannedMealId && entry.amount === "A few bites")).toBe(
    true,
  );

  await nav("Shop");
  await page.getByLabel("List name").fill("Family test groceries");
  await page.getByRole("button", { name: "Generate list" }).click();
  await expect(page.getByText("Shopping list created from your planned recipes.")).toBeVisible();
  const listsResponse = await page.context().request.get(`${baseURL}/api/shopping-lists`);
  const lists = await listsResponse.json();
  const familyList = lists.find((list: { name: string }) => list.name === "Family test groceries");
  expect(familyList).toBeTruthy();
  const savedItem = familyList.items[0];
  const itemId = savedItem?.id as string | undefined;
  if (savedItem) {
    const savedCheckbox = page
      .getByRole("region", { name: "Family test groceries" })
      .locator(".list-item", { hasText: savedItem.label as string })
      .first()
      .getByRole("checkbox");
    await savedCheckbox.click();
    await expect
      .poll(
        async () => {
          const response = await page.context().request.get(`${baseURL}/api/shopping-lists`);
          const currentLists = (await response.json()) as Array<{
            name: string;
            items: Array<{ id: string; checked: boolean }>;
          }>;
          return currentLists
            .find((list) => list.name === "Family test groceries")
            ?.items.find((item) => item.id === itemId)?.checked;
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    await expect(
      page
        .getByRole("region", { name: "Family test groceries" })
        .locator(".list-item.is-checked", { hasText: savedItem.label as string })
        .getByRole("checkbox"),
    ).toBeChecked();
  }

  const photo = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWPQSLH5D8IMMAYAO1QHHdMCaSkAAAAASUVORK5CYII=",
    "base64",
  );
  await nav("Profile");
  await page
    .getByLabel("Choose optional photo")
    .setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: photo });
  await expect(page.getByAltText("Preview of selected profile photo")).toBeVisible();
  await expect(page.getByLabel("Crop position")).toBeVisible();
  const photoSaveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/children/${firstChildId}/photo`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save photo" }).click();
  expect((await photoSaveResponse).status()).toBe(201);
  await expect(page.getByText("Private profile photo saved.")).toBeVisible();
  const photoResponse = await page
    .context()
    .request.get(`${baseURL}/api/children/${firstChildId}/photo`);
  expect(photoResponse.status()).toBe(200);
  await page.reload();
  await nav("Profile");
  await expect(page.getByLabel("Replace photo")).toBeVisible();
  await page
    .getByLabel("Replace photo")
    .setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: photo });
  const replacementResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/children/${firstChildId}/photo`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save photo" }).click();
  expect((await replacementResponse).status()).toBe(201);
  await expect(page.getByText("Private profile photo saved.")).toBeVisible();
  const listId = familyList.id as string;

  await nav("Profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Create an account" })).toBeVisible();
  await page.context().clearCookies({ name: "little_bites_session" });
  expect(
    (await page.context().request.get(`${baseURL}/api/children/${firstChildId}/photo`)).status(),
  ).toBe(401);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Other Parent");
  await page.getByLabel("Email address").fill(otherEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Family name").fill("Other Family");
  await page.getByRole("button", { name: "Create family" }).click();
  await page.getByLabel("Child's name or nickname").fill("Other child");
  await page.getByLabel("Date of birth").fill(dateOfBirth.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save child profile" }).click();

  const request = page.context().request;
  const sameOrigin = { headers: { origin: baseURL } };
  expect((await request.get(`${baseURL}/api/children/${firstChildId}`)).status()).toBe(404);
  expect(
    (
      await request.patch(`${baseURL}/api/children/${firstChildId}`, {
        data: { name: "Changed by another family" },
        ...sameOrigin,
      })
    ).status(),
  ).toBe(404);
  expect(
    (await request.delete(`${baseURL}/api/children/${firstChildId}`, sameOrigin)).status(),
  ).toBe(404);
  expect((await request.get(`${baseURL}/api/children/${firstChildId}/diary`)).status()).toBe(404);
  expect((await request.get(`${baseURL}/api/children/${firstChildId}/photo`)).status()).toBe(404);
  expect(
    (
      await request.post(`${baseURL}/api/children/${firstChildId}/photo`, {
        multipart: {
          photo: { name: "foreign.png", mimeType: "image/png", buffer: photo },
          position: "center",
        },
        ...sameOrigin,
      })
    ).status(),
  ).toBe(404);
  expect(
    (await request.delete(`${baseURL}/api/children/${firstChildId}/photo`, sameOrigin)).status(),
  ).toBe(404);
  expect((await request.get(`${baseURL}/api/shopping-lists/${listId}`)).status()).toBe(404);
  expect(
    (await request.delete(`${baseURL}/api/shopping-lists/${listId}`, sameOrigin)).status(),
  ).toBe(404);
  expect(
    (
      await request.post(`${baseURL}/api/shopping-lists/${listId}/items`, {
        data: {},
        ...sameOrigin,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post(`${baseURL}/api/shopping-lists/${listId}/recipes`, {
        data: { recipeId: listId, servings: 2 },
        ...sameOrigin,
      })
    ).status(),
  ).toBe(404);
  const otherMembers = (await (await request.get(`${baseURL}/api/family/members`)).json()) as {
    members: Array<{ email: string }>;
  };
  expect(otherMembers.members.map((member) => member.email)).toEqual([otherEmail]);
  expect((await request.delete(`${baseURL}/api/meal-plans/${planId}`, sameOrigin)).status()).toBe(
    404,
  );
  expect(
    (
      await request.post(`${baseURL}/api/meal-plans/${planId}/meals`, {
        data: {},
        ...sameOrigin,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.patch(`${baseURL}/api/meal-plans/${planId}/meals/${mealId}`, {
        data: { notes: "Changed by another family" },
        ...sameOrigin,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.delete(`${baseURL}/api/meal-plans/${planId}/meals/${mealId}`, sameOrigin)
    ).status(),
  ).toBe(404);
  if (itemId) {
    expect(
      (
        await request.patch(`${baseURL}/api/shopping-lists/${listId}/items/${itemId}`, {
          data: { checked: true },
          ...sameOrigin,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await request.delete(`${baseURL}/api/shopping-lists/${listId}/items/${itemId}`, sameOrigin)
      ).status(),
    ).toBe(404);
  }

  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  expect(planQuery.ok()).toBe(true);

  await nav("Profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.context().clearCookies({ name: "little_bites_session" });
  await page.getByLabel("Email address").fill(ownerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Switch child")).toHaveValue(firstChildId);
  const restoredSession = await page.context().request.get(`${baseURL}/api/auth/session`);
  expect((await restoredSession.json()).user.email).toBe(ownerEmail);
  await nav("Diary");
  await expect(page.getByText("Banana", { exact: true }).last()).toBeVisible();
  await nav("Plan");
  await expect(page.getByRole("heading", { name: "Meals this week" })).toBeVisible();
  await nav("Shop");
  await expect(page.getByText("Family test groceries", { exact: true })).toBeVisible();
  await nav("Profile");
  await expect(page.getByLabel("Replace photo")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByText("Profile photo removed.")).toBeVisible();
  await expect(page.getByLabel("Choose optional photo")).toBeVisible();
  expect(
    (await page.context().request.get(`${baseURL}/api/children/${firstChildId}/photo`)).status(),
  ).toBe(404);

  await nav("Profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  const owner = await cleanupPrisma.user.findUniqueOrThrow({
    where: { normalizedEmail: ownerEmail },
    select: { id: true },
  });
  const resetToken = randomBytes(32).toString("base64url");
  await cleanupPrisma.passwordResetToken.create({
    data: {
      userId: owner.id,
      tokenHash: createHash("sha256").update(resetToken).digest("hex"),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
  await page.goto(`${baseURL}/#reset=${resetToken}`);
  await expect(page.getByRole("heading", { name: "Choose a new password." })).toBeVisible();
  await page.getByLabel("New password").fill(`${password}-reset`);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Your password has been updated. Sign in with your new password.",
  );
  expect(new URL(page.url()).hash).toBe("");
  await page.getByLabel("Email address").fill(ownerEmail);
  await page.getByLabel("Password").fill(`${password}-reset`);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Switch child")).toHaveValue(firstChildId);
});
