---
applyTo: "src/**/*.{ts,tsx},prisma/**/*.prisma"
---

# Application and domain instructions

## Required domain model

Implement relational records for the following concepts.

### Authentication

- `User`
  - id;
  - email;
  - normalised email;
  - name;
  - created and updated timestamps.
- `Account`
  - provider;
  - provider account identifier;
  - linked user.
- `Session`
  - secure persisted session data where required by the authentication adapter.
- `VerificationToken`
  - or equivalent secure token model.
- `PasswordCredential`
  - user identifier;
  - password hash.

### Families and children

- `Family`
  - name;
  - owner user identifier;
  - timestamps.
- `FamilyMembership`
  - family;
  - user;
  - role;
  - timestamps.
- `Child`
  - family;
  - name or nickname;
  - date of birth;
  - optional pronouns;
  - optional dietary notes;
  - timestamps.
- `ChildFoodStatus`
  - child;
  - food;
  - status;
  - timestamps.
- `FoodDiaryEntry`
  - child;
  - food;
  - date and time;
  - preparation;
  - texture;
  - amount;
  - reaction;
  - notes;
  - timestamps.

### Catalogue

- `Food`
  - name;
  - description;
  - category;
  - age guidance;
  - allergens;
  - image URL or asset key;
  - preparation notes;
  - active status.
- `Recipe`
  - title;
  - description;
  - suitable-age guidance;
  - allergens;
  - servings;
  - preparation time;
  - cooking time;
  - instructions;
  - image asset.
- `RecipeIngredient`
  - recipe;
  - ingredient record or name;
  - quantity;
  - unit;
  - optional preparation note.

### Planning and shopping

- `MealPlan`
  - child;
  - week start;
  - status;
  - timestamps.
- `PlannedMeal`
  - meal plan;
  - date;
  - meal type;
  - recipe or food reference;
  - servings;
  - notes.
- `ShoppingList`
  - family;
  - name;
  - status;
  - timestamps.
- `ShoppingListItem`
  - shopping list;
  - ingredient;
  - quantity;
  - unit;
  - checked status;
  - recipe source.

Use foreign keys, indexes, uniqueness constraints and deliberate deletion behaviour. Do not store the family domain as one JSON document. JSON is acceptable only for genuinely flexible metadata.

## Authentication

Required behaviour:

- Email and password registration.
- Sign-in and sign-out.
- Secure session persistence according to the documented session policy.
- Password hashing and validation.
- Generic invalid-credential errors that do not disclose whether an account exists.
- Protected authenticated pages and server routes.
- Initial family and child setup.
- Expiring, single-use password-reset tokens.

If email delivery is not configured, implement and test token creation, hashing, expiry, consumption and invalidation. Clearly document that delivery remains unconfigured.

Support Apple Sign In behind explicit configuration using a maintained OAuth or OIDC library. Include callback handling, state validation, nonce validation where applicable, and safe account-linking behaviour.

Do not present Apple Sign In as operational until real Apple credentials and a callback flow have been tested. Never store an Apple private key in source, logs or browser code.

## User interface

Provide accessible, responsive pages for:

- landing;
- registration;
- login;
- onboarding and family setup;
- child dashboard and child switching;
- food search and discovery;
- food details;
- food diary;
- recipes and recipe details;
- meal-plan generation;
- weekly planning;
- shopping lists;
- account and family settings;
- error, empty, loading and success states.

Requirements:

- mobile-first layout;
- usable touch targets;
- associated form labels;
- visible focus states;
- keyboard navigation;
- sufficient colour contrast;
- accessible dialogs or dedicated editing pages;
- confirmation before destructive actions;
- essential information available as text rather than only through images.

## Child profiles and food diary

A parent must be able to:

- create, edit, switch and remove child profiles;
- record food status as not tried, tried, liked, disliked or temporarily avoided;
- record preparation, texture, amount, notes and observed reaction;
- view and filter diary history;
- view familiar foods and clearly marked variety suggestions;
- search and filter the catalogue;
- view age-aware preparation guidance.

Food status and diary history are separate records. Updating status must never erase historical diary entries.

## Preparation guides

Where relevant, food details must provide:

1. finger-food or baby-led preparation;
2. mashed or fork-mashed preparation;
3. puréed preparation.

Include textual instructions and, when appropriate:

- suitability information;
- equipment;
- steps;
- serving suggestions;
- storage guidance;
- hazards.

