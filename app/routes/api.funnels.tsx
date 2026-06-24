import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";

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

  const funnels = await prisma.funnel.findMany({
    where: {
      shop,
      status: "active",
      ...(placement ? { placement } : {}),
    },
    orderBy: { priority: "desc" },
    take: 10,
  });

  const matched =
    productIds.length > 0
      ? funnels.filter((f) =>
          f.triggerProductIds.length === 0 ||
          f.triggerProductIds.some((id) => productIds.includes(id))
        )
      : funnels;

  if (!matched.length) return json({ funnels: [] }, { headers: CORS });

  // Fetch real product titles from Shopify Admin API using the stored offline token
  const offerProductIds = [...new Set(matched.map((f) => f.offerProductId).filter(Boolean))];
  const productTitles: Record<string, string> = {};

  try {
    const session = await prisma.session.findFirst({
      where: { shop, isOnline: false },
      select: { accessToken: true },
    });

    if (session?.accessToken && offerProductIds.length > 0) {
      const res = await fetch(
        `https://${shop}/admin/api/2024-01/products.json?ids=${offerProductIds.join(",")}&fields=id,title&limit=50`,
        { headers: { "X-Shopify-Access-Token": session.accessToken } }
      );
      if (res.ok) {
        const data = await res.json();
        (data.products || []).forEach((p: { id: number; title: string }) => {
          productTitles[String(p.id)] = p.title;
        });
      }
    }
  } catch (_) {}

  const result = matched.slice(0, 6).map((f) => ({
    id: f.id,
    offerType: f.offerType,
    offerTitle: productTitles[f.offerProductId] || f.name,
    offerProductId: f.offerProductId,
    offerImageUrl: f.offerImageUrl,
    offerVariantId: f.offerVariantId,
    offerPrice: f.offerPrice,
    discountType: f.discountType,
    discountValue: f.discountValue,
    discountCode: f.discountCode,
    displayStyle: f.displayStyle,
    widgetTitle: f.widgetTitle,
  }));

  return json({ funnels: result }, { headers: CORS });
};
