# Rollback

## Application revision

ACR retains the two most recent images per repository: the current release and
one rollback target. To roll back an application-only release:

1. Identify the previous release's commit SHA from the `vX.Y.Z` git tags or
   `az acr manifest list-metadata --registry <acr> --name little-bites-web`.
2. Run the `Deploy production` workflow manually with
   `rollback_image_sha=<40-character SHA>`. It verifies both images still
   exist, skips build, Terraform apply and migrations, sets the web image to
   that SHA, re-runs health/scaling verification and keeps the retention rule.

Alternatively, an operator can run
`az containerapp update --name <app> --resource-group <rg> --image <acr>/little-bites-web:<sha>`.
Verify `/api/health` and a non-destructive smoke flow. Do not guess a revision
name or use a mutable tag. Rolling back further than one release requires
rebuilding the older commit, because older images are pruned.

## Database changes

Do not roll back by deleting or restoring over a live database as part of an
ordinary app rollback. Use additive, backward-compatible migrations:

1. Add nullable columns/tables or compatible indexes.
2. Deploy code that can read old and new shapes.
3. Backfill and validate data through a reviewed operation.
4. Remove old structures only in a later release after rollback is no longer
   required.

If data corruption or an incompatible migration occurs, stop writes, preserve
the affected server, assess the recovery point and follow
[backup and restore](./backup-restore.md). Any point-in-time recovery changes
the data-loss window and requires explicit owner approval.

## Verification

No production revision or database exists in the current environment.
Application rollback and database restore have not been executed.
