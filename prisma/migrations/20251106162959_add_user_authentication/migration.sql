/*
  Warnings:

  - Added the required column `user_id` to the `installations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "installations" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "onboarding" ADD COLUMN     "location_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "agency_locations" (
    "location_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agency_locations_account_id_idx" ON "agency_locations"("account_id");

-- CreateIndex
CREATE INDEX "agency_locations_company_id_idx" ON "agency_locations"("company_id");

-- CreateIndex
CREATE INDEX "agency_locations_last_synced_at_idx" ON "agency_locations"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "installations_user_id_idx" ON "installations"("user_id");

-- AddForeignKey
ALTER TABLE "installations" ADD CONSTRAINT "installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
