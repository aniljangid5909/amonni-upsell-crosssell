import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const IS_TEST = process.env.SHOPIFY_BILLING_TEST !== "false";

// Full-page loader — client navigates window.top here so Shopify can
// handle the OAuth redirect chain and then the billing confirmation redirect.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan") ?? "";
  const interval = url.searchParams.get("interval") ?? "monthly";

  const planNames: Record<string, string> = {
    growth: interval === "yearly" ? "Amoni Upsell Growth (Yearly)" : "Amoni Upsell Growth (Monthly)",
    pro: interval === "yearly" ? "Amoni Upsell Pro (Yearly)" : "Amoni Upsell Pro (Monthly)",
  };
  const planName = planNames[planId];
  if (!planName) {
    return new Response("Invalid plan", { status: 400 });
  }

  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const host = url.searchParams.get("host") ?? "";
  const returnUrl = `${url.origin}/app/pricing?shop=${shop}&host=${host}&billing=1`;

  // billing.request() throws a redirect to Shopify's billing confirmation page.
  // We let it propagate — Remix will follow it and the browser will land on
  // Shopify's payment approval screen.
  await billing.request({
    plan: planName as any,
    isTest: IS_TEST,
    returnUrl,
  });

  // Should not reach here
  return new Response("Billing redirect failed", { status: 500 });
};
