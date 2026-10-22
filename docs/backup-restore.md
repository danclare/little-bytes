# Backup and restore

## Production database

The Terraform configuration enables Azure Database for PostgreSQL Flexible
Server automated backups with a configurable retention window (default 7
days). PostgreSQL compute, storage and backups remain billable even when the
web app has zero replicas. Automated backup configuration is not proof that a
restore has been tested.

Before production use, the operator must:

1. Confirm the retention window meets the organisation's recovery objectives.
2. Capture the server name, database name, resource group and private DNS/VNet
   connectivity from the applied infrastructure.
3. Perform a point-in-time restore into a **new** server, preserving the
   original until recovery has been validated.
4. Apply the committed migrations to the restored database where required.
5. Verify user, family, child, diary, plan and shopping data with a restricted
   test account.
6. Update the Key Vault database connection only after validation and record
   the recovery time and data-loss window.

Typical operator commands (replace placeholders with values from Terraform
outputs; never put passwords on the command line):

```powershell
az postgres flexible-server restore `
  --resource-group <resource-group> `
  --name <restored-server-name> `
  --source-server <source-server-name> `
  --restore-time <UTC-ISO-8601-time>
```

Restoring creates a separate server and does not switch the application
automatically. Verify the current Azure CLI syntax and subscription before use.

## Profile photos

Photos are stored in a dedicated private Blob container with anonymous access
disabled. The account's redundancy and retention settings must be reviewed
against the chosen region and recovery objectives before deployment. Enable
Blob soft delete/versioning or a separate recovery copy only after reviewing
the privacy and retention implications for child images.

To recover photos, restore the selected storage account/container version or
backup into a private container, verify object keys against the restored
`Child.photoKey` records, and test authenticated reads before switching the
application endpoint. Never make the container public to simplify recovery.
Deleted or superseded photo objects should be removed according to the
documented retention policy; no automated orphan sweeper is currently
configured.

## Verification

No Azure resources exist in the current environment, so backup retention,
point-in-time restore, photo recovery and application recovery have not been
executed. Record each recovery drill and its measured RPO/RTO before claiming
operational recovery capability.
