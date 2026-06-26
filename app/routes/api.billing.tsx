import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";

const IS_TEST = process.env.SHOPIFY_BILLING_TEST !== "false";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const sessionJwt = formData.get("token") as string;
  const planId = formData.get("plan") as string;
  const interval = (formData.get("interval") as string) || "monthly";
  const shop = formData.get("shop") as string;
  const host = (formData.get("host") as string) || "";

  if (!planId || !shop) return json({ error: "Missing plan or shop", confirmationUrl: null });
  if (!sessionJwt) return json({ error: "No session token (idToken missing)", confirmationUrl: null });

  const planNames: Record<string, string> = {
    growth: interval === "yearly" ? "Amoni Upsell Growth (Yearly)" : "Amoni Upsell Growth (Monthly)",
    pro: interval === "yearly" ? "Amoni Upsell Pro (Yearly)" : "Amoni Upsell Pro (Monthly)",
  };
  const planName = planNames[planId];
  if (!planName) return json({ error: "Invalid plan id", confirmationUrl: null });

  const price = planId === "pro"
    ? (interval === "yearly" ? 479.88 : 49.99)
    : (interval === "yearly" ? 191.88 : 19.99);

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/app/pricing?shop=${shop}&host=${host}&billing=1`;

  // Step 1: Exchange App Bridge JWT for an online access token
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
    return json({ error: "Token exchange returned no access_token", confirmationUrl: null });
  }

  // Step 2: Create subscription via GraphQL
  try {
    const gqlRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
      body: JSON.stringify({
        query: `mutation appSubscriptionCreate($name:String!,$returnUrl:URL!,$test:Boolean,$lineItems:[AppSubscriptionLineItemInput!]!){appSubscriptionCreate(name:$name,returnUrl:$returnUrl,test:$test,lineItems:$lineItems){appSubscription{id}confirmationUrl userErrors{field message}}}`,
        variables: {
          name: planName,
          returnUrl,
          test: IS_TEST,
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
    return json({ error: `No confirmationUrl: ${JSON.stringify(body).slice(0, 300)}`, confirmationUrl: null });
  } catch (e: any) {
    return json({ error: `GraphQL error: ${e?.message || String(e)}`, confirmationUrl: null });
  }
};

export const loader = () => new Response("Method not allowed", { status: 405 });
