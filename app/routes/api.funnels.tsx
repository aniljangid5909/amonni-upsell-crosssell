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

  const result = matched.slice(0, 3).map((f) => ({
    id: f.id,
    offerType: f.offerType,
    offerProductId: f.offerProductId,
    offerImageUrl: f.offerImageUrl,
    offerVariantId: f.offerVariantId,
    offerPrice: f.offerPrice,
    discountType: f.discountType,
    discountValue: f.discountValue,
    discountCode: f.discountCode,
  }));

  return json({ funnels: result }, { headers: CORS });
};
