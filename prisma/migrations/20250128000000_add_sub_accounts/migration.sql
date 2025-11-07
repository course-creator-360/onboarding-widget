-- CreateTable
CREATE TABLE "sub_accounts" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "location_name" TEXT,
    "company_id" TEXT,
    "first_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "sub_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sub_accounts_location_id_key" ON "sub_accounts"("location_id");

-- CreateIndex
CREATE INDEX "sub_accounts_account_id_idx" ON "sub_accounts"("account_id");

-- CreateIndex
CREATE INDEX "sub_accounts_company_id_idx" ON "sub_accounts"("company_id");

-- CreateIndex
CREATE INDEX "sub_accounts_first_accessed_at_idx" ON "sub_accounts"("first_accessed_at");

-- CreateIndex
CREATE INDEX "sub_accounts_is_active_idx" ON "sub_accounts"("is_active");




