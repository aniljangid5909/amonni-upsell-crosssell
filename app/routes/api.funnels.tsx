import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";
import { getCurrentPlanByToken, getMonthlyImpressions, PLAN_LIMITS } from "../plan.server";

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

  // Check plan and enforce impression limit
  const [plan, monthlyImpressions] = await Promise.all([
    getCurrentPlanByToken(shop),
    getMonthlyImpressions(shop),
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

  if (!matched.length) return json({ funnels: [] }, { headers: CORS });

  // Collect all offer product IDs across funnels (including multi-product funnels)
  const allOfferIds = [...new Set(matched.flatMap((f) => {
    const ids = f.offerProductIds && f.offerProductIds.length > 0 ? f.offerProductIds : (f.offerProductId ? [f.offerProductId] : []);
    return ids;
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
      }
    }
  } catch (_) {}

  // Expand multi-product funnels into individual offer entries
  const result: object[] = [];
  for (const f of matched) {
    const ids = f.offerProductIds && f.offerProductIds.length > 0 ? f.offerProductIds : (f.offerProductId ? [f.offerProductId] : []);
    for (let i = 0; i < ids.length; i++) {
      const pid = ids[i];
      const pd = productData[pid];
      result.push({
        id: `${f.id}_${i}`,
        funnelId: f.id,
        offerType: f.offerType,
        offerTitle: pd?.title || (i === 0 ? f.name : `Product ${pid}`),
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

  return json({ funnels: result }, { headers: CORS });
};
