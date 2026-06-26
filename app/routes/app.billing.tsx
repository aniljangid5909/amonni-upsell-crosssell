import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";

const IS_TEST = process.env.SHOPIFY_BILLING_TEST !== "false";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan") ?? "";
  const interval = url.searchParams.get("interval") ?? "monthly";
  const host = url.searchParams.get("host") ?? "";

  const planNames: Record<string, string> = {
    growth: interval === "yearly" ? "Amoni Upsell Growth (Yearly)" : "Amoni Upsell Growth (Monthly)",
    pro: interval === "yearly" ? "Amoni Upsell Pro (Yearly)" : "Amoni Upsell Pro (Monthly)",
  };
  const planName = planNames[planId];
  if (!planName) {
    return json({ error: "Invalid plan", confirmationUrl: null, host });
  }

  const authHeader = request.headers.get("Authorization");
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const returnUrl = `${url.origin}/app/pricing?shop=${shop}&host=${host}&billing=1`;

  const price = planId === "pro"
    ? (interval === "yearly" ? 479.88 : 49.99)
    : (interval === "yearly" ? 191.88 : 19.99);

  try {
    const res = await admin.graphql(
      `#graphql
      mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
          appSubscription { id }
          confirmationUrl
          userErrors { field message }
        }
      }`,
      {
        variables: {
          name: planName,
          returnUrl,
          test: IS_TEST,
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: { amount: price, currencyCode: "USD" },
                interval: interval === "yearly" ? "ANNUAL" : "EVERY_30_DAYS",
              }
            }
          }],
        }
      }
    );

    const body = await res.json();
    const result = body?.data?.appSubscriptionCreate;

    if (result?.userErrors?.length) {
      return json({ error: result.userErrors.map((e: any) => e.message).join(", "), confirmationUrl: null, host });
    }

    const confirmationUrl = result?.confirmationUrl;
    if (confirmationUrl) return json({ confirmationUrl, error: null, host });

    return json({ error: `No URL. isOnline:${session.isOnline} authHeader:${authHeader ? "yes" : "no"} body:${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null, host });
  } catch (err: any) {
    if (err instanceof Response) {
      const text = await err.text().catch(() => "");
      return json({ error: `HTTP ${err.status} isOnline:${session.isOnline} authHeader:${authHeader ? "yes" : "no"}: ${text.slice(0, 300)}`, confirmationUrl: null, host });
    }
    return json({ error: `${err?.message || String(err)} | isOnline:${session.isOnline} authHeader:${authHeader ? "yes" : "no"}`, confirmationUrl: null, host });
  }
};

export default function BillingPage() {
  const { confirmationUrl, error, host } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    if (confirmationUrl) {
      // Navigate the top frame (parent Shopify Admin) to the billing approval page
      window.top!.location.href = confirmationUrl;
    }
  }, [confirmationUrl]);

  if (error) {
    return (
      <div style={{ fontFamily: "monospace", padding: 32 }}>
        <h2>Billing error</h2>
        <pre style={{ background: "#fee", padding: 16, borderRadius: 8 }}>{error}</pre>
        <button onClick={() => navigate(`/app/pricing?host=${host}`)}>Back to pricing</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: 32, textAlign: "center" }}>
      <p>Redirecting to Shopify payment page…</p>
    </div>
  );
}
