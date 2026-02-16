-- CreateTable PharmacyConversation
CREATE TABLE "PharmacyConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyConversation_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PharmacyConversation_pharmacyId_userId_key" ON "PharmacyConversation"("pharmacyId", "userId");
CREATE INDEX "PharmacyConversation_pharmacyId_idx" ON "PharmacyConversation"("pharmacyId");
CREATE INDEX "PharmacyConversation_userId_idx" ON "PharmacyConversation"("userId");

-- CreateTable PharmacyConversationMessage
CREATE TABLE "PharmacyConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PharmacyConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyConversationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PharmacyConversationMessage_conversationId_idx" ON "PharmacyConversationMessage"("conversationId");
CREATE INDEX "PharmacyConversationMessage_senderUserId_idx" ON "PharmacyConversationMessage"("senderUserId");
