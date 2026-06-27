import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
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
  Banner,
  Frame,
  Toast,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getShopSettings, updateShopSettings } from "../settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const host = url.searchParams.get("host") ?? "";
  const settings = await getShopSettings(session.shop);
  return json({ settings, shop: session.shop, host });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const widgetPosition = formData.get("widgetPosition") as string;
  const accentColor = formData.get("accentColor") as string;
  const borderRadius = parseInt(formData.get("borderRadius") as string, 10);
  const showPoweredBy = formData.get("showPoweredBy") === "true";
  const showOnMobile = formData.get("showOnMobile") === "true";
  const animationStyle = formData.get("animationStyle") as string;
  const autoCloseSeconds = parseInt(formData.get("autoCloseSeconds") as string, 10);
  const emailReports = formData.get("emailReports") === "true";
  const emailReportFrequency = formData.get("emailReportFrequency") as string;
  const notificationEmail = formData.get("notificationEmail") as string;

  await updateShopSettings(session.shop, {
    widgetPosition,
    accentColor,
    borderRadius,
    showPoweredBy,
    showOnMobile,
    animationStyle,
    autoCloseSeconds,
    emailReports,
    emailReportFrequency,
    notificationEmail,
  });

  return json({ success: true });
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean }>();

  const isSubmitting = fetcher.state === "submitting";
  const [toastActive, setToastActive] = useState(false);

  // Widget appearance
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [borderRadius, setBorderRadius] = useState(String(settings.borderRadius));
  const [widgetPosition, setWidgetPosition] = useState(settings.widgetPosition);
  const [showPoweredBy, setShowPoweredBy] = useState(settings.showPoweredBy);

  // Behavior
  const [showOnMobile, setShowOnMobile] = useState(settings.showOnMobile);
  const [animationStyle, setAnimationStyle] = useState(settings.animationStyle);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(String(settings.autoCloseSeconds));

  // Email reports
  const [emailReports, setEmailReports] = useState(settings.emailReports);
  const [notificationEmail, setNotificationEmail] = useState(settings.notificationEmail);
  const [emailReportFrequency, setEmailReportFrequency] = useState(settings.emailReportFrequency);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setToastActive(true);
    }
  }, [fetcher.state, fetcher.data]);

  const handleDismissToast = useCallback(() => setToastActive(false), []);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.set("widgetPosition", widgetPosition);
    formData.set("accentColor", accentColor);
    formData.set("borderRadius", borderRadius);
    formData.set("showPoweredBy", String(showPoweredBy));
    formData.set("showOnMobile", String(showOnMobile));
    formData.set("animationStyle", animationStyle);
    formData.set("autoCloseSeconds", autoCloseSeconds);
    formData.set("emailReports", String(emailReports));
    formData.set("emailReportFrequency", emailReportFrequency);
    formData.set("notificationEmail", notificationEmail);
    fetcher.submit(formData, { method: "post" });
  }, [
    fetcher,
    widgetPosition,
    accentColor,
    borderRadius,
    showPoweredBy,
    showOnMobile,
    animationStyle,
    autoCloseSeconds,
    emailReports,
    emailReportFrequency,
    notificationEmail,
  ]);

  const cardStyle = {
    background: "bg-surface" as const,
    borderRadius: "300" as const,
    padding: "400" as const,
    borderWidth: "025" as const,
    borderColor: "border" as const,
  };

  const toastMarkup = toastActive ? (
    <Toast content="Settings saved" onDismiss={handleDismissToast} />
  ) : null;

  return (
    <Frame>
      <Page
        title="Settings"
        subtitle="Configure widget appearance, behavior, and notifications"
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">

              {/* Widget Appearance */}
              <Box {...cardStyle}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Widget Appearance</Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">Accent color</Text>
                        <InlineStack gap="300" blockAlign="center">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            style={{
                              width: 40,
                              height: 40,
                              border: "1px solid #c9cccf",
                              borderRadius: 6,
                              cursor: "pointer",
                              padding: 2,
                              backgroundColor: "transparent",
                            }}
                          />
                          <Text as="span" variant="bodyMd" tone="subdued">{accentColor}</Text>
                        </InlineStack>
                      </BlockStack>
                    </FormLayout.Group>
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
                    <Checkbox
                      label='Show "Powered by Amoni" badge'
                      helpText="Badge can be removed on Growth or Pro plans."
                      checked={showPoweredBy}
                      onChange={setShowPoweredBy}
                    />
                  </FormLayout>
                </BlockStack>
              </Box>

              {/* Behavior */}
              <Box {...cardStyle}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Behavior</Text>
                  <FormLayout>
                    <Checkbox
                      label="Show on mobile"
                      checked={showOnMobile}
                      onChange={setShowOnMobile}
                    />
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

              {/* Email Reports */}
              <Box {...cardStyle}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Email Reports</Text>
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
      {toastMarkup}
    </Frame>
  );
}
