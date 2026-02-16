-- AlterTable Offer: freeze and delete fields
ALTER TABLE "Offer" ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Offer" ADD COLUMN "frozenReason" TEXT;
ALTER TABLE "Offer" ADD COLUMN "frozenAt" DATETIME;
ALTER TABLE "Offer" ADD COLUMN "frozenByUserId" TEXT;
ALTER TABLE "Offer" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Offer" ADD COLUMN "deletedReason" TEXT;
ALTER TABLE "Offer" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Offer" ADD COLUMN "deletedByUserId" TEXT;

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "refId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- Offer FK (SQLite doesn't support ADD CONSTRAINT easily; Prisma may have created table without FK)
-- If Offer was created without FK, we need to add them. SQLite: can't add FK in ALTER. Skip for SQLite or use table recreate.
-- For SQLite we often just add columns; FKs might be validated by Prisma at runtime.
