/*
  Warnings:

  - You are about to drop the `Drug` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Drug";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'EN',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "idToken" TEXT,
    "scope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AddressChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedRaw" TEXT,
    "proposedStreet" TEXT,
    "proposedBuilding" TEXT,
    "proposedLat" DECIMAL,
    "proposedLng" DECIMAL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AddressChangeRequest_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AddressChangeRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AddressChangeRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlacklistedDrug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'BLOCK',
    "skuId" TEXT,
    "productId" TEXT,
    "barcode" TEXT,
    "govNumber" TEXT,
    "reason" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlacklistedDrug_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BlacklistedDrug_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BlacklistedDrug_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlacklistedDrugLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blacklistedId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlacklistedDrugLog_blacklistedId_fkey" FOREIGN KEY ("blacklistedId") REFERENCES "BlacklistedDrug" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlacklistedDrugLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "addressId" TEXT,
    "countryId" TEXT,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Manufacturer_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Manufacturer_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rxCategory" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "releaseForm" TEXT,
    "dosageText" TEXT,
    "packSize" INTEGER,
    "packUnit" TEXT,
    "manufacturerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sku_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkuCategory" (
    "skuId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    PRIMARY KEY ("skuId", "categoryId"),
    CONSTRAINT "SkuCategory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkuCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkuImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SkuImage_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkuBarcode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "SkuBarcode_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "issuedAt" DATETIME,
    "orderNo" TEXT,
    "orderAt" DATETIME,
    CONSTRAINT "ProductRegistration_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrugDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdByPartnerUserId" TEXT NOT NULL,
    "proposedName" TEXT NOT NULL,
    "form" TEXT,
    "dosage" TEXT,
    "pack" TEXT,
    "manufacturerName" TEXT,
    "barcode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderatorNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DrugDraft_createdByPartnerUserId_fkey" FOREIGN KEY ("createdByPartnerUserId") REFERENCES "PartnerUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "draftId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationEvent_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DrugDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModerationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iso2" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT,
    "regionId" TEXT,
    "cityId" TEXT,
    "street" TEXT,
    "building" TEXT,
    "apartment" TEXT,
    "postalCode" TEXT,
    "raw" TEXT,
    "lat" DECIMAL,
    "lng" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Address_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Address_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Address_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GovDrug" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officialNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "form" TEXT,
    "strength" TEXT,
    "pack" TEXT,
    "manufacturerName" TEXT,
    "sourceUrl" TEXT,
    "sourceVersionDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GovDrugPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "govDrugId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "effectiveAt" DATETIME NOT NULL,
    "sourceUrl" TEXT,
    "decisionRef" TEXT,
    CONSTRAINT "GovDrugPrice_govDrugId_fkey" FOREIGN KEY ("govDrugId") REFERENCES "GovDrug" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkuGovLink" (
    "skuId" TEXT NOT NULL,
    "govDrugId" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "confidence" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("skuId", "govDrugId"),
    CONSTRAINT "SkuGovLink_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SkuGovLink_govDrugId_fkey" FOREIGN KEY ("govDrugId") REFERENCES "GovDrug" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductInstruction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductInstruction_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstructionSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instructionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InstructionSection_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "ProductInstruction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfferSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingPrice" DECIMAL NOT NULL,
    "walkInPrice" DECIMAL,
    "inStock" BOOLEAN NOT NULL,
    "stockQty" INTEGER,
    CONSTRAINT "OfferSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerOrg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerOrg_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "PharmacyChain" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartnerUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "PartnerOrg" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartnerUserPharmacyAccess" (
    "partnerUserId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("partnerUserId", "pharmacyId"),
    CONSTRAINT "PartnerUserPharmacyAccess_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "PartnerUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerUserPharmacyAccess_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PharmacyPaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LBP',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minAmount" DECIMAL,
    "maxAmount" DECIMAL,
    "paymentLinkTemplate" TEXT,
    "instructions" TEXT,
    "requiresProof" BOOLEAN NOT NULL DEFAULT true,
    "payToIdentifier" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyPaymentMethod_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyPaymentMethod_methodCode_fkey" FOREIGN KEY ("methodCode") REFERENCES "PaymentMethod" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "userId" TEXT,
    "confirmedByUserId" TEXT,
    "provider" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "paymentUrl" TEXT NOT NULL,
    "providerRef" TEXT,
    "expiresAt" DATETIME,
    "userReportedPaidAt" DATETIME,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationPayment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReservationPayment_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentProof_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ReservationPayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentProof_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationPaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReservationPaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ReservationPayment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationPaymentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyChain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pharmacy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainId" TEXT,
    "name" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confirmSlaMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ratingAvg" DECIMAL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Pharmacy_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "PharmacyChain" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pharmacy_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyWorkingHour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openMinute" INTEGER,
    "closeMinute" INTEGER,
    CONSTRAINT "PharmacyWorkingHour_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "is24x7" BOOLEAN NOT NULL DEFAULT false,
    "hasDelivery" BOOLEAN NOT NULL DEFAULT false,
    "hasPickup" BOOLEAN NOT NULL DEFAULT true,
    "canSplitPack" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyService_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "checkedByUserId" TEXT,
    "checkedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyVerification_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyVerification_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "pharmacyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customerName" TEXT,
    "customerPhone" TEXT NOT NULL,
    "reservationCode" TEXT,
    "submittedAt" DATETIME,
    "confirmedAt" DATETIME,
    "expiresAt" DATETIME,
    "currency" TEXT NOT NULL,
    "totalBookingPrice" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "offerId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "unitBookingPrice" DECIMAL,
    CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReservationItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReservationStatusEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyReview_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReview_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyReviewPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyReviewPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PharmacyReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyReviewReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedByUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PharmacyReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReport_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReport_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyReviewReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "partnerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PharmacyReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReply_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReply_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "PartnerUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyReviewHelpfulVote" (
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("reviewId", "userId"),
    CONSTRAINT "PharmacyReviewHelpfulVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PharmacyReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewHelpfulVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PharmacyReviewReportResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "partnerUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyReviewReportResponse_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PharmacyReviewReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReportResponse_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyReviewReportResponse_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "PartnerUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "AuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionToken_key" ON "AuthSession"("sessionToken");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AddressChangeRequest_pharmacyId_idx" ON "AddressChangeRequest"("pharmacyId");

-- CreateIndex
CREATE INDEX "AddressChangeRequest_status_idx" ON "AddressChangeRequest"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_targetType_idx" ON "BlacklistedDrug"("targetType");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_severity_idx" ON "BlacklistedDrug"("severity");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_startsAt_idx" ON "BlacklistedDrug"("startsAt");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_skuId_idx" ON "BlacklistedDrug"("skuId");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_productId_idx" ON "BlacklistedDrug"("productId");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_barcode_idx" ON "BlacklistedDrug"("barcode");

-- CreateIndex
CREATE INDEX "BlacklistedDrug_govNumber_idx" ON "BlacklistedDrug"("govNumber");

-- CreateIndex
CREATE INDEX "BlacklistedDrugLog_blacklistedId_createdAt_idx" ON "BlacklistedDrugLog"("blacklistedId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionKey_key" ON "Cart"("sessionKey");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_offerId_idx" ON "CartItem"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_offerId_isSplit_key" ON "CartItem"("cartId", "offerId", "isSplit");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "ProductTranslation_locale_idx" ON "ProductTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

-- CreateIndex
CREATE INDEX "Manufacturer_countryId_idx" ON "Manufacturer"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_slug_key" ON "Sku"("slug");

-- CreateIndex
CREATE INDEX "Sku_productId_idx" ON "Sku"("productId");

-- CreateIndex
CREATE INDEX "Sku_manufacturerId_idx" ON "Sku"("manufacturerId");

-- CreateIndex
CREATE INDEX "SkuCategory_categoryId_idx" ON "SkuCategory"("categoryId");

-- CreateIndex
CREATE INDEX "SkuImage_skuId_sortOrder_idx" ON "SkuImage"("skuId", "sortOrder");

-- CreateIndex
CREATE INDEX "SkuBarcode_code_idx" ON "SkuBarcode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SkuBarcode_skuId_code_key" ON "SkuBarcode"("skuId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRegistration_skuId_key" ON "ProductRegistration"("skuId");

-- CreateIndex
CREATE INDEX "ProductRegistration_regNumber_idx" ON "ProductRegistration"("regNumber");

-- CreateIndex
CREATE INDEX "DrugDraft_status_idx" ON "DrugDraft"("status");

-- CreateIndex
CREATE INDEX "DrugDraft_createdByPartnerUserId_idx" ON "DrugDraft"("createdByPartnerUserId");

-- CreateIndex
CREATE INDEX "ModerationEvent_draftId_createdAt_idx" ON "ModerationEvent"("draftId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Country_iso2_key" ON "Country"("iso2");

-- CreateIndex
CREATE INDEX "Region_countryId_idx" ON "Region"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_countryId_name_key" ON "Region"("countryId", "name");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "City_regionId_idx" ON "City"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "City_regionId_name_key" ON "City"("regionId", "name");

-- CreateIndex
CREATE INDEX "Address_cityId_idx" ON "Address"("cityId");

-- CreateIndex
CREATE INDEX "Address_lat_lng_idx" ON "Address"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "GovDrug_officialNumber_key" ON "GovDrug"("officialNumber");

-- CreateIndex
CREATE INDEX "GovDrug_name_idx" ON "GovDrug"("name");

-- CreateIndex
CREATE INDEX "GovDrugPrice_govDrugId_effectiveAt_idx" ON "GovDrugPrice"("govDrugId", "effectiveAt");

-- CreateIndex
CREATE INDEX "SkuGovLink_govDrugId_idx" ON "SkuGovLink"("govDrugId");

-- CreateIndex
CREATE INDEX "ProductInstruction_locale_idx" ON "ProductInstruction"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInstruction_skuId_locale_key" ON "ProductInstruction"("skuId", "locale");

-- CreateIndex
CREATE INDEX "InstructionSection_instructionId_sortOrder_idx" ON "InstructionSection"("instructionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "InstructionSection_instructionId_key_key" ON "InstructionSection"("instructionId", "key");

-- CreateIndex
CREATE INDEX "Offer_pharmacyId_idx" ON "Offer"("pharmacyId");

-- CreateIndex
CREATE INDEX "Offer_skuId_idx" ON "Offer"("skuId");

-- CreateIndex
CREATE INDEX "Offer_updatedAt_idx" ON "Offer"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_skuId_pharmacyId_key" ON "Offer"("skuId", "pharmacyId");

-- CreateIndex
CREATE INDEX "OfferSnapshot_offerId_capturedAt_idx" ON "OfferSnapshot"("offerId", "capturedAt");

-- CreateIndex
CREATE INDEX "PartnerOrg_chainId_idx" ON "PartnerOrg"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerUser_userId_key" ON "PartnerUser"("userId");

-- CreateIndex
CREATE INDEX "PartnerUser_orgId_idx" ON "PartnerUser"("orgId");

-- CreateIndex
CREATE INDEX "PartnerUserPharmacyAccess_pharmacyId_idx" ON "PartnerUserPharmacyAccess"("pharmacyId");

-- CreateIndex
CREATE INDEX "PharmacyPaymentMethod_pharmacyId_isEnabled_idx" ON "PharmacyPaymentMethod"("pharmacyId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyPaymentMethod_pharmacyId_methodCode_currency_key" ON "PharmacyPaymentMethod"("pharmacyId", "methodCode", "currency");

-- CreateIndex
CREATE INDEX "ReservationPayment_reservationId_idx" ON "ReservationPayment"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationPayment_status_idx" ON "ReservationPayment"("status");

-- CreateIndex
CREATE INDEX "ReservationPayment_provider_providerRef_idx" ON "ReservationPayment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "PaymentProof_paymentId_idx" ON "PaymentProof"("paymentId");

-- CreateIndex
CREATE INDEX "ReservationPaymentEvent_paymentId_createdAt_idx" ON "ReservationPaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyChain_name_key" ON "PharmacyChain"("name");

-- CreateIndex
CREATE INDEX "Pharmacy_chainId_idx" ON "Pharmacy"("chainId");

-- CreateIndex
CREATE INDEX "Pharmacy_addressId_idx" ON "Pharmacy"("addressId");

-- CreateIndex
CREATE INDEX "PharmacyWorkingHour_pharmacyId_idx" ON "PharmacyWorkingHour"("pharmacyId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyWorkingHour_pharmacyId_dayOfWeek_key" ON "PharmacyWorkingHour"("pharmacyId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyService_pharmacyId_key" ON "PharmacyService"("pharmacyId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyVerification_pharmacyId_key" ON "PharmacyVerification"("pharmacyId");

-- CreateIndex
CREATE INDEX "PharmacyVerification_status_idx" ON "PharmacyVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_pharmacyId_idx" ON "Reservation"("pharmacyId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_customerPhone_idx" ON "Reservation"("customerPhone");

-- CreateIndex
CREATE INDEX "ReservationItem_reservationId_idx" ON "ReservationItem"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationItem_skuId_idx" ON "ReservationItem"("skuId");

-- CreateIndex
CREATE INDEX "ReservationStatusEvent_reservationId_createdAt_idx" ON "ReservationStatusEvent"("reservationId", "createdAt");

-- CreateIndex
CREATE INDEX "ReservationStatusEvent_status_idx" ON "ReservationStatusEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyReview_reservationId_key" ON "PharmacyReview"("reservationId");

-- CreateIndex
CREATE INDEX "PharmacyReview_pharmacyId_status_idx" ON "PharmacyReview"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PharmacyReview_pharmacyId_helpfulCount_idx" ON "PharmacyReview"("pharmacyId", "helpfulCount");

-- CreateIndex
CREATE INDEX "PharmacyReview_userId_createdAt_idx" ON "PharmacyReview"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyReview_pharmacyId_userId_key" ON "PharmacyReview"("pharmacyId", "userId");

-- CreateIndex
CREATE INDEX "PharmacyReviewPhoto_reviewId_sortOrder_idx" ON "PharmacyReviewPhoto"("reviewId", "sortOrder");

-- CreateIndex
CREATE INDEX "PharmacyReviewReport_pharmacyId_status_idx" ON "PharmacyReviewReport"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PharmacyReviewReport_reviewId_status_idx" ON "PharmacyReviewReport"("reviewId", "status");

-- CreateIndex
CREATE INDEX "PharmacyReviewReport_status_createdAt_idx" ON "PharmacyReviewReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyReviewReply_reviewId_key" ON "PharmacyReviewReply"("reviewId");

-- CreateIndex
CREATE INDEX "PharmacyReviewReply_pharmacyId_status_idx" ON "PharmacyReviewReply"("pharmacyId", "status");

-- CreateIndex
CREATE INDEX "PharmacyReviewReply_partnerUserId_idx" ON "PharmacyReviewReply"("partnerUserId");

-- CreateIndex
CREATE INDEX "PharmacyReviewHelpfulVote_userId_createdAt_idx" ON "PharmacyReviewHelpfulVote"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyReviewReportResponse_reportId_key" ON "PharmacyReviewReportResponse"("reportId");

-- CreateIndex
CREATE INDEX "PharmacyReviewReportResponse_pharmacyId_idx" ON "PharmacyReviewReportResponse"("pharmacyId");

-- CreateIndex
CREATE INDEX "PharmacyReviewReportResponse_partnerUserId_idx" ON "PharmacyReviewReportResponse"("partnerUserId");
