import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Page, Layout, Text, BlockStack, InlineStack, Badge, Button, Divider, Box } from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";

// ── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for new stores getting started with upselling",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null as string | null,
    features: [
      "1 active funnel",
      "Up to 100 impressions/month",
      "Cross-sell on product page",
      "Basic analytics",
      "Email support",
    ],
    limits: ["No cart drawer widget", "No bundle offers"],
    cta: "Current plan",
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For growing stores that want to maximise revenue",
    monthlyPrice: 19.99,
    yearlyPrice: 15.99,
    badge: "Most popular",
    features: [
      "10 active funnels",
      "Unlimited impressions",
      "Cross-sell, Upsell & Bundle",
      "Product page + Cart drawer",
      "Carousel & Grid display styles",
      "Custom widget titles",
      "Discount codes",
      "Priority email support",
    ],
    limits: [],
    cta: "Start Growth",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For high-volume stores that need everything",
    monthlyPrice: 49.99,
    yearlyPrice: 39.99,
    badge: null,
    features: [
      "Unlimited funnels",
      "Unlimited impressions",
      "All offer types",
      "All placements",
      "Advanced analytics & reports",
      "A/B testing (coming soon)",
      "Remove 'Powered by Amoni' branding",
      "Dedicated Slack support",
    ],
    limits: [],
    cta: "Start Pro",
    highlight: false,
  },
];

// ── Loader — detect active subscription ──────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Check active app subscriptions via Admin GraphQL
  let activePlan = "starter";
  let billingInterval = "monthly";
  try {
    const res = await admin.graphql(`
      query {
        currentAppInstallation {
          activeSubscriptions {
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    interval
                    price { amount }
                  }
                }
              }
            }
          }
        }
      }
    `);
    const body = await res.json();
    const subs = body?.data?.currentAppInstallation?.activeSubscriptions || [];
    const active = subs.find((s: any) => s.status === "ACTIVE");
    if (active) {
      const name = (active.name || "").toLowerCase();
      if (name.includes("pro")) activePlan = "pro";
      else if (name.includes("growth")) activePlan = "growth";
      const interval = active.lineItems?.[0]?.plan?.pricingDetails?.interval || "EVERY_30_DAYS";
      billingInterval = interval === "ANNUAL" ? "yearly" : "monthly";
    }
  } catch (_) {}

  return json({
    shop: session.shop,
    host: url.searchParams.get("host") ?? "",
    activePlan,
    billingInterval,
  });
};

