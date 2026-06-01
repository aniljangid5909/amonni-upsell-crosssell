import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma, unauthenticated } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const placement = url.searchParams.get("placement");
  const productIds = url.searchParams.get("productIds")?.split(",").filter(Boolean) || [];

  if (!shop) return json({ funnels: [] });

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
          f.triggerProductIds.some((id) => productIds.includes(id))
        )
      : funnels;

  if (!matched.length) return json({ funnels: [] });

  // Fetch product details from Shopify storefront API
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
    return json({ funnels: enriched });
  } catch {
    return json({ funnels: matched });
  }
};
