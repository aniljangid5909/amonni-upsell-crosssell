import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useNavigation, Form, useLoaderData } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Checkbox,
  PageActions,
  FormLayout,
  Text,
  Button,
  InlineStack,
  Thumbnail,
  BlockStack,
  Badge,
  Divider,
  Banner,
  Tooltip,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { createFunnelDiscount } from "../discount.server";
import { getCurrentPlan, getMonthlyImpressions, PLAN_LIMITS } from "../plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const [plan, monthlyImpressions, activeFunnelCount] = await Promise.all([
    getCurrentPlan(admin, session.shop),
    getMonthlyImpressions(session.shop),
    prisma.funnel.count({ where: { shop: session.shop, status: "active" } }),
  ]);
  const limits = PLAN_LIMITS[plan];
  return json({
    host: url.searchParams.get("host") ?? "",
    shop: url.searchParams.get("shop") ?? session.shop,
    plan,
    limits,
    activeFunnelCount,
    monthlyImpressions,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  // Enforce plan limits server-side
  const plan = await getCurrentPlan(admin, session.shop);
  const limits = PLAN_LIMITS[plan];
  const activeFunnelCount = await prisma.funnel.count({ where: { shop: session.shop, status: "active" } });
  if (isFinite(limits.maxFunnels) && activeFunnelCount >= limits.maxFunnels) {
    return json({ planError: `Your ${plan} plan allows max ${limits.maxFunnels} active funnel(s). Please upgrade.` }, { status: 403 });
  }
  const monthlyImpressions = await getMonthlyImpressions(session.shop);
  if (isFinite(limits.maxImpressionsPerMonth) && monthlyImpressions >= limits.maxImpressionsPerMonth) {
    return json({ planError: "Monthly impression limit reached. Please upgrade to create more funnels." }, { status: 403 });
  }
  const url = new URL(request.url);
  const host = url.searchParams.get("host") ?? "";
  const shop = url.searchParams.get("shop") ?? session.shop;
  const qs = new URLSearchParams();
  if (shop) qs.set("shop", shop);
  if (host) qs.set("host", host);
  const qsStr = qs.toString() ? `?${qs.toString()}` : "";
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const placement = formData.get("placement") as string;
  const offerType = formData.get("offerType") as string;
  const triggerProductIdsRaw = formData.get("triggerProductIds") as string;
  const offerProductId = formData.get("offerProductId") as string;
  const discountType = formData.get("discountType") as string;
  const discountValue = parseFloat(
    (formData.get("discountValue") as string) || "0"
  );
  const minCartValue = parseFloat(
    (formData.get("minCartValue") as string) || "0"
  );
  const skipSubscribed = formData.get("skipSubscribed") === "on";
  const offerTitle = (formData.get("offerTitle") as string) || "";
  const offerImageUrl = (formData.get("offerImageUrl") as string) || "";
  const offerVariantId = (formData.get("offerVariantId") as string) || "";
  const offerPrice = parseFloat((formData.get("offerPrice") as string) || "0");
  const widgetTitle = (formData.get("widgetTitle") as string) || "";
  const displayStyle = (formData.get("displayStyle") as string) || "carousel";

  if (!name || !placement || !offerType) {
    return redirect(`/app/funnels/new${qsStr}`);
  }

  const triggerProductIds = triggerProductIdsRaw
    ? triggerProductIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const funnel = await prisma.funnel.create({
    data: {
      shop: session.shop,
      name,
      placement,
      offerType,
      triggerProductIds,
      offerProductId: offerProductId || "",
      offerImageUrl,
      offerVariantId,
      offerPrice,
      discountType,
      discountValue,
      minCartValue,
      skipSubscribed,
      widgetTitle,
      displayStyle,
      status: "active",
    },
  });

  if (offerProductId && discountType !== "none" && discountValue > 0) {
    const { code, ruleId } = await createFunnelDiscount(admin, funnel.id, offerProductId, discountType, discountValue);
    if (code) await prisma.funnel.update({ where: { id: funnel.id }, data: { discountCode: code, discountRuleId: ruleId } });
  }

  return redirect(`/app/funnels${qsStr}`);
};

const placementOptions = [
  { label: "Cart page / Cart drawer", value: "cart" },
  { label: "Product page (frequently bought together)", value: "product" },
  { label: "Post-purchase (between order and thank-you)", value: "post-purchase" },
  { label: "Checkout block (Shopify Plus only)", value: "checkout" },
];

const offerTypeOptions = [
  { label: "Cross-sell — add a complementary product", value: "cross-sell" },
  { label: "Upsell — upgrade to a premium version", value: "upsell" },
  { label: "Bundle — buy together and save", value: "bundle" },
];

const discountTypeOptions = [
  { label: "No discount", value: "none" },
  { label: "Percentage off", value: "percent" },
  { label: "Fixed amount off", value: "fixed" },
];

type PickedProduct = {
  id: string;
  title: string;
  imageUrl: string;
  variantId?: string;
  price?: string;
};

function extractNumericId(gid: string) {
  return gid.split("/").pop() || gid;
}

export default function NewFunnelPage() {
  const { shop, host, plan, limits, activeFunnelCount, monthlyImpressions } = useLoaderData<typeof loader>();
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const atFunnelLimit = isFinite(limits.maxFunnels) && activeFunnelCount >= limits.maxFunnels;
  const atImpressionLimit = isFinite(limits.maxImpressionsPerMonth) && monthlyImpressions >= limits.maxImpressionsPerMonth;
  const blocked = atFunnelLimit || atImpressionLimit;

  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [minCartValue, setMinCartValue] = useState("0");
  const [skipSubscribed, setSkipSubscribed] = useState(true);
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState(limits.allowedPlacements[0] || "product");
  const [offerType, setOfferType] = useState(limits.allowedOfferTypes[0] || "cross-sell");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [displayStyle, setDisplayStyle] = useState("carousel");
  const [triggerProducts, setTriggerProducts] = useState<PickedProduct[]>([]);
  const [offerProduct, setOfferProduct] = useState<PickedProduct | null>(null);

  const openTriggerPicker = useCallback(async () => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: triggerProducts.map((p) => ({ id: p.id })),
    });
    if (selected) {
      setTriggerProducts(
        selected.map((p: any) => ({
          id: p.id,
          title: p.title,
          imageUrl: p.images?.[0]?.originalSrc || "",
        }))
      );
    }
  }, [triggerProducts]);

  const openOfferPicker = useCallback(async () => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      multiple: false,
      selectionIds: offerProduct ? [{ id: offerProduct.id }] : [],
    });
    if (selected?.[0]) {
      const p = selected[0];
      const v = p.variants?.[0];
      setOfferProduct({
        id: p.id,
        title: p.title,
        imageUrl: p.images?.[0]?.originalSrc || "",
        variantId: v?.id ? extractNumericId(v.id) : "",
        price: v?.price || "0",
      });
    }
  }, [offerProduct]);

  const removeTrigger = (id: string) =>
    setTriggerProducts((prev) => prev.filter((p) => p.id !== id));

  const triggerProductIds = triggerProducts
    .map((p) => extractNumericId(p.id))
    .join(",");
  const offerProductId = offerProduct ? extractNumericId(offerProduct.id) : "";

  // Filter placement/type options to what the plan allows
  const allowedPlacementOptions = placementOptions.map((o) => ({
    ...o,
    label: limits.allowedPlacements.includes(o.value) ? o.label : `🔒 ${o.label} (upgrade)`,
    disabled: !limits.allowedPlacements.includes(o.value),
  }));
  const allowedOfferTypeOptions = offerTypeOptions.map((o) => ({
    ...o,
    label: limits.allowedOfferTypes.includes(o.value) ? o.label : `🔒 ${o.label} (upgrade)`,
    disabled: !limits.allowedOfferTypes.includes(o.value),
  }));

  return (
    <Page
      backAction={{ content: "Funnels", url: `/app/funnels${qs}` }}
      title="Create funnel"
    >
      {blocked && (
        <div style={{ marginBottom: "16px" }}>
          <Banner
            tone="warning"
            title={atFunnelLimit ? `Funnel limit reached on your ${plan} plan` : "Monthly impression limit reached"}
          >
            <p>{atFunnelLimit ? `You have ${activeFunnelCount}/${limits.maxFunnels} active funnels.` : `You've used ${monthlyImpressions}/${limits.maxImpressionsPerMonth} impressions this month.`} Upgrade to create more.</p>
            <Button variant="plain" url={`/app/pricing${qs}`}>View plans →</Button>
          </Banner>
        </div>
      )}
      <Form method="post">
        {/* Hidden fields carrying the resolved IDs */}
        <input type="hidden" name="triggerProductIds" value={triggerProductIds} />
        <input type="hidden" name="offerProductId" value={offerProductId} />
        <input type="hidden" name="offerTitle" value={offerProduct?.title || ""} />
        <input type="hidden" name="offerImageUrl" value={offerProduct?.imageUrl || ""} />
        <input type="hidden" name="offerVariantId" value={offerProduct?.variantId || ""} />
        <input type="hidden" name="offerPrice" value={offerProduct?.price || "0"} />

        <Layout>
          {/* ── Funnel details ── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Funnel details</Text>
                <FormLayout>
                  <TextField
                    label="Funnel name"
                    name="name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Serum → SPF cross-sell"
                    autoComplete="off"
                    requiredIndicator
                  />
                  <Select
                    label="Placement"
                    name="placement"
                    options={allowedPlacementOptions}
                    value={placement}
                    onChange={(v) => { if (limits.allowedPlacements.includes(v)) { setPlacement(v); setWidgetTitle(''); } }}
                    helpText="Where this offer appears in the customer journey"
                  />
                  <Select
                    label="Offer type"
                    name="offerType"
                    options={allowedOfferTypeOptions}
                    value={offerType}
                    onChange={(v) => { if (limits.allowedOfferTypes.includes(v)) { setOfferType(v); setWidgetTitle(''); } }}
                  />
                  <TextField
                    label="Widget title"
                    name="widgetTitle"
                    value={widgetTitle}
                    onChange={setWidgetTitle}
                    placeholder="e.g. You might also like"
                    helpText="Custom heading shown in the widget. Leave blank to use the default."
                    autoComplete="off"
                  />
                  <Select
                    label="Display style"
                    name="displayStyle"
                    options={[
                      { label: "Carousel", value: "carousel" },
                      { label: "Grid", value: "grid" },
                    ]}
                    value={displayStyle}
                    onChange={setDisplayStyle}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Trigger products ── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">Trigger products</Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    Show this offer when any of these products are in the cart / order.
                  </Text>
                </BlockStack>

                {triggerProducts.length > 0 && (
                  <BlockStack gap="200">
                    {triggerProducts.map((p) => (
                      <InlineStack key={p.id} gap="300" align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Thumbnail
                            source={p.imageUrl || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_small.png"}
                            alt={p.title}
                            size="small"
                          />
                          <Text as="span" variant="bodyMd">{p.title}</Text>
                        </InlineStack>
                        <Button
                          size="slim"
                          tone="critical"
                          variant="plain"
                          onClick={() => removeTrigger(p.id)}
                        >
                          Remove
                        </Button>
                      </InlineStack>
                    ))}
                    <Divider />
                  </BlockStack>
                )}

                <Button onClick={openTriggerPicker} variant="secondary">
                  {triggerProducts.length === 0
                    ? "Select trigger products"
                    : "Add more products"}
                </Button>

                {triggerProducts.length === 0 && (
                  <Banner tone="warning">
                    No trigger products selected — this funnel will match ALL products.
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Offer product ── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">Offer product</Text>
                  <Text variant="bodySm" tone="subdued" as="p">
                    The product you want to recommend to the customer.
                  </Text>
                </BlockStack>

                {offerProduct && (
                  <InlineStack gap="300" align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail
                        source={offerProduct.imageUrl || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_small.png"}
                        alt={offerProduct.title}
                        size="small"
                      />
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {offerProduct.title}
                        </Text>
                        <Badge tone="success">Offer product</Badge>
                      </BlockStack>
                    </InlineStack>
                    <Button
                      size="slim"
                      variant="plain"
                      onClick={() => setOfferProduct(null)}
                    >
                      Change
                    </Button>
                  </InlineStack>
                )}

                {!offerProduct && (
                  <Button onClick={openOfferPicker} variant="secondary">
                    Select offer product
                  </Button>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Discount ── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Discount</Text>
                <FormLayout>
                  <Select
                    label="Discount type"
                    name="discountType"
                    options={discountTypeOptions}
                    value={discountType}
                    onChange={setDiscountType}
                  />
                  {discountType === "percent" && (
                    <TextField
                      label="Discount percentage"
                      name="discountValue"
                      type="number"
                      value={discountValue}
                      onChange={setDiscountValue}
                      suffix="%"
                      autoComplete="off"
                    />
                  )}
                  {discountType === "fixed" && (
                    <TextField
                      label="Discount amount"
                      name="discountValue"
                      type="number"
                      value={discountValue}
                      onChange={setDiscountValue}
                      prefix="$"
                      autoComplete="off"
                    />
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Conditions ── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Display conditions</Text>
                <FormLayout>
                  <TextField
                    label="Minimum cart value"
                    name="minCartValue"
                    type="number"
                    value={minCartValue}
                    onChange={setMinCartValue}
                    prefix="$"
                    helpText="Only show this offer if cart total exceeds this amount. Use 0 to always show."
                    autoComplete="off"
                  />
                  <Checkbox
                    label="Skip customers who already purchased the offered product"
                    name="skipSubscribed"
                    checked={skipSubscribed}
                    onChange={setSkipSubscribed}
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <PageActions
          primaryAction={{
            content: "Save funnel",
            submit: true,
            loading: isSubmitting,
            disabled: !name || !offerProduct,
          }}
          secondaryActions={[{ content: "Cancel", url: "/app/funnels" }]}
        />
      </Form>
    </Page>
  );
}
