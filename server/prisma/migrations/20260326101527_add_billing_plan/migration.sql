-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "plan_expires_at" TIMESTAMP(3),
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);
