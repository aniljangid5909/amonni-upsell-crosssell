import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";

// Clears the stored offline session so the next request triggers a fresh OAuth
// flow and Shopify issues a new expiring offline token.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return new Response("Missing shop param", { status: 400 });

  await prisma.session.deleteMany({ where: { shop } });

  return redirect(`/auth?shop=${shop}`);
};
