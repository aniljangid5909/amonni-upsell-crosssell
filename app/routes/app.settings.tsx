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
import { useState, useCallback, useEffect } from "react";
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
  return json({ settings, plan, shop: session.shop, host });
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

  // Behavior
  const [showOnMobile, setShowOnMobile] = useState(settings.showOnMobile);
  const [animationStyle, setAnimationStyle] = useState(settings.animationStyle);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(String(settings.autoCloseSeconds));

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
    formData.set("showOnMobile", String(showOnMobile));
    formData.set("animationStyle", animationStyle);
    formData.set("autoCloseSeconds", autoCloseSeconds);
    formData.set("emailReports", String(emailReports));
    formData.set("emailReportFrequency", emailReportFrequency);
    formData.set("notificationEmail", notificationEmail);
    fetcher.submit(formData, { method: "post" });
  }, [fetcher, widgetPosition, accentColor, borderRadius, showPoweredBy, buttonColor, buttonTextColor, widgetBgColor, showOnMobile, animationStyle, autoCloseSeconds, emailReports, emailReportFrequency, notificationEmail]);

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
              <InlineStack align="end">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save settings"}
                </Button>
              </InlineStack>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
      {toastActive && <Toast content="Settings saved" onDismiss={handleDismissToast} />}
    </Frame>
  );
}
