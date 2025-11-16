-- CreateTable
CREATE TABLE "custom_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "formula" TEXT NOT NULL,
    "icon" TEXT,
    "variant" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_stats_userId_idx" ON "custom_stats"("userId");

-- CreateIndex
CREATE INDEX "custom_stats_enabled_idx" ON "custom_stats"("enabled");

-- AddForeignKey
ALTER TABLE "custom_stats" ADD CONSTRAINT "custom_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
