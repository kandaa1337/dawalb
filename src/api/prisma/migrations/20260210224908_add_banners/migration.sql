-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slot" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "link" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "bookingPrice" DECIMAL NOT NULL,
    "walkInPrice" DECIMAL,
    "currency" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER,
    "minQty" INTEGER,
    "canSplitPack" BOOLEAN NOT NULL DEFAULT false,
    "splitUnitName" TEXT,
    "splitQtyAvailable" INTEGER,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenReason" TEXT,
    "frozenAt" DATETIME,
    "frozenByUserId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedReason" TEXT,
    "deletedAt" DATETIME,
    "deletedByUserId" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_frozenByUserId_fkey" FOREIGN KEY ("frozenByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Offer_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("bookingPrice", "canSplitPack", "createdAt", "currency", "deletedAt", "deletedByUserId", "deletedReason", "frozenAt", "frozenByUserId", "frozenReason", "id", "inStock", "isDeleted", "isFrozen", "minQty", "pharmacyId", "skuId", "splitQtyAvailable", "splitUnitName", "stockQty", "updatedAt", "walkInPrice") SELECT "bookingPrice", "canSplitPack", "createdAt", "currency", "deletedAt", "deletedByUserId", "deletedReason", "frozenAt", "frozenByUserId", "frozenReason", "id", "inStock", "isDeleted", "isFrozen", "minQty", "pharmacyId", "skuId", "splitQtyAvailable", "splitUnitName", "stockQty", "updatedAt", "walkInPrice" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE INDEX "Offer_pharmacyId_idx" ON "Offer"("pharmacyId");
CREATE INDEX "Offer_skuId_idx" ON "Offer"("skuId");
CREATE INDEX "Offer_updatedAt_idx" ON "Offer"("updatedAt");
CREATE UNIQUE INDEX "Offer_skuId_pharmacyId_key" ON "Offer"("skuId", "pharmacyId");
CREATE TABLE "new_PharmacyConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyConversation_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PharmacyConversation" ("createdAt", "id", "pharmacyId", "updatedAt", "userId") SELECT "createdAt", "id", "pharmacyId", "updatedAt", "userId" FROM "PharmacyConversation";
DROP TABLE "PharmacyConversation";
ALTER TABLE "new_PharmacyConversation" RENAME TO "PharmacyConversation";
CREATE INDEX "PharmacyConversation_pharmacyId_idx" ON "PharmacyConversation"("pharmacyId");
CREATE INDEX "PharmacyConversation_userId_idx" ON "PharmacyConversation"("userId");
CREATE UNIQUE INDEX "PharmacyConversation_pharmacyId_userId_key" ON "PharmacyConversation"("pharmacyId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Banner_slot_isActive_idx" ON "Banner"("slot", "isActive");
