import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";

const IS_TEST = process.env.SHOPIFY_BILLING_TEST !== "false";

// POST action — called via fetch() from the pricing page.
// Remix always returns action data directly (not wrapped in HTML).
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const sessionJwt = formData.get("token") as string;
  const planId = formData.get("plan") as string;
  const interval = (formData.get("interval") as string) || "monthly";
  const shop = formData.get("shop") as string;
  const host = (formData.get("host") as string) || "";

  const planNames: Record<string, string> = {
    growth: interval === "yearly" ? "Amoni Upsell Growth (Yearly)" : "Amoni Upsell Growth (Monthly)",
    pro: interval === "yearly" ? "Amoni Upsell Pro (Yearly)" : "Amoni Upsell Pro (Monthly)",
  };
  const planName = planNames[planId];
  if (!planName) return json({ error: "Invalid plan", confirmationUrl: null });
  if (!shop) return json({ error: "Missing shop", confirmationUrl: null });

  const price = planId === "pro"
    ? (interval === "yearly" ? 479.88 : 49.99)
    : (interval === "yearly" ? 191.88 : 19.99);

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/app/pricing?shop=${shop}&host=${host}&billing=1`;

  // Step 1: Exchange session JWT for an online access token
  if (!sessionJwt) {
    return json({ error: "No session token provided (idToken missing)", confirmationUrl: null });
  }

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
      return json({ error: `Token exchange HTTP ${exchRes.status}: ${JSON.stringify(exchData).slice(0, 300)}`, confirmationUrl: null });
    }
    accessToken = exchData.access_token;
  } catch (e: any) {
    return json({ error: `Token exchange error: ${e?.message || String(e)}`, confirmationUrl: null });
  }

  if (!accessToken) {
    return json({ error: "Token exchange succeeded but returned no access_token", confirmationUrl: null });
  }

  // Step 2: Create subscription via GraphQL
  try {
    const gqlRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
      body: JSON.stringify({
        query: `mutation appSubscriptionCreate($name:String!,$returnUrl:URL!,$test:Boolean,$lineItems:[AppSubscriptionLineItemInput!]!){appSubscriptionCreate(name:$name,returnUrl:$returnUrl,test:$test,lineItems:$lineItems){appSubscription{id}confirmationUrl userErrors{field message}}}`,
        variables: {
          name: planName, returnUrl, test: IS_TEST,
          lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: price, currencyCode: "USD" }, interval: interval === "yearly" ? "ANNUAL" : "EVERY_30_DAYS" } } }],
        },
      }),
    });
    const body = await gqlRes.json();
    if (!gqlRes.ok) return json({ error: `GraphQL HTTP ${gqlRes.status}: ${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null });
    const result = body?.data?.appSubscriptionCreate;
    if (result?.userErrors?.length) return json({ error: result.userErrors.map((e: any) => e.message).join(", "), confirmationUrl: null });
    const confirmationUrl = result?.confirmationUrl;
    if (confirmationUrl) return json({ confirmationUrl, error: null });
    return json({ error: `No confirmationUrl in response: ${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null });
  } catch (e: any) {
    return json({ error: `GraphQL error: ${e?.message || String(e)}`, confirmationUrl: null });
  }
};

// GET loader — only used when navigating to this page directly
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop });
};

export default function BillingPage() {
  const { shop } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: "sans-serif", padding: 32, textAlign: "center" }}>
      <p>Billing page. <button onClick={() => navigate("/app/pricing")}>Back</button></p>
    </div>
  );
}
