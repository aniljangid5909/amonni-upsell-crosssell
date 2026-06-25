import { prisma } from "./shopify.server";

// ── Plan definitions ──────────────────────────────────────────────────────────
export type PlanId = "starter" | "growth" | "pro";

export const PLAN_LIMITS: Record<PlanId, {
  maxFunnels: number;
  maxImpressionsPerMonth: number;
  allowedPlacements: string[];
  allowedOfferTypes: string[];
  cartDrawer: boolean;
  discountCodes: boolean;
  displayStyles: boolean;
  customWidgetTitle: boolean;
}> = {
  starter: {
    maxFunnels: 1,
    maxImpressionsPerMonth: 100,
    allowedPlacements: ["product"],
    allowedOfferTypes: ["cross-sell"],
    cartDrawer: false,
    discountCodes: false,
    displayStyles: false,
    customWidgetTitle: false,
  },
  growth: {
    maxFunnels: 10,
    maxImpressionsPerMonth: Infinity,
    allowedPlacements: ["product", "cart", "post-purchase", "checkout"],
    allowedOfferTypes: ["cross-sell", "upsell", "bundle"],
    cartDrawer: true,
    discountCodes: true,
    displayStyles: true,
    customWidgetTitle: true,
  },
  pro: {
    maxFunnels: Infinity,
    maxImpressionsPerMonth: Infinity,
    allowedPlacements: ["product", "cart", "post-purchase", "checkout"],
    allowedOfferTypes: ["cross-sell", "upsell", "bundle"],
    cartDrawer: true,
    discountCodes: true,
    displayStyles: true,
    customWidgetTitle: true,
  },
};

// Simple in-memory cache: shop → { plan, expiresAt }
const planCache = new Map<string, { plan: PlanId; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the current plan for a shop by checking Shopify active subscriptions.
 * Falls back to "starter" if no paid subscription found.
 */
export async function getCurrentPlan(
  admin: { graphql: (query: string) => Promise<Response> },
  shop: string
): Promise<PlanId> {
  const cached = planCache.get(shop);
  if (cached && cached.expiresAt > Date.now()) return cached.plan;

  let plan: PlanId = "starter";
  try {
    const res = await admin.graphql(`
      query {
        currentAppInstallation {
          activeSubscriptions {
            name
            status
          }
        }
      }
    `);
    const body = await res.json();
    const subs = body?.data?.currentAppInstallation?.activeSubscriptions || [];
    const active = subs.find((s: { name: string; status: string }) => s.status === "ACTIVE");
    if (active) {
      const name = (active.name || "").toLowerCase();
      if (name.includes("pro")) plan = "pro";
      else if (name.includes("growth")) plan = "growth";
    }
  } catch (_) {}

  planCache.set(shop, { plan, expiresAt: Date.now() + CACHE_TTL_MS });
  return plan;
}

/**
 * Returns current plan using the stored offline session token (for public API routes).
 */
export async function getCurrentPlanByToken(shop: string): Promise<PlanId> {
  const cached = planCache.get(shop);
  if (cached && cached.expiresAt > Date.now()) return cached.plan;

  let plan: PlanId = "starter";
  try {
    const session = await prisma.session.findFirst({
      where: { shop, isOnline: false },
      select: { accessToken: true },
    });
    if (!session?.accessToken) return plan;

    const res = await fetch(
      `https://${shop}/admin/api/2024-01/recurring_application_charges.json`,
      { headers: { "X-Shopify-Access-Token": session.accessToken } }
    );
    if (res.ok) {
      const data = await res.json();
      const charges = data.recurring_application_charges || [];
      const active = charges.find((c: { status: string; name: string }) => c.status === "active");
      if (active) {
        const name = (active.name || "").toLowerCase();
        if (name.includes("pro")) plan = "pro";
        else if (name.includes("growth")) plan = "growth";
      }
    }
  } catch (_) {}

  planCache.set(shop, { plan, expiresAt: Date.now() + CACHE_TTL_MS });
  return plan;
}

/** Counts impressions this calendar month for a shop */
export async function getMonthlyImpressions(shop: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return prisma.funnelEvent.count({
    where: { shop, eventType: "impression", createdAt: { gte: start } },
  });
}
