-- CreateTable
CREATE TABLE "family_invitations" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "family_invitations_role_check" CHECK ("role" IN ('admin', 'editor', 'viewer'))
);

-- CreateIndex
CREATE UNIQUE INDEX "family_invitations_token_hash_key" ON "family_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "family_invitations_family_id_accepted_at_revoked_at_idx" ON "family_invitations"("family_id", "accepted_at", "revoked_at");

-- CreateIndex
CREATE INDEX "family_invitations_normalized_email_idx" ON "family_invitations"("normalized_email");

-- AddForeignKey
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restrict membership roles to the supported RBAC roles.
UPDATE "family_memberships" SET "role" = 'viewer' WHERE "role" NOT IN ('owner', 'admin', 'editor', 'viewer');
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_role_check" CHECK ("role" IN ('owner', 'admin', 'editor', 'viewer'));