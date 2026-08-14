-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "password" DROP NOT NULL;
