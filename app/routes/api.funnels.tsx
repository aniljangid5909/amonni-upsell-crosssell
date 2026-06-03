import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma, unauthenticated } from "../shopify.server";

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

  try {
    const { storefront } = await unauthenticated.storefront(shop);
    const enriched = await Promise.all(
      matched.slice(0, 3).map(async (funnel) => {
        const gid = `gid://shopify/Product/${funnel.offerProductId}`;
        const result = await storefront.graphql(
          `query getProduct($id: ID!) {
            product(id: $id) {
              title
              featuredImage { url }
              variants(first: 1) {
                nodes { id price { amount } }
              }
            }
          }`,
          { variables: { id: gid } }
        );
        const data = await result.json();
        const p = data?.data?.product;
        const variant = p?.variants?.nodes?.[0];
        return {
          ...funnel,
          offerName: p?.title || "Special offer",
          offerImageUrl: p?.featuredImage?.url || "",
          offerVariantId:
            variant?.id?.replace("gid://shopify/ProductVariant/", "") || "",
          offerPrice: parseFloat(variant?.price?.amount || "0"),
        };
      })
    );
    return json({ funnels: enriched }, { headers: CORS });
  } catch {
    return json({ funnels: matched }, { headers: CORS });
  }
};
