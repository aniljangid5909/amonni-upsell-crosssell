import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Box,
  BlockStack,
  InlineStack,
  Text,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Frame,
  Toast,
  Badge,
} from "@shopify/polaris";
import { useState, useCallback, useEffect, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { getCurrentPlan } from "../plan.server";
import { getShopSettings, updateShopSettings } from "../settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") ?? "";
  const [settings, plan] = await Promise.all([
    getShopSettings(session.shop),
    getCurrentPlan(admin, session.shop),
  ]);

  const isGrowthPlus = plan === "growth" || plan === "pro";
  const isPro = plan === "pro";

  // Return plan-gated effective values so the UI always shows what's actually applied
  const effectiveSettings = {
    ...settings,
    accentColor: isGrowthPlus ? settings.accentColor : "#000000",
    animationStyle: isGrowthPlus ? settings.animationStyle : "none",
    showPoweredBy: isPro ? settings.showPoweredBy : true,
    emailReports: isPro ? settings.emailReports : false,
    notificationEmail: isPro ? settings.notificationEmail : "",
    buttonColor: isGrowthPlus ? (settings as any).buttonColor : "#1a1a1a",
    buttonTextColor: isPro ? (settings as any).buttonTextColor : "#ffffff",
    widgetBgColor: isPro ? (settings as any).widgetBgColor : "#ffffff",
    widgetTitleColor: isGrowthPlus ? (settings as any).widgetTitleColor : "#1a1a1a",
    cardBgColor: isGrowthPlus ? (settings as any).cardBgColor : "#ffffff",
  };

  return json({ settings: effectiveSettings, plan, shop: session.shop, host });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = await getCurrentPlan(admin, session.shop);

  const isGrowthPlus = plan === "growth" || plan === "pro";
  const isPro = plan === "pro";

  await updateShopSettings(session.shop, {
    widgetPosition: formData.get("widgetPosition") as string,
    accentColor: isGrowthPlus ? (formData.get("accentColor") as string) : "#000000",
    borderRadius: parseInt(formData.get("borderRadius") as string, 10),
    showPoweredBy: isPro ? formData.get("showPoweredBy") === "true" : true,
    showOnMobile: formData.get("showOnMobile") === "true",
    animationStyle: isGrowthPlus ? (formData.get("animationStyle") as string) : "none",
    autoCloseSeconds: parseInt(formData.get("autoCloseSeconds") as string, 10),
    emailReports: isPro ? formData.get("emailReports") === "true" : false,
    emailReportFrequency: formData.get("emailReportFrequency") as string,
    notificationEmail: isPro ? (formData.get("notificationEmail") as string) : "",
    buttonColor: isGrowthPlus ? (formData.get("buttonColor") as string) : "#1a1a1a",
    buttonTextColor: isPro ? (formData.get("buttonTextColor") as string) : "#ffffff",
    widgetBgColor: isPro ? (formData.get("widgetBgColor") as string) : "#ffffff",
    widgetTitleColor: isGrowthPlus ? (formData.get("widgetTitleColor") as string) : "#1a1a1a",
    cardBgColor: isGrowthPlus ? (formData.get("cardBgColor") as string) : "#ffffff",
  });

  return json({ success: true });
};

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "pro") return <Badge tone="info">Pro</Badge>;
  if (plan === "growth") return <Badge tone="success">Growth</Badge>;
  return <Badge>Starter</Badge>;
}

function LockedNote({ label, plan }: { label: string; plan: string }) {
  return (
    <InlineStack gap="200" blockAlign="center">
      <span style={{ fontSize: "12px" }}>🔒</span>
      <Text as="span" variant="bodySm" tone="subdued">
        {label} — available on <strong>{plan}</strong> plan and above
      </Text>
    </InlineStack>
  );
}

interface PreviewProps {
  buttonColor: string;
  buttonTextColor: string;
  widgetBgColor: string;
  widgetTitleColor: string;
  cardBgColor: string;
  borderRadius: number;
  showPoweredBy: boolean;
}

const SAMPLE_PRODUCTS = [
  { name: "Premium Leather Case", price: "$29.99", img: null },
  { name: "Screen Protector Pack", price: "$14.99", img: null },
];

