-- DropIndex
DROP INDEX "otps_userId_type_idx";

-- CreateIndex
CREATE INDEX "otps_userId_type_isUsed_expiresAt_idx" ON "otps"("userId", "type", "isUsed", "expiresAt");

-- CreateIndex
CREATE INDEX "users_role_isDeleted_isActive_idx" ON "users"("role", "isDeleted", "isActive");
