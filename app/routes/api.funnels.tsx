import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";
import { getCurrentPlanByToken, getMonthlyImpressions, PLAN_LIMITS } from "../plan.server";
import { updateShopSettings } from "../settings.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const placement = url.searchParams.get("placement");
  const productIds = url.searchParams.get("productIds")?.split(",").filter(Boolean) || [];

  if (!shop) return json({ funnels: [] }, { headers: CORS });

  // Check plan, settings, and enforce impression limit
  const [plan, monthlyImpressions, shopSettings] = await Promise.all([
    getCurrentPlanByToken(shop),
    getMonthlyImpressions(shop),
    prisma.shopSettings.findUnique({ where: { shop } }),
  ]);
  const limits = PLAN_LIMITS[plan];
  if (isFinite(limits.maxImpressionsPerMonth) && monthlyImpressions >= limits.maxImpressionsPerMonth) {
    return json({ funnels: [], limitReached: true }, { headers: CORS });
  }

  const funnels = await prisma.funnel.findMany({
    where: {
      shop,
      status: "active",
      ...(placement ? { placement } : {}),
    },
    orderBy: { priority: "desc" },
    take: 10,
  });

  const matched = funnels.filter((f) => {
    // Enforce plan: skip funnels for placements/types the plan doesn't allow
    if (!limits.allowedPlacements.includes(f.placement)) return false;
    if (!limits.allowedOfferTypes.includes(f.offerType)) return false;
    // Match by trigger product
    if (productIds.length > 0) {
      return f.triggerProductIds.length === 0 || f.triggerProductIds.some((id) => productIds.includes(id));
    }
    return true;
  });

  if (!matched.length) return json({ funnels: [], showPoweredBy: true }, { headers: CORS });

  // Normalize a product ID — strip GID prefix if present
  const toNumericId = (id: string) => id.replace(/^gid:\/\/shopify\/Product\//, "");

  // Collect all offer product IDs across funnels (including multi-product funnels)
  const allOfferIds = [...new Set(matched.flatMap((f) => {
    const ids = f.offerProductIds && f.offerProductIds.length > 0 ? f.offerProductIds : (f.offerProductId ? [f.offerProductId] : []);
    return ids.map(toNumericId);
  }).filter(Boolean))];

  const productData: Record<string, { title: string; imageUrl: string; variantId: string; price: number }> = {};

  try {
    const session = await prisma.session.findFirst({
      where: { shop, isOnline: false },
      select: { accessToken: true },
    });

    if (session?.accessToken && allOfferIds.length > 0) {
      const res = await fetch(
        `https://${shop}/admin/api/2024-01/products.json?ids=${allOfferIds.join(",")}&fields=id,title,images,variants&limit=50`,
        { headers: { "X-Shopify-Access-Token": session.accessToken } }
      );
      if (res.ok) {
        const data = await res.json();
        (data.products || []).forEach((p: { id: number; title: string; images: Array<{ src: string }>; variants: Array<{ id: number; price: string }> }) => {
          productData[String(p.id)] = {
            title: p.title,
            imageUrl: p.images?.[0]?.src || "",
            variantId: p.variants?.[0]?.id ? String(p.variants[0].id) : "",
            price: parseFloat(p.variants?.[0]?.price || "0"),
          };
        });
      } else {
        console.error("[amoni/funnels] Shopify products API error:", res.status, await res.text());
      }
    }
  } catch (err) {
    console.error("[amoni/funnels] Product lookup failed:", err);
  }

  // Expand multi-product funnels into individual offer entries
  const result: object[] = [];
  for (const f of matched) {
    const ids = f.offerProductIds && f.offerProductIds.length > 0 ? f.offerProductIds : (f.offerProductId ? [f.offerProductId] : []);
    for (let i = 0; i < ids.length; i++) {
      const pid = ids[i];
      const pd = productData[toNumericId(pid)];
      result.push({
        id: `${f.id}_${i}`,
        funnelId: f.id,
        offerType: f.offerType,
        offerTitle: pd?.title || f.offerTitle || "",
        offerProductId: pid,
        offerImageUrl: pd?.imageUrl || (i === 0 ? f.offerImageUrl : ""),
        offerVariantId: pd?.variantId || (i === 0 ? f.offerVariantId : ""),
        offerPrice: pd?.price ?? (i === 0 ? f.offerPrice : 0),
        discountType: limits.discountCodes ? f.discountType : "none",
        discountValue: limits.discountCodes ? f.discountValue : 0,
        discountCode: limits.discountCodes ? f.discountCode : "",
        displayStyle: limits.displayStyles ? f.displayStyle : "carousel",
        widgetTitle: limits.customWidgetTitle ? f.widgetTitle : "",
      });
      if (result.length >= 10) break;
    }
    if (result.length >= 10) break;
  }

  // Only Pro plan can hide the branding; all other plans always show it
  const showPoweredBy = plan === 'pro' ? (shopSettings?.showPoweredBy ?? true) : true;
  const isGrowthPlus = plan === 'growth' || plan === 'pro';
  const isPro = plan === 'pro';
  const buttonColor = isGrowthPlus ? (shopSettings?.buttonColor ?? '#1a1a1a') : '#1a1a1a';
  const buttonTextColor = isPro ? (shopSettings?.buttonTextColor ?? '#ffffff') : '#ffffff';
  const widgetBgColor = isPro ? (shopSettings?.widgetBgColor ?? '#ffffff') : '#ffffff';
  const widgetTitleColor = isGrowthPlus ? (shopSettings?.widgetTitleColor ?? '#1a1a1a') : '#1a1a1a';
  const cardBgColor = isGrowthPlus ? ((shopSettings as any)?.cardBgColor ?? '#ffffff') : '#ffffff';
  const borderRadius = shopSettings?.borderRadius ?? 8;

  // Async reset: if DB has non-default values for features the current plan doesn't support, wipe them
  if (shopSettings) {
    const resets: Record<string, any> = {};
    if (!isGrowthPlus) {
      if (shopSettings.buttonColor !== '#1a1a1a') resets.buttonColor = '#1a1a1a';
      if ((shopSettings as any).widgetTitleColor !== '#1a1a1a') resets.widgetTitleColor = '#1a1a1a';
      if ((shopSettings as any).cardBgColor !== '#ffffff') resets.cardBgColor = '#ffffff';
      if (shopSettings.accentColor !== '#000000') resets.accentColor = '#000000';
    }
    if (!isPro) {
      if ((shopSettings as any).buttonTextColor !== '#ffffff') resets.buttonTextColor = '#ffffff';
      if ((shopSettings as any).widgetBgColor !== '#ffffff') resets.widgetBgColor = '#ffffff';
      if (shopSettings.showPoweredBy !== true) resets.showPoweredBy = true;
    }
    if (Object.keys(resets).length > 0) {
      updateShopSettings(shop, resets).catch(() => {});
    }
  }

  return json({ funnels: result, showPoweredBy, buttonColor, buttonTextColor, widgetBgColor, widgetTitleColor, cardBgColor, borderRadius }, { headers: CORS });
};
