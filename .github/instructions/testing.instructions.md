---
applyTo: "tests/**/*.{ts,tsx},src/**/*.test.{ts,tsx},src/**/*.spec.{ts,tsx},playwright.config.*,vitest.config.*"
---

# Test instructions

Use automated tests as evidence, not decoration.

## Unit tests

Cover pure domain logic such as:

- recipe scaling;
- quantity formatting;
- ingredient aggregation;
- incompatible-unit handling;
- meal-plan rule selection;
- new-food versus familiar-food classification;
- date and week-start handling;
- validation schemas.

## Integration tests

Exercise route handlers or domain services with a test database.

Required coverage:

- registration and sign-in;
- password hashing;
- reset-token expiry and single use;
- family creation;
- child CRUD;
- active-child data separation;
- diary persistence;
- food-status history separation;
- meal-plan persistence;
- shopping-list persistence;
- cross-family read denial;
- cross-family write denial;
- invalid input;
- unauthenticated access.

Prefer real database constraints over mocks for repository-level integration tests.

Each test must create isolated data and clean it up reliably. Tests must not depend on execution order.

## End-to-end tests

Use Playwright for critical browser flows:

1. Register a new account.
2. Complete family onboarding.
3. Create two children.
4. Switch between children.
5. Add a diary entry.
6. Refresh and confirm persistence.
7. Search for food and open preparation guidance.
8. Generate and edit a meal plan.
9. Scale a recipe.
10. Generate and update a shopping list.
11. Add, move and remove a weekly meal.
12. Sign out and sign back in.
13. Confirm persisted data remains available.

Where Apple credentials are unavailable, do not fake an Apple end-to-end pass. Test configuration detection and disabled or unavailable UI behaviour separately.

## Accessibility and responsive behaviour

For key pages, test:

- accessible labels;
- keyboard operation;
- visible focus;
- dialog focus management;
- mobile viewport layout;
- meaningful error messages.

Use automated accessibility checks where practical, but do not claim they replace manual accessibility review.

## Reporting

For every implementation task, report:

- exact commands run;
- pass or fail result;
- failures fixed;
- checks skipped;
- reason for each skipped check.

Never create fictional command output.

## Additional acceptance tests

Child photos:
- Upload, preview, replace and remove a photo.
- Confirm the photo persists after refresh and sign-in.
- Confirm the default avatar appears when no photo exists.
- Reject oversized, malformed and unsupported files.
- Verify image orientation and metadata stripping.
- Deny cross-family image viewing, upload, replacement and deletion.
- Verify storage is not anonymously accessible.

Responsive experience:
- Exercise core flows at mobile and desktop viewport sizes.
- Check for unintended horizontal overflow.
- Test touch-friendly controls and keyboard alternatives.
- Test photo upload and weekly planner behaviour on small screens.
- Record whether tests use emulation or physical devices.

Catalogue:
- Verify the agreed minimum catalogue counts.
- Check recipe completeness and valid ingredient references.
- Verify catalogue imports are idempotent.
- Verify template application respects restrictions and exclusions.
- Verify scaling and shopping aggregation use canonical ingredients.