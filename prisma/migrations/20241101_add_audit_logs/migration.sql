-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_CHANGE_FAILED', 'ACCOUNT_CREATE', 'ACCOUNT_UPDATE', 'ACCOUNT_DELETE', 'PNL_CREATE', 'PNL_UPDATE', 'PNL_DELETE', 'WITHDRAWAL_CREATE', 'WITHDRAWAL_UPDATE', 'WITHDRAWAL_DELETE', 'SUSPICIOUS_ACTIVITY');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

