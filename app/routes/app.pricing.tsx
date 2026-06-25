import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { Page, Layout, Text, BlockStack, InlineStack, Box, Divider, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { clearPlanCache, setPlanOverride } from "../plan.server";

const IS_TEST = process.env.NODE_ENV !== "production";

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
    limits: ["No cart drawer widget", "No bundle offers", "No upsell offers"],
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
      "Product page + Cart drawer + Post-purchase + Checkout",
      "Carousel & Grid display styles",
      "Custom widget titles",
      "Discount codes",
      "7-day free trial",
      "Priority email support",
    ],
    limits: [],
    cta: "Start Growth – 7 days free",
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
      "All offer types & placements",
      "Advanced analytics & reports",
      "A/B testing (coming soon)",
      "Remove 'Powered by Amoni' branding",
      "7-day free trial",
      "Dedicated Slack support",
    ],
    limits: [],
    cta: "Start Pro – 7 days free",
    highlight: false,
  },
];

// ── Loader — detect active subscription ──────────────────────────────────────
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shop = session.shop;

  // Clear cache when returning from billing confirmation so plan shows immediately
  const fromBilling = url.searchParams.get("billing") === "1";
  if (fromBilling) clearPlanCache(shop);

  let activePlan = "starter";
  let activePlanName = "";
  let billingInterval = "monthly";
  let activeSubscriptionId = "";

  try {
    const res = await admin.graphql(`
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
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
      activePlanName = active.name || "";
      activeSubscriptionId = active.id || "";
      const name = activePlanName.toLowerCase();
      if (name.includes("pro")) activePlan = "pro";
      else if (name.includes("growth")) activePlan = "growth";
      const interval = active.lineItems?.[0]?.plan?.pricingDetails?.interval || "EVERY_30_DAYS";
      billingInterval = interval === "ANNUAL" ? "yearly" : "monthly";
    }
  } catch (_) {}

  return json({
    shop,
    host: url.searchParams.get("host") ?? "",
    activePlan,
    activePlanName,
    billingInterval,
    activeSubscriptionId,
    fromBilling,
    isTest: IS_TEST,
    showDevPanel: process.env.DISABLE_DEV_OVERRIDE !== "true",
  });
};

// ── Action — create or cancel subscription ───────────────────────────────────
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") ?? "";
  const shop = session.shop;

  const formData = await request.formData();
  const _action = formData.get("_action") as string;

  // Dev override — bypass billing for local testing
  if (_action === "dev_override" && process.env.DISABLE_DEV_OVERRIDE !== "true") {
    const overridePlan = formData.get("overridePlan") as string;
    if (overridePlan === "growth" || overridePlan === "pro" || overridePlan === "starter") {
      setPlanOverride(shop, overridePlan);
    }
    return redirect(`/app/pricing?shop=${shop}&host=${host}&billing=1`);
  }

  // Cancel subscription
  if (_action === "cancel") {
    const subscriptionId = formData.get("subscriptionId") as string;
    if (subscriptionId) {
      try {
        await admin.graphql(`
          mutation AppSubscriptionCancel($id: ID!) {
            appSubscriptionCancel(id: $id) {
              appSubscription { id status }
              userErrors { field message }
            }
          }
        `, { variables: { id: subscriptionId } });
        clearPlanCache(shop);
      } catch (_) {}
    }
    return redirect(`/app/pricing?shop=${shop}&host=${host}&billing=1`);
  }

  // Create subscription using the adapter's built-in billing API
  const planId = formData.get("planId") as string;
  const interval = formData.get("interval") as string;

  const plan = PLANS.find((p) => p.id === planId);
  if (!plan || plan.monthlyPrice === 0) {
    return redirect(`/app/pricing?shop=${shop}&host=${host}`);
  }

  const planName = `Amoni Upsell ${plan.name} (${interval === "yearly" ? "Yearly" : "Monthly"})` as const;

  try {
    // billing.request() redirects to Shopify's billing confirmation page automatically
    await billing.request({ plan: planName, isTest: IS_TEST, returnObject: false });
    // If we get here, the redirect was somehow skipped — fall through to home
    return redirect(`/app/pricing?shop=${shop}&host=${host}&billing=1`);
  } catch (err: any) {
    if (err instanceof Response) {
      // This is a redirect thrown by billing.request — let Remix/App Bridge handle it
      throw err;
    }
    const msg = err?.message || String(err);
    return json({ error: `Billing error: ${msg}`, confirmationUrl: null });
  }
};

// ── UI ────────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const { shop, host, activePlan, activePlanName, billingInterval, activeSubscriptionId, fromBilling, isTest, showDevPanel } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [interval, setInterval] = useState<"monthly" | "yearly">(
    billingInterval as "monthly" | "yearly"
  );
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ confirmationUrl: string | null; error: string | null }>();
  const loading = navigation.state === "submitting";

  // When Shopify returns a billing confirmation URL, do a top-level redirect
  // (window.top breaks out of the embedded app iframe to Shopify's billing page)
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.top!.location.href = actionData.confirmationUrl;
    }
  }, [actionData]);

  const qs = new URLSearchParams();
  if (shop) qs.set("shop", shop);
  if (host) qs.set("host", host);
  const qsStr = qs.toString() ? `?${qs.toString()}` : "";

  function handleSubscribe(planId: string) {
    submit({ _action: "subscribe", planId, interval }, { method: "post" });
  }

  function handleCancel() {
    if (!confirm("Cancel your subscription? You'll be downgraded to the Starter plan.")) return;
    submit({ _action: "cancel", subscriptionId: activeSubscriptionId }, { method: "post" });
  }

  const yearlyDiscount = Math.round((1 - 15.99 / 19.99) * 100);

  return (
    <Page
      backAction={{ content: "Funnels", onAction: () => navigate(`/app/funnels${qsStr}`) }}
      title="Pricing plans"
      subtitle="Choose the plan that fits your store. Upgrade or downgrade anytime."
    >
      <Layout>
        {/* Success banner after billing */}
        {fromBilling && activePlan !== "starter" && (
          <Layout.Section>
            <Banner tone="success" title={`${activePlanName} activated!`}>
              <p>Your plan is now active. All {activePlan === "pro" ? "Pro" : "Growth"} features are unlocked.</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Error from action */}
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Subscription error">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Test mode notice */}
        {isTest && (
          <Layout.Section>
            <Banner tone="info" title="Test mode">
              <p>Subscriptions are in test mode — no real charges will be made. Use Shopify&apos;s test credit card to approve.</p>
            </Banner>
          </Layout.Section>
        )}

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
                    background: isActive ? "#f8fff8" : plan.highlight ? "#fafafa" : "#fff",
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

                  <BlockStack gap="100">
                    <Text variant="headingLg" as="h2">{plan.name}</Text>
                    <Text variant="bodySm" tone="subdued" as="p">{plan.description}</Text>
                  </BlockStack>

                  <div style={{ margin: "20px 0" }}>
                    {isFree ? (
                      <Text variant="heading2xl" as="p">Free</Text>
                    ) : (
                      <InlineStack gap="100" blockAlign="end">
                        <Text variant="heading2xl" as="p">${price.toFixed(2)}</Text>
                        <Text variant="bodySm" tone="subdued" as="p">
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

                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {isActive ? (
                      <>
                        <button
                          disabled
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            border: "2px solid #0c7a3e",
                            background: "#f0fff4",
                            color: "#0c7a3e",
                            fontWeight: 700,
                            fontSize: "14px",
                            cursor: "default",
                            fontFamily: "inherit",
                          }}
                        >
                          ✓ Current plan
                        </button>
                        {!isFree && activeSubscriptionId && (
                          <button
                            onClick={handleCancel}
                            disabled={loading}
                            style={{
                              width: "100%",
                              padding: "8px",
                              borderRadius: "10px",
                              border: "1px solid #e0e0e0",
                              background: "transparent",
                              color: "#888",
                              fontWeight: 500,
                              fontSize: "12px",
                              cursor: loading ? "wait" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Cancel subscription
                          </button>
                        )}
                      </>
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
                          background: plan.highlight ? "#1a1a1a" : "#333",
                          color: "#fff",
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

        {/* ── Feature comparison ── */}
        <Layout.Section>
          <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">Feature comparison</Text>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700 }}>Feature</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700 }}>Starter</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700, color: activePlan === "growth" ? "#0c7a3e" : undefined }}>Growth</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700, color: activePlan === "pro" ? "#0c7a3e" : undefined }}>Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Active funnels", "1", "10", "Unlimited"],
                      ["Impressions/month", "100", "Unlimited", "Unlimited"],
                      ["Placements", "Product page", "All 4", "All 4"],
                      ["Offer types", "Cross-sell", "All 3", "All 3"],
                      ["Cart drawer widget", "✕", "✓", "✓"],
                      ["Display styles", "✕", "✓", "✓"],
                      ["Discount codes", "✕", "✓", "✓"],
                      ["Custom widget titles", "✕", "✓", "✓"],
                      ["Analytics", "Basic", "Standard", "Advanced"],
                      ["Support", "Email", "Priority email", "Dedicated Slack"],
                    ].map(([feature, starter, growth, pro]) => (
                      <tr key={feature} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "8px 12px" }}>{feature}</td>
                        <td style={{ textAlign: "center", padding: "8px 12px", color: starter === "✕" ? "#ccc" : undefined }}>{starter}</td>
                        <td style={{ textAlign: "center", padding: "8px 12px", color: growth === "✕" ? "#ccc" : "#0c7a3e", fontWeight: growth !== "✕" && growth !== starter ? 600 : undefined }}>{growth}</td>
                        <td style={{ textAlign: "center", padding: "8px 12px", color: pro === "✕" ? "#ccc" : "#0c7a3e", fontWeight: pro !== "✕" && pro !== starter ? 600 : undefined }}>{pro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BlockStack>
          </Box>
        </Layout.Section>

        {/* ── Dev override (hide by setting DISABLE_DEV_OVERRIDE=true in env) ── */}
        {showDevPanel && (
          <Layout.Section>
            <Box background="bg-surface-warning" borderRadius="300" padding="400" borderWidth="025" borderColor="border-warning">
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">🛠 Developer testing — bypass Shopify billing</Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  If the Billing API is blocked (403), use these buttons to simulate a plan upgrade locally for testing.
                  This sets the plan in the server cache only — no real charge.
                </Text>
                <InlineStack gap="300">
                  {(["starter", "growth", "pro"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => submit({ _action: "dev_override", overridePlan: p }, { method: "post" })}
                      disabled={loading}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "8px",
                        border: activePlan === p ? "2px solid #0c7a3e" : "1px solid #ccc",
                        background: activePlan === p ? "#f0fff4" : "#fff",
                        color: activePlan === p ? "#0c7a3e" : "#333",
                        fontWeight: 600,
                        fontSize: "13px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {activePlan === p ? "✓ " : ""}{p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </InlineStack>
              </BlockStack>
            </Box>
          </Layout.Section>
        )}

        {/* ── Footer note ── */}
        <Layout.Section>
          <Box paddingBlock="400">
            <BlockStack gap="200" inlineAlign="center">
              <Text variant="bodySm" tone="subdued" as="p" alignment="center">
                All paid plans include a 7-day free trial. Cancel anytime. Payments processed securely by Shopify.
              </Text>
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
