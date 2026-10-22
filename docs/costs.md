# Cost considerations

No region, subscription SKU availability or live price has been verified. This
document intentionally does not claim a free tier, a numeric estimate or
serverless PostgreSQL availability. Review the selected region's Azure Pricing
Calculator and service quotas before approving a Terraform plan.

## Data-store options

| Option                                        | Fit for Little Bites                                                                                                                                                                                        | Cost / operational considerations                                                                                                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Azure Database for PostgreSQL Flexible Server | Chosen default. The relational model, transactions, foreign keys and family-scoped queries fit the data and Prisma access pattern.                                                                          | Compute, storage and backups remain billable while the web app is scaled to zero. Verify available burstable SKUs, storage, backup retention, private networking and any stop/start behaviour in the chosen region. |
| PostgreSQL serverless capability              | No capability is assumed. Verify an exact Azure service, region, subscription eligibility, Prisma compatibility and billing model before considering it.                                                    | Do not infer scale-to-zero or free operation from a marketing description; compare minimum capacity, storage, backup and network charges.                                                                           |
| Azure Cosmos DB serverless                    | Not selected. This product has related records, ownership constraints and relational transactions; a document database would require a deliberate model change and verified transactional/partition design. | Request-based billing does not eliminate storage, backup, network or migration costs. Benchmark a real data model before reconsidering it.                                                                          |

## Cost contributors

Include these items in the reviewed estimate:

- PostgreSQL Flexible Server compute, storage, backups and private networking.
- Container Apps consumption, replicas during active periods and environment
  networking. `min_replicas = 0` applies only to the web workload.
- Azure Container Registry storage and image transfer.
- Log Analytics ingestion and retention.
- Key Vault operations and private endpoint/DNS resources.
- Private Blob storage capacity, operations, redundancy and recovery retention.
- VNet integration, private DNS and any additional network services.

Use the smallest regionally supported configuration appropriate for a
non-production evaluation, but do not reduce retention or protection without
reviewing the data risk. The Terraform defaults are starting values, not a
verified quotation. PostgreSQL stop/start schedules, if evaluated, must remain
opt-in and must not be mistaken for automatic scale-to-zero.
