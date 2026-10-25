-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'staff');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occ" TEXT[],
    "variants" JSONB NOT NULL,
    "short" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "composition" TEXT NOT NULL DEFAULT '',
    "care" TEXT NOT NULL DEFAULT '',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "maxQty" INTEGER NOT NULL DEFAULT 10,
    "leadDays" INTEGER NOT NULL DEFAULT 0,
    "builder" BOOLEAN NOT NULL DEFAULT false,
    "addons" BOOLEAN NOT NULL DEFAULT false,
    "builderExtra" BOOLEAN NOT NULL DEFAULT false,
    "wrap" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "img" TEXT,
    "sample" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bn" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" INTEGER,
    "priceMode" TEXT NOT NULL DEFAULT 'confirm',
    "min" INTEGER NOT NULL DEFAULT 1,
    "max" INTEGER NOT NULL DEFAULT 100,
    "multiple" INTEGER NOT NULL DEFAULT 1,
    "presets" INTEGER[],
    "available" BOOLEAN NOT NULL DEFAULT true,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "leadDays" INTEGER NOT NULL DEFAULT 1,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "grp" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "short" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priceModel" TEXT NOT NULL DEFAULT 'quote',
    "packages" JSONB NOT NULL,
    "fromPrice" INTEGER,
    "perUnit" TEXT,
    "depositPct" INTEGER NOT NULL DEFAULT 30,
    "leadDays" INTEGER NOT NULL DEFAULT 3,
    "maxDays" INTEGER NOT NULL DEFAULT 180,
    "hours" INTEGER[],
    "durationHrs" INTEGER NOT NULL DEFAULT 3,
    "capacity" INTEGER,
    "coverage" TEXT[],
    "partner" BOOLEAN NOT NULL DEFAULT false,
    "partnerAvailable" BOOLEAN NOT NULL DEFAULT true,
    "included" TEXT[],
    "excluded" TEXT[],
    "cancellation" TEXT NOT NULL DEFAULT '',
    "img" TEXT,
    "sample" BOOLEAN NOT NULL DEFAULT true,
    "fields" TEXT[],
    "req" TEXT[],
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occasion" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Occasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "delivery" BOOLEAN NOT NULL DEFAULT true,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'all',
    "reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customer" JSONB NOT NULL,
    "recipient" JSONB,
    "address" TEXT NOT NULL,
    "landmark" TEXT NOT NULL DEFAULT '',
    "areaId" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "slotLabel" TEXT NOT NULL,
    "giftMessage" TEXT NOT NULL DEFAULT '',
    "deliveryNotes" TEXT NOT NULL DEFAULT '',
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "fee" INTEGER,
    "total" INTEGER NOT NULL,
    "payments" JSONB NOT NULL,
    "rider" TEXT NOT NULL DEFAULT '',
    "history" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "notes" JSONB NOT NULL,
    "cancelReason" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT,
    "bookingDate" TEXT,
    "customerPhone" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "snapshot" JSONB,
    "customer" JSONB NOT NULL,
    "quotes" JSONB NOT NULL,
    "payments" JSONB NOT NULL,
    "history" JSONB NOT NULL,
    "messages" JSONB NOT NULL,
    "notes" JSONB NOT NULL,
    "team" TEXT NOT NULL DEFAULT '',
    "schedule" JSONB,
    "terms" JSONB,
    "reschedule" JSONB,
    "cancelReason" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "ownerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_dept_cat_idx" ON "Product"("dept", "cat");

-- CreateIndex
CREATE INDEX "Block_date_idx" ON "Block"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");

-- CreateIndex
CREATE INDEX "Order_date_slotId_idx" ON "Order"("date", "slotId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Request_ref_key" ON "Request"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "Request_token_key" ON "Request"("token");

-- CreateIndex
CREATE INDEX "Request_kind_status_idx" ON "Request"("kind", "status");

-- CreateIndex
CREATE INDEX "Request_serviceId_bookingDate_idx" ON "Request"("serviceId", "bookingDate");

-- CreateIndex
CREATE INDEX "Request_customerPhone_idx" ON "Request"("customerPhone");

-- CreateIndex
CREATE INDEX "AuditEntry_at_idx" ON "AuditEntry"("at");