// ── Action — create subscription ─────────────────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") ?? "";
  const shop = session.shop;

  const formData = await request.formData();
  const planId = formData.get("planId") as string;
  const interval = formData.get("interval") as string; // "monthly" | "yearly"

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan || plan.monthlyPrice === 0) {
    return redirect(`/app/pricing?shop=${shop}&host=${host}`);
  }

  const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const gqlInterval = interval === "yearly" ? "ANNUAL" : "EVERY_30_DAYS";
  const planName = `Amoni Upsell ${plan.name} (${interval === "yearly" ? "Yearly" : "Monthly"})`;

  const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/pricing?shop=${shop}&host=${host}`;

  const res = await admin.graphql(`
    mutation AppSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: true) {
        appSubscription { id status }
        confirmationUrl
        userErrors { field message }
      }
    }
  `, {
    variables: {
      name: planName,
      returnUrl,
      lineItems: [{
        plan: {
          appRecurringPricingDetails: {
            price: { amount: price, currencyCode: "USD" },
            interval: gqlInterval,
          },
        },
      }],
    },
  });

  const body = await res.json();
  const { confirmationUrl, userErrors } = body?.data?.appSubscriptionCreate || {};

  if (userErrors?.length) {
    return json({ error: userErrors[0].message }, { status: 400 });
  }

  if (confirmationUrl) {
    return redirect(confirmationUrl);
  }

  return redirect(`/app/pricing?shop=${shop}&host=${host}`);
};

// ── UI ────────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { shop, host, activePlan, billingInterval } = useLoaderData<typeof loader>();
  const [interval, setInterval] = useState<"monthly" | "yearly">(
    billingInterval as "monthly" | "yearly"
  );
  const submit = useSubmit();
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";

  const qs = new URLSearchParams();
  if (shop) qs.set("shop", shop);
  if (host) qs.set("host", host);
  const qsStr = qs.toString() ? `?${qs.toString()}` : "";

  function handleSubscribe(planId: string) {
    submit({ planId, interval }, { method: "post" });
  }

  const yearlyDiscount = Math.round((1 - 15.99 / 19.99) * 100);

  return (
    <Page
      backAction={{ content: "Funnels", url: `/app/funnels${qsStr}` }}
      title="Pricing plans"
      subtitle="Choose the plan that fits your store. Upgrade or downgrade anytime."
    >
      <Layout>
        {/* ── Billing toggle ── */}
        <Layout.Section>
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
            <div style={{ display: "inline-flex", gap: "8px", background: "#f5f5f5", borderRadius: "12px", padding: "4px" }}>
              <button
                onClick={() => setInterval("monthly")}
                style={{
                  padding: "8px 22px",
                  borderRadius: "9px",
                  border: interval === "monthly" ? "none" : "1.5px solid #d0d0d0",
                  background: interval === "monthly" ? "#1a1a1a" : "transparent",
                  color: interval === "monthly" ? "#fff" : "#555",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval("yearly")}
                style={{
                  padding: "8px 22px",
                  borderRadius: "9px",
                  border: interval === "yearly" ? "none" : "1.5px solid #d0d0d0",
                  background: interval === "yearly" ? "#1a1a1a" : "transparent",
                  color: interval === "yearly" ? "#fff" : "#555",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.15s",
                }}
              >
                Yearly
                <span style={{ background: "#d4f5e0", color: "#0c7a3e", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px" }}>
                  Save {yearlyDiscount}%
                </span>
              </button>
            </div>
          </div>
        </Layout.Section>

        {/* ── Plan cards ── */}
        <Layout.Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "8px" }}>
            {PLANS.map((plan) => {
              const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
              const isActive = activePlan === plan.id;
              const isFree = plan.monthlyPrice === 0;

              return (
                <div
                  key={plan.id}
                  style={{
                    border: plan.highlight ? "2px solid #1a1a1a" : "1px solid #e0e0e0",
                    borderRadius: "16px",
                    padding: "28px 24px",
                    background: plan.highlight ? "#fafafa" : "#fff",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0",
                  }}
                >
                  {plan.badge && (
                    <div style={{
                      position: "absolute",
                      top: "-13px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#1a1a1a",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "4px 16px",
                      borderRadius: "20px",
                      whiteSpace: "nowrap",
                    }}>
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan name + description */}
                  <BlockStack gap="100">
                    <Text variant="headingLg" as="h2">{plan.name}</Text>
                    <Text variant="bodySm" tone="subdued" as="p">{plan.description}</Text>
                  </BlockStack>

                  {/* Price */}
                  <div style={{ margin: "20px 0" }}>
                    {isFree ? (
                      <Text variant="heading2xl" as="p">Free</Text>
                    ) : (
                      <InlineStack gap="100" blockAlign="end">
                        <Text variant="heading2xl" as="p">${price.toFixed(2)}</Text>
                        <Text variant="bodySm" tone="subdued" as="p" >
                          / mo{interval === "yearly" ? ", billed yearly" : ""}
                        </Text>
                      </InlineStack>
                    )}
                    {!isFree && interval === "yearly" && (
                      <Text variant="bodySm" tone="subdued" as="p">
                        ${(price * 12).toFixed(2)} / year
                      </Text>
                    )}
                  </div>

                  <Divider />

                  {/* Features */}
                  <div style={{ margin: "20px 0", flex: 1 }}>
                    <BlockStack gap="200">
                      {plan.features.map((f) => (
                        <InlineStack key={f} gap="200" blockAlign="start">
                          <span style={{ color: "#0c7a3e", fontWeight: 700, flexShrink: 0 }}>✓</span>
                          <Text variant="bodySm" as="span">{f}</Text>
                        </InlineStack>
                      ))}
                      {plan.limits.map((f) => (
                        <InlineStack key={f} gap="200" blockAlign="start">
                          <span style={{ color: "#aaa", flexShrink: 0 }}>✕</span>
                          <Text variant="bodySm" tone="subdued" as="span">{f}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </div>

                  {/* CTA */}
                  <div style={{ marginTop: "auto" }}>
                    {isActive ? (
                      <button
                        disabled
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid #e0e0e0",
                          background: "#f5f5f5",
                          color: "#888",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: "default",
                          fontFamily: "inherit",
                        }}
                      >
                        ✓ Current plan
                      </button>
                    ) : isFree ? (
                      <button
                        disabled
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid #e0e0e0",
                          background: "#f5f5f5",
                          color: "#888",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: "default",
                          fontFamily: "inherit",
                        }}
                      >
                        Free forever
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={loading}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "none",
                          background: plan.highlight ? "#1a1a1a" : "#f0f0f0",
                          color: plan.highlight ? "#fff" : "#1a1a1a",
                          fontWeight: 700,
                          fontSize: "14px",
                          cursor: loading ? "wait" : "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {loading ? "Redirecting..." : plan.cta}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Layout.Section>

        {/* ── Footer note ── */}
        <Layout.Section>
          <Box paddingBlock="400">
            <BlockStack gap="200" inlineAlign="center">
              <Text variant="bodySm" tone="subdued" as="p" alignment="center">
                All plans include a 7-day free trial. Cancel anytime. Payments processed securely by Shopify.
              </Text>
              <Text variant="bodySm" tone="subdued" as="p" alignment="center">
                Subscriptions are in test mode during development. Real charges apply in production.
              </Text>
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
