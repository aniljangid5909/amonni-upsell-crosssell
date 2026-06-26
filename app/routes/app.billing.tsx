import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";

const IS_TEST = process.env.SHOPIFY_BILLING_TEST !== "false";

// Helper: return JSON directly (bypasses Remix's HTML render for API-style fetches)
const apiJson = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan") ?? "";
  const interval = url.searchParams.get("interval") ?? "monthly";
  const host = url.searchParams.get("host") ?? "";
  // Detect our API fetch via query param (headers can be stripped by edge proxies)
  const isApiFetch = url.searchParams.get("_api") === "1";

  const planNames: Record<string, string> = {
    growth: interval === "yearly" ? "Amoni Upsell Growth (Yearly)" : "Amoni Upsell Growth (Monthly)",
    pro: interval === "yearly" ? "Amoni Upsell Pro (Yearly)" : "Amoni Upsell Pro (Monthly)",
  };
  const planName = planNames[planId];
  if (!planName) {
    return isApiFetch ? apiJson({ error: "Invalid plan", confirmationUrl: null, host }) : json({ error: "Invalid plan", confirmationUrl: null, host });
  }

  const shop = url.searchParams.get("shop") ?? "";
  const sessionJwt = url.searchParams.get("token") ?? "";

  const price = planId === "pro"
    ? (interval === "yearly" ? 479.88 : 49.99)
    : (interval === "yearly" ? 191.88 : 19.99);

  // API path: token and _api=1 both present — do manual token exchange
  if (isApiFetch && sessionJwt && shop) {
    let accessToken: string | null = null;

    try {
      const exchRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: sessionJwt,
          subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
          client_id: process.env.SHOPIFY_API_KEY!,
          client_secret: process.env.SHOPIFY_API_SECRET!,
          requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
        }).toString(),
      });
      const exchData = await exchRes.json();
      if (!exchRes.ok) {
        return apiJson({ error: `Token exchange failed: HTTP ${exchRes.status} — ${JSON.stringify(exchData).slice(0, 300)}`, confirmationUrl: null, host });
      }
      accessToken = exchData.access_token;
    } catch (e: any) {
      return apiJson({ error: `Token exchange error: ${e?.message || String(e)}`, confirmationUrl: null, host });
    }

    if (!accessToken) {
      return apiJson({ error: "Token exchange returned no access_token", confirmationUrl: null, host });
    }

    const returnUrl = `${url.origin}/app/pricing?shop=${shop}&host=${host}&billing=1`;
    try {
      const gqlRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
        body: JSON.stringify({
          query: `mutation appSubscriptionCreate($name:String!,$returnUrl:URL!,$test:Boolean,$lineItems:[AppSubscriptionLineItemInput!]!){appSubscriptionCreate(name:$name,returnUrl:$returnUrl,test:$test,lineItems:$lineItems){appSubscription{id}confirmationUrl userErrors{field message}}}`,
          variables: { name: planName, returnUrl, test: IS_TEST, lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: price, currencyCode: "USD" }, interval: interval === "yearly" ? "ANNUAL" : "EVERY_30_DAYS" } } }] },
        }),
      });
      const body = await gqlRes.json();
      if (!gqlRes.ok) return apiJson({ error: `GraphQL HTTP ${gqlRes.status}: ${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null, host });
      const result = body?.data?.appSubscriptionCreate;
      if (result?.userErrors?.length) return apiJson({ error: result.userErrors.map((e: any) => e.message).join(", "), confirmationUrl: null, host });
      const confirmationUrl = result?.confirmationUrl;
      if (confirmationUrl) return apiJson({ confirmationUrl, error: null, host });
      return apiJson({ error: `No URL from GraphQL: ${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null, host });
    } catch (e: any) {
      return apiJson({ error: `GraphQL error: ${e?.message || String(e)}`, confirmationUrl: null, host });
    }
  }

  // Non-API path (page navigation) — use SDK normally
  const { admin, session } = await authenticate.admin(request);
  const returnUrl = `${url.origin}/app/pricing?shop=${session.shop}&host=${host}&billing=1`;

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
      return isApiFetch ? apiJson({ error: result.userErrors.map((e: any) => e.message).join(", "), confirmationUrl: null, host }) : json({ error: result.userErrors.map((e: any) => e.message).join(", "), confirmationUrl: null, host });
    }

    const confirmationUrl = result?.confirmationUrl;
    const R = (d: object) => isApiFetch ? apiJson(d) : json(d);
    if (confirmationUrl) return R({ confirmationUrl, error: null, host });

    return R({ error: `No URL. isOnline:${session.isOnline} authHeader:${authHeader ? "yes" : "no"} body:${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null, host });
  } catch (err: any) {
    const R = (d: object) => isApiFetch ? apiJson(d) : json(d);
    if (err instanceof Response) {
      const text = await err.text().catch(() => "");
      return R({ error: `HTTP ${err.status} isOnline:${session.isOnline} authHeader:${authHeader ? "yes" : "no"}: ${text.slice(0, 300)}`, confirmationUrl: null, host });
    }
    return R({ error: `${err?.message || String(err)} | isOnline:${session.isOnline} authHeader:${authHeader ? "yes" : "no"}`, confirmationUrl: null, host });
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
