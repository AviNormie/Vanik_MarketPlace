-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "marketplace";

-- CreateTable
CREATE TABLE "marketplace"."CropListing" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "expectedPrice" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."Offer" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."Escrow" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "amountLocked" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace"."Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_offerId_key" ON "marketplace"."Escrow"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "marketplace"."Wallet"("userId");

-- AddForeignKey
ALTER TABLE "marketplace"."Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace"."CropListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace"."Escrow" ADD CONSTRAINT "Escrow_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "marketplace"."Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
