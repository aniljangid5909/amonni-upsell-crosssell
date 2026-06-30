import { prisma } from "./shopify.server";

export async function getShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function updateShopSettings(
  shop: string,
  data: Partial<{
    widgetPosition: string;
    accentColor: string;
    borderRadius: number;
    showPoweredBy: boolean;
    buttonColor: string;
    buttonTextColor: string;
    widgetBgColor: string;
    widgetTitleColor: string;
    showOnMobile: boolean;
    animationStyle: string;
    autoCloseSeconds: number;
    emailReports: boolean;
    emailReportFrequency: string;
    notificationEmail: string;
  }>
) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop, ...data },
    update: data,
  });
}
