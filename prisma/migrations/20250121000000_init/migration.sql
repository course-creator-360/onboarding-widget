-- CreateTable
CREATE TABLE "installations" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "account_id" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" BIGINT,
    "scope" TEXT,
    "token_type" TEXT NOT NULL DEFAULT 'location',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "domain_connected" BOOLEAN NOT NULL DEFAULT false,
    "course_created" BOOLEAN NOT NULL DEFAULT false,
    "product_attached" BOOLEAN NOT NULL DEFAULT false,
    "payment_integrated" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_log" (
    "id" TEXT NOT NULL,
    "location_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "installations_location_id_key" ON "installations"("location_id");

-- CreateIndex
CREATE INDEX "installations_account_id_idx" ON "installations"("account_id");

-- CreateIndex
CREATE INDEX "installations_token_type_idx" ON "installations"("token_type");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_location_id_key" ON "onboarding"("location_id");

-- CreateIndex
CREATE INDEX "onboarding_location_id_idx" ON "onboarding"("location_id");

-- CreateIndex
CREATE INDEX "event_log_location_id_idx" ON "event_log"("location_id");

-- CreateIndex
CREATE INDEX "event_log_event_type_idx" ON "event_log"("event_type");

-- CreateIndex
CREATE INDEX "event_log_created_at_idx" ON "event_log"("created_at");

