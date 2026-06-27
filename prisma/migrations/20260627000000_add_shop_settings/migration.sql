-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "widgetPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "accentColor" TEXT NOT NULL DEFAULT '#000000',
    "borderRadius" INTEGER NOT NULL DEFAULT 8,
    "showPoweredBy" BOOLEAN NOT NULL DEFAULT true,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "animationStyle" TEXT NOT NULL DEFAULT 'slide',
    "autoCloseSeconds" INTEGER NOT NULL DEFAULT 0,
    "emailReports" BOOLEAN NOT NULL DEFAULT false,
    "emailReportFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "notificationEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");