## Meal planning

Use deterministic, explainable rules for the initial generator. Do not introduce an LLM dependency for basic planning.

Inputs may include:

- child age and recorded readiness;
- tried-food history and status;
- parent-entered preferences and restrictions;
- excluded allergens or ingredients;
- available recipes;
- desired meals and planning period.

Outputs must:

- refer to persisted foods or recipes;
- include preparation and texture notes;
- provide variety;
- distinguish new foods from familiar foods;
- retain allergen and preparation warnings;
- support replace, edit, approve and remove operations.

Persist a plan only after the parent accepts it. Do not describe the plan as nutritionally complete or medically tailored.

## Recipe scaling

Scale each ingredient using:

`target quantity = original quantity × target servings ÷ recipe servings`

Requirements:

- preserve the original unit;
- use explicit, reasonable formatting and rounding;
- test fractional and non-integer scaling;
- do not silently change source quantities;
- do not combine incompatible or ambiguous units.

## Shopping lists

Support:

- aggregation from selected planned meals;
- practical category grouping when catalogue metadata supports it;
- check and uncheck;
- manual item creation and deletion;
- source recipe references;
- persistent list state.

Only aggregate entries whose ingredient identity and units are compatible. Keep ambiguous quantities separate.

## Weekly planner

Provide an accessible calendar or list view with breakfast, lunch, dinner and optional snacks.

Support:

- add;
- edit;
- move;
- replace;
- remove;
- duplicate a day;
- reuse a previous plan;
- generate a shopping list.

Document and consistently enforce the week-start and date-storage conventions.

## Child profile photos

Allow parents to upload, replace and remove an optional photo for each child.

- Show the photo in the child profile, dashboard and child switcher.
- Provide a friendly default avatar when no photo exists.
- Support image selection from mobile photo libraries and desktop files.
- Offer camera capture on supported mobile devices without requiring it.
- Provide an accessible crop/position preview before saving.
- Handle portrait orientation correctly.
- Optimise uploaded images and generate appropriately sized thumbnails.
- Support JPEG, PNG and WebP. Support HEIC/HEIF through a maintained
  conversion implementation where practical; otherwise provide a clear,
  actionable unsupported-format message.
- Show upload progress, validation errors and retry states.
- Store only the private storage object key and relevant metadata in the
  database, not image data or a permanent public URL.
- Remove superseded images and clean up images when a child is deleted.
- Photo uploads must remain optional throughout onboarding.

## Mobile and desktop acceptance requirements

All core functionality must work on mobile phones and desktop browsers.

- Support layouts from 320 CSS pixels upwards without page-level
  horizontal scrolling.
- Test representative mobile, tablet and desktop viewports.
- Make navigation, forms, child switching, photo uploads, recipe controls,
  meal planning and shopping lists usable by touch and keyboard.
- Do not rely on hover or drag-and-drop as the only interaction.
- Provide an accessible list alternative to a wide weekly calendar.
- Ensure dialogs, upload previews and validation messages fit small screens.
- Use responsive images and avoid downloading full-resolution profile
  photos for small avatars.
- Verify critical flows in Chromium and WebKit, including mobile emulation.
- Distinguish browser emulation from tests performed on physical devices.

## Expanded ingredient, recipe and meal-plan catalogue

Replace the minimal demonstration catalogue with a useful initial library.

Suggested initial content targets:
- At least 60 distinct food/ingredient records.
- At least 40 complete recipes spanning breakfast, lunch and dinner.
- At least 4 reusable seven-day meal-plan templates.

These are implementation targets, not claims of nutritional completeness.

- Use a canonical Ingredient model with stable identifiers, category,
  supported units and allergen metadata.
- Link RecipeIngredient records to canonical ingredients wherever possible.
- Preserve explicit quantities, units and preparation notes.
- Include varied preparation methods and parent-selectable dietary options.
- Provide search and filtering for recipes and reusable plan templates.
- Keep reusable catalogue templates separate from child-owned meal plans.
- When applying a template, revalidate every meal against the child's
  recorded readiness, restrictions and exclusions.
- Allow parents to preview, replace and edit meals before accepting a plan.
- Do not populate the library with duplicate recipes or incomplete filler.
- Use idempotent catalogue imports and seeds.
- Do not overwrite user-created records or existing production content.
- Record content sources and image licensing.
- Retain all existing food-safety requirements.