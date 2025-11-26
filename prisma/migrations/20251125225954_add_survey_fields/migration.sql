-- AlterTable
ALTER TABLE "onboarding" ADD COLUMN "survey_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "onboarding" ADD COLUMN "survey_responses" JSONB;