function CartDrawerPreview({ buttonColor, buttonTextColor, widgetBgColor, widgetTitleColor, cardBgColor, borderRadius, showPoweredBy }: PreviewProps) {
  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", background: "#f9f9f9" }}>
      {/* Cart items */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #e8e8e8" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#333", marginBottom: 8 }}>Your cart (2)</div>
        {["Blue Sneakers — $89.99", "White T-Shirt — $24.99"].map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: "#e0e0e0", flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: "#555" }}>{item}</div>
          </div>
        ))}
      </div>

      {/* Amoni cart widget — matches app-embed.liquid exactly */}
      <div style={{ padding: "12px 14px", margin: "8px 0", borderTop: "1px solid #e8e8e8", borderBottom: "1px solid #e8e8e8", background: widgetBgColor }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: widgetTitleColor, marginBottom: 10 }}>Frequently bought together</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SAMPLE_PRODUCTS.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: "1px solid #e8e8e8", borderRadius, background: cardBgColor }}>
              <div style={{ width: 52, height: 52, borderRadius: 8, background: "#ddd", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{p.price}</div>
              </div>
              <button style={{ padding: "6px 12px", borderRadius, border: "none", background: buttonColor, color: buttonTextColor, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Add</button>
            </div>
          ))}
        </div>
        {showPoweredBy && (
          <div style={{ textAlign: "center", marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 10, color: "#ccc" }}>Powered by <strong style={{ color: "#bbb" }}>Amoni</strong></span>
          </div>
        )}
      </div>

      {/* Cart footer */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#333" }}>
          <span>Subtotal</span><span style={{ fontWeight: 700 }}>$114.98</span>
        </div>
        <div style={{ background: "#1a1a1a", color: "#fff", padding: "9px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 600 }}>Checkout</div>
      </div>
    </div>
  );
}

function ProductPagePreview({ buttonColor, buttonTextColor, widgetBgColor, widgetTitleColor, cardBgColor, borderRadius, showPoweredBy }: PreviewProps) {
  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", background: "#f9f9f9" }}>
      {/* Product header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #e8e8e8", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: 8, background: "#ddd", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 3 }}>Blue Sneakers</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>$89.99</div>
          <div style={{ background: "#1a1a1a", color: "#fff", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "inline-block" }}>Add to cart</div>
        </div>
      </div>

      {/* Amoni product widget — matches product-widget.js cross-sell/upsell carousel exactly */}
      <div style={{ padding: "14px", background: widgetBgColor, borderTop: "1px solid #e8e8e8", borderBottom: "1px solid #e8e8e8", margin: "8px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: widgetTitleColor, marginBottom: 4 }}>You might also like</div>
        <div style={{ display: "inline-block", background: "#fff3cd", color: "#856404", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px", marginBottom: 10 }}>Grab products at 20% Off!</div>
        {/* Carousel: horizontal scroll of vertical cards */}
        <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" }}>
          {SAMPLE_PRODUCTS.map((p) => (
            <div key={p.name} style={{ border: "1px solid #e8e8e8", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: cardBgColor, minWidth: 120, flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: 8, background: "#ddd" }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", textAlign: "center", lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 11, textAlign: "center" }}>
                <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{p.price}</span>
                {" "}<span style={{ fontSize: 10, background: "#ffe5e5", color: "#c0392b", borderRadius: 4, padding: "1px 4px", fontWeight: 600 }}>-20%</span>
              </div>
              <button style={{ padding: "5px 14px", borderRadius, border: "none", background: buttonColor, color: buttonTextColor, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>
          ))}
        </div>
        {showPoweredBy && (
          <div style={{ textAlign: "center", marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
            <span style={{ fontSize: 10, color: "#ccc" }}>Powered by <strong style={{ color: "#bbb" }}>Amoni</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, plan, shop, host } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean }>();
  const navigate = useNavigate();

  const isGrowthPlus = plan === "growth" || plan === "pro";
  const isPro = plan === "pro";
  const isSubmitting = fetcher.state === "submitting";
  const [toastActive, setToastActive] = useState(false);

  const qs = new URLSearchParams();
  if (shop) qs.set("shop", shop);
  if (host) qs.set("host", host);
  const qsStr = qs.toString() ? `?${qs.toString()}` : "";

  // Widget appearance
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [borderRadius, setBorderRadius] = useState(String(settings.borderRadius));
  const [widgetPosition, setWidgetPosition] = useState(settings.widgetPosition);
  const [showPoweredBy, setShowPoweredBy] = useState(settings.showPoweredBy);
  const [buttonColor, setButtonColor] = useState((settings as any).buttonColor || "#1a1a1a");
  const [buttonTextColor, setButtonTextColor] = useState((settings as any).buttonTextColor || "#ffffff");
  const [widgetBgColor, setWidgetBgColor] = useState((settings as any).widgetBgColor || "#ffffff");
  const [widgetTitleColor, setWidgetTitleColor] = useState((settings as any).widgetTitleColor || "#1a1a1a");
  const [cardBgColor, setCardBgColor] = useState((settings as any).cardBgColor || "#ffffff");

  // Behavior
  const [showOnMobile, setShowOnMobile] = useState(settings.showOnMobile);
  const [animationStyle, setAnimationStyle] = useState(settings.animationStyle);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(String(settings.autoCloseSeconds));

  const [previewTab, setPreviewTab] = useState<"cart" | "product">("cart");

  // Email reports
  const [emailReports, setEmailReports] = useState(settings.emailReports);
  const [notificationEmail, setNotificationEmail] = useState(settings.notificationEmail);
  const [emailReportFrequency, setEmailReportFrequency] = useState(settings.emailReportFrequency);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) setToastActive(true);
  }, [fetcher.state, fetcher.data]);

  const handleDismissToast = useCallback(() => setToastActive(false), []);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.set("widgetPosition", widgetPosition);
    formData.set("accentColor", accentColor);
    formData.set("borderRadius", borderRadius);
    formData.set("showPoweredBy", String(showPoweredBy));
    formData.set("buttonColor", buttonColor);
    formData.set("buttonTextColor", buttonTextColor);
    formData.set("widgetBgColor", widgetBgColor);
    formData.set("widgetTitleColor", widgetTitleColor);
    formData.set("cardBgColor", cardBgColor);
    formData.set("showOnMobile", String(showOnMobile));
    formData.set("animationStyle", animationStyle);
    formData.set("autoCloseSeconds", autoCloseSeconds);
    formData.set("emailReports", String(emailReports));
    formData.set("emailReportFrequency", emailReportFrequency);
    formData.set("notificationEmail", notificationEmail);
    fetcher.submit(formData, { method: "post" });
  }, [fetcher, widgetPosition, accentColor, borderRadius, showPoweredBy, buttonColor, buttonTextColor, widgetBgColor, widgetTitleColor, cardBgColor, showOnMobile, animationStyle, autoCloseSeconds, emailReports, emailReportFrequency, notificationEmail]);

  const card = {
    background: "bg-surface" as const,
    borderRadius: "300" as const,
    padding: "400" as const,
    borderWidth: "025" as const,
    borderColor: "border" as const,
  };

  return (
    <Frame>
      <Page
        title="Settings"
        subtitle="Configure widget appearance, behavior, and notifications"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">

              {/* Current plan banner */}
              <Box {...card}>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h2" variant="headingMd">Current plan</Text>
                      <PlanBadge plan={plan} />
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {plan === "starter" && "Upgrade to Growth or Pro to unlock appearance customisation and more."}
                      {plan === "growth" && "Upgrade to Pro to unlock email reports and remove the Amoni badge."}
                      {plan === "pro" && "All settings are available on your Pro plan."}
                    </Text>
                  </BlockStack>
                  {plan !== "pro" && (
                    <Button variant="primary" size="slim" onClick={() => navigate(`/app/pricing${qsStr}`)}>
                      Upgrade plan
                    </Button>
                  )}
                </InlineStack>
              </Box>

              {/* Widget Appearance */}
              <Box {...card}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Widget Appearance</Text>
                  <FormLayout>

                    {/* Accent color — Growth+ */}
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd">Accent color</Text>
                        {!isGrowthPlus && <Badge tone="warning">Growth+</Badge>}
                      </InlineStack>
                      {isGrowthPlus ? (
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid #c9cccf", borderRadius: 6, cursor: "pointer", padding: 2, backgroundColor: "transparent" }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{accentColor}</Text>
                        </InlineStack>
                      ) : (
                        <LockedNote label="Custom accent color" plan="Growth" />
                      )}
                    </BlockStack>

                    {/* Button color — Growth+ */}
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd">Button color</Text>
                        {!isGrowthPlus && <Badge tone="warning">Growth+</Badge>}
                      </InlineStack>
                      {isGrowthPlus ? (
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={buttonColor}
                            onChange={(e) => setButtonColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid #c9cccf", borderRadius: 6, cursor: "pointer", padding: 2, backgroundColor: "transparent" }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{buttonColor}</Text>
                          <div style={{ width: 80, height: 32, borderRadius: 6, background: buttonColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: buttonTextColor, fontSize: 12, fontWeight: 600 }}>Add</span>
                          </div>
                        </InlineStack>
                      ) : (
                        <LockedNote label="Custom button color" plan="Growth" />
                      )}
                    </BlockStack>

                    {/* Widget title color — Growth+ */}
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd">Widget title color</Text>
                        {!isGrowthPlus && <Badge tone="warning">Growth+</Badge>}
                      </InlineStack>
                      {isGrowthPlus ? (
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={widgetTitleColor}
                            onChange={(e) => setWidgetTitleColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid #c9cccf", borderRadius: 6, cursor: "pointer", padding: 2, backgroundColor: "transparent" }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{widgetTitleColor}</Text>
                          <span style={{ fontSize: 14, fontWeight: 700, color: widgetTitleColor }}>Frequently bought together</span>
                        </InlineStack>
                      ) : (
                        <LockedNote label="Custom widget title color" plan="Growth" />
                      )}
                    </BlockStack>

                    {/* Button text color — Pro */}
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd">Button text color</Text>
                        {!isPro && <Badge tone="info">Pro</Badge>}
                      </InlineStack>
                      {isPro ? (
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={buttonTextColor}
                            onChange={(e) => setButtonTextColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid #c9cccf", borderRadius: 6, cursor: "pointer", padding: 2, backgroundColor: "transparent" }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{buttonTextColor}</Text>
                        </InlineStack>
                      ) : (
                        <LockedNote label="Custom button text color" plan="Pro" />
                      )}
                    </BlockStack>

                    {/* Card background color — Growth+ */}
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd">Card background color</Text>
                        {!isGrowthPlus && <Badge tone="warning">Growth+</Badge>}
                      </InlineStack>
                      {isGrowthPlus ? (
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={cardBgColor}
                            onChange={(e) => setCardBgColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid #c9cccf", borderRadius: 6, cursor: "pointer", padding: 2, backgroundColor: "transparent" }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{cardBgColor}</Text>
                          <div style={{ width: 80, height: 40, borderRadius: 8, background: cardBgColor, border: "1px solid #e8e8e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 10, color: "#888" }}>Card</span>
                          </div>
                        </InlineStack>
                      ) : (
                        <LockedNote label="Custom card background" plan="Growth" />
                      )}
                    </BlockStack>

                    {/* Widget background color — Pro */}
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd">Widget background color</Text>
                        {!isPro && <Badge tone="info">Pro</Badge>}
                      </InlineStack>
                      {isPro ? (
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={widgetBgColor}
                            onChange={(e) => setWidgetBgColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid #c9cccf", borderRadius: 6, cursor: "pointer", padding: 2, backgroundColor: "transparent" }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{widgetBgColor}</Text>
                        </InlineStack>
                      ) : (
                        <LockedNote label="Custom widget background" plan="Pro" />
                      )}
                    </BlockStack>

                    <Select
                      label="Border radius"
                      options={[
                        { label: "Sharp", value: "0" },
                        { label: "Rounded", value: "8" },
                        { label: "More rounded", value: "16" },
                        { label: "Pill", value: "24" },
                      ]}
                      value={borderRadius}
                      onChange={setBorderRadius}
                    />

                    <Select
                      label="Widget position"
                      options={[
                        { label: "Bottom right", value: "bottom-right" },
                        { label: "Bottom left", value: "bottom-left" },
                        { label: "Inline", value: "inline" },
                      ]}
                      value={widgetPosition}
                      onChange={setWidgetPosition}
                    />

                    {/* Powered by badge — Pro only */}
                    {isPro ? (
                      <Checkbox
                        label='Show "Powered by Amoni" badge'
                        helpText="Pro plan: badge can be hidden for a white-label experience."
                        checked={showPoweredBy}
                        onChange={setShowPoweredBy}
                      />
                    ) : (
                      <BlockStack gap="100">
                        <Checkbox
                          label='Show "Powered by Amoni" badge'
                          checked={true}
                          onChange={() => {}}
                          disabled
                        />
                        <LockedNote label='Removing the badge' plan="Pro" />
                      </BlockStack>
                    )}

                  </FormLayout>
                </BlockStack>
              </Box>

              {/* Behavior */}
              <Box {...card}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Behavior</Text>
                  <FormLayout>

                    <Checkbox
                      label="Show on mobile"
                      checked={showOnMobile}
                      onChange={setShowOnMobile}
                    />

                    {/* Animation — Growth+ */}
                    {isGrowthPlus ? (
                      <Select
                        label="Animation style"
                        options={[
                          { label: "Slide", value: "slide" },
                          { label: "Fade", value: "fade" },
                          { label: "None", value: "none" },
                        ]}
                        value={animationStyle}
                        onChange={setAnimationStyle}
                      />
                    ) : (
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd">Animation style</Text>
                        <LockedNote label="Custom animations (slide/fade)" plan="Growth" />
                      </BlockStack>
                    )}

                    <Select
                      label="Auto-close after"
                      options={[
                        { label: "Never", value: "0" },
                        { label: "3 seconds", value: "3" },
                        { label: "5 seconds", value: "5" },
                        { label: "10 seconds", value: "10" },
                      ]}
                      value={autoCloseSeconds}
                      onChange={setAutoCloseSeconds}
                    />

                  </FormLayout>
                </BlockStack>
              </Box>

              {/* Email Reports — Pro only */}
              <Box {...card}>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingMd">Email Reports</Text>
                    {!isPro && <Badge tone="info">Pro</Badge>}
                  </InlineStack>

                  {isPro ? (
                    <FormLayout>
                      <Checkbox
                        label="Enable email reports"
                        checked={emailReports}
                        onChange={setEmailReports}
                      />
                      {emailReports && (
                        <>
                          <TextField
                            label="Notification email"
                            type="email"
                            value={notificationEmail}
                            onChange={setNotificationEmail}
                            placeholder="you@example.com"
                            autoComplete="email"
                          />
                          <Select
                            label="Report frequency"
                            options={[
                              { label: "Daily", value: "daily" },
                              { label: "Weekly", value: "weekly" },
                              { label: "Monthly", value: "monthly" },
                            ]}
                            value={emailReportFrequency}
                            onChange={setEmailReportFrequency}
                          />
                        </>
                      )}
                    </FormLayout>
                  ) : (
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Receive automated performance reports directly to your inbox. Available on Pro plan.
                      </Text>
                      <Button size="slim" onClick={() => navigate(`/app/pricing${qsStr}`)}>
                        Upgrade to Pro
                      </Button>
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>

              {/* Save */}
              <Box paddingBlockEnd="800">
              <InlineStack align="end">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Settings"}
                </Button>
              </InlineStack>
              </Box>

            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <div style={{ position: "sticky", top: 16 }}>
              <Box {...card}>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">Widget Preview</Text>
                    <InlineStack gap="100">
                      <button
                        onClick={() => setPreviewTab("cart")}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #c9cccf", background: previewTab === "cart" ? "#1a1a1a" : "#fff", color: previewTab === "cart" ? "#fff" : "#333", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                      >Cart</button>
                      <button
                        onClick={() => setPreviewTab("product")}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #c9cccf", background: previewTab === "product" ? "#1a1a1a" : "#fff", color: previewTab === "product" ? "#fff" : "#333", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                      >Product</button>
                    </InlineStack>
                  </InlineStack>
                  {previewTab === "cart" ? (
                    <CartDrawerPreview
                      buttonColor={buttonColor}
                      buttonTextColor={buttonTextColor}
                      widgetBgColor={widgetBgColor}
                      widgetTitleColor={widgetTitleColor}
                      cardBgColor={cardBgColor}
                      borderRadius={parseInt(borderRadius, 10)}
                      showPoweredBy={showPoweredBy}
                    />
                  ) : (
                    <ProductPagePreview
                      buttonColor={buttonColor}
                      buttonTextColor={buttonTextColor}
                      widgetBgColor={widgetBgColor}
                      widgetTitleColor={widgetTitleColor}
                      cardBgColor={cardBgColor}
                      borderRadius={parseInt(borderRadius, 10)}
                      showPoweredBy={showPoweredBy}
                    />
                  )}
                </BlockStack>
              </Box>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
      {toastActive && <Toast content="Settings saved" onDismiss={handleDismissToast} />}
    </Frame>
  );
}
