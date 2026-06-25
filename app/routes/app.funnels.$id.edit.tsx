import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, Form, useNavigate } from "@remix-run/react";
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
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { getCurrentPlan, PLAN_LIMITS } from "../plan.server";
import { createFunnelDiscount, deleteFunnelDiscount } from "../discount.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { id } = params;
  const url = new URL(request.url);

  const [funnel, plan] = await Promise.all([
    prisma.funnel.findFirst({ where: { id: id as string, shop: session.shop } }),
    getCurrentPlan(admin, session.shop),
  ]);

  if (!funnel) throw new Response("Not found", { status: 404 });

  return json({
    funnel,
    host: url.searchParams.get("host") ?? "",
    shop: url.searchParams.get("shop") ?? session.shop,
    plan,
    limits: PLAN_LIMITS[plan],
  });
};

function buildQs(shop: string, host: string) {
  const p = new URLSearchParams();
  if (shop) p.set("shop", shop);
  if (host) p.set("host", host);
  return p.toString() ? `?${p.toString()}` : "";
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { id } = params;
  const url = new URL(request.url);
  const qs = buildQs(
    url.searchParams.get("shop") ?? session.shop,
    url.searchParams.get("host") ?? ""
  );
  const formData = await request.formData();
  const _action = formData.get("_action") as string;

  if (_action === "delete") {
    await prisma.funnel.delete({ where: { id: id as string, shop: session.shop } });
    return redirect(`/app/funnels${qs}`);
  }

  const name = formData.get("name") as string;
  const placement = formData.get("placement") as string;
  const offerType = formData.get("offerType") as string;
  const triggerProductIdsRaw = formData.get("triggerProductIds") as string;
  const offerProductId = formData.get("offerProductId") as string;
  const offerProductIdsRaw = formData.get("offerProductIds") as string;
  const discountType = formData.get("discountType") as string;
  const discountValue = parseFloat((formData.get("discountValue") as string) || "0");
  const minCartValue = parseFloat((formData.get("minCartValue") as string) || "0");
  const skipSubscribed = formData.get("skipSubscribed") === "on";
  const offerTitle = (formData.get("offerTitle") as string) || "";
  const offerImageUrl = (formData.get("offerImageUrl") as string) || "";
  const offerVariantId = (formData.get("offerVariantId") as string) || "";
  const offerPrice = parseFloat((formData.get("offerPrice") as string) || "0");
  const widgetTitle = (formData.get("widgetTitle") as string) || "";
  const displayStyle = (formData.get("displayStyle") as string) || "carousel";

  const triggerProductIds = triggerProductIdsRaw
    ? triggerProductIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const offerProductIds = offerProductIdsRaw
    ? offerProductIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : offerProductId ? [offerProductId] : [];

  const existing = await prisma.funnel.findFirst({ where: { id: id as string, shop: session.shop } });

  // Delete old discount rule if discount settings changed
  if (existing?.discountRuleId) {
    await deleteFunnelDiscount(admin, existing.discountRuleId);
  }

  let discountCode = "";
  let discountRuleId = "";
  if ((offerProductId || existing?.offerProductId) && discountType !== "none" && discountValue > 0) {
    const result = await createFunnelDiscount(admin, id as string, offerProductId || existing?.offerProductId || "", discountType, discountValue);
    discountCode = result.code;
    discountRuleId = result.ruleId;
  }

  await prisma.funnel.update({
    where: { id: id as string, shop: session.shop },
    data: { name, placement, offerType, triggerProductIds, offerProductId: offerProductId || "", offerProductIds, offerImageUrl, offerVariantId, offerPrice, discountType, discountValue, minCartValue, skipSubscribed, discountCode, discountRuleId, widgetTitle, displayStyle },
  });

  return redirect(`/app/funnels${qs}`);
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

type PickedProduct = { id: string; title: string; imageUrl: string; variantId?: string; price?: string };

function extractNumericId(gid: string) {
  return gid.split("/").pop() || gid;
}

function numericToGid(id: string) {
  if (id.startsWith("gid://")) return id;
  return `gid://shopify/Product/${id}`;
}

export default function EditFunnelPage() {
  const { funnel, shop, host, plan, limits } = useLoaderData<typeof loader>();
  const qs = buildQs(shop, host);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const navigate = useNavigate();

  const [discountType, setDiscountType] = useState(funnel.discountType);
  const [discountValue, setDiscountValue] = useState(funnel.discountValue ? String(funnel.discountValue) : "");
  const [minCartValue, setMinCartValue] = useState(String(funnel.minCartValue));
  const [skipSubscribed, setSkipSubscribed] = useState(funnel.skipSubscribed);
  const [name, setName] = useState(funnel.name);
  const [placement, setPlacement] = useState(funnel.placement);
  const [offerType, setOfferType] = useState(funnel.offerType);
  const [widgetTitle, setWidgetTitle] = useState(funnel.widgetTitle || "");
  const [displayStyle, setDisplayStyle] = useState(funnel.displayStyle || "carousel");

  const [triggerProducts, setTriggerProducts] = useState<PickedProduct[]>(
    funnel.triggerProductIds.map((id) => ({ id: numericToGid(id), title: `Product ${id}`, imageUrl: "" }))
  );
  // Support existing single offerProductId + new multi offerProductIds
  const initialOfferProducts: PickedProduct[] = (() => {
    const ids = (funnel.offerProductIds && funnel.offerProductIds.length > 0)
      ? funnel.offerProductIds
      : (funnel.offerProductId ? [funnel.offerProductId] : []);
    return ids.map((id, i) => ({
      id: numericToGid(id),
      title: i === 0 ? funnel.name : `Product ${id}`,
      imageUrl: i === 0 ? (funnel.offerImageUrl || "") : "",
      variantId: i === 0 ? (funnel.offerVariantId || "") : "",
      price: i === 0 ? String(funnel.offerPrice || 0) : "0",
    }));
  })();
  const [offerProducts, setOfferProducts] = useState<PickedProduct[]>(initialOfferProducts);

  const openTriggerPicker = useCallback(async () => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: triggerProducts.map((p) => ({ id: p.id })),
    });
    if (selected) {
      setTriggerProducts(selected.map((p: any) => ({
        id: p.id,
        title: p.title,
        imageUrl: p.images?.[0]?.originalSrc || "",
      })));
    }
  }, [triggerProducts]);

  const openOfferPicker = useCallback(async () => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: offerProducts.map((p) => ({ id: p.id })),
    });
    if (selected) {
      setOfferProducts(selected.map((p: any) => {
        const v = p.variants?.[0];
        return { id: p.id, title: p.title, imageUrl: p.images?.[0]?.originalSrc || "", variantId: v?.id ? extractNumericId(v.id) : "", price: v?.price || "0" };
      }));
    }
  }, [offerProducts]);

  const removeTrigger = (id: string) =>
    setTriggerProducts((prev) => prev.filter((p) => p.id !== id));
  const removeOfferProduct = (id: string) =>
    setOfferProducts((prev) => prev.filter((p) => p.id !== id));

  const triggerProductIds = triggerProducts.map((p) => extractNumericId(p.id)).join(",");
  const primaryOffer = offerProducts[0] || null;
  const offerProductId = primaryOffer ? extractNumericId(primaryOffer.id) : "";
  const allOfferProductIds = offerProducts.map((p) => extractNumericId(p.id)).join(",");

  const handleDelete = () => {
    if (confirm("Delete this funnel? This cannot be undone.")) {
      const form = document.createElement("form");
      form.method = "post";
      const input = document.createElement("input");
      input.name = "_action";
      input.value = "delete";
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    }
  };

  return (
    <Page backAction={{ content: "Funnels", url: `/app/funnels${qs}` }} title="Edit funnel">
      <Form method="post">
        <input type="hidden" name="triggerProductIds" value={triggerProductIds} />
        <input type="hidden" name="offerProductId" value={offerProductId} />
        <input type="hidden" name="offerProductIds" value={allOfferProductIds} />
        <input type="hidden" name="offerTitle" value={primaryOffer?.title || ""} />
        <input type="hidden" name="offerImageUrl" value={primaryOffer?.imageUrl || ""} />
        <input type="hidden" name="offerVariantId" value={primaryOffer?.variantId || ""} />
        <input type="hidden" name="offerPrice" value={primaryOffer?.price || "0"} />

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Funnel details</Text>
                <FormLayout>
                  <TextField label="Funnel name" name="name" value={name} onChange={setName} placeholder="e.g. Serum → SPF cross-sell" autoComplete="off" requiredIndicator />
                  <Select label="Placement" name="placement" options={placementOptions} value={placement} onChange={(v) => { setPlacement(v); setWidgetTitle(''); }} helpText="Where this offer appears in the customer journey" />
                  {!limits.allowedPlacements.includes(placement) && (
                    <div style={{ marginTop: "-8px", padding: "10px 14px", background: "#fff8e1", border: "1px solid #f5c842", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#7a5c00" }}>
                        🔒 <strong>{placementOptions.find(o => o.value === placement)?.label}</strong> is not available on your <strong>{plan}</strong> plan.
                      </span>
                      <button onClick={() => navigate(`/app/pricing${qs}`)} style={{ fontSize: "13px", fontWeight: 600, color: "#c07a00", textDecoration: "underline", whiteSpace: "nowrap", marginLeft: "12px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Upgrade →</button>
                    </div>
                  )}
                  <Select label="Offer type" name="offerType" options={offerTypeOptions} value={offerType} onChange={(v) => { setOfferType(v); setWidgetTitle(''); }} />
                  {!limits.allowedOfferTypes.includes(offerType) && (
                    <div style={{ marginTop: "-8px", padding: "10px 14px", background: "#fff8e1", border: "1px solid #f5c842", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#7a5c00" }}>
                        🔒 <strong>{offerTypeOptions.find(o => o.value === offerType)?.label?.split(' —')[0]}</strong> offers are not available on your <strong>{plan}</strong> plan.
                      </span>
                      <button onClick={() => navigate(`/app/pricing${qs}`)} style={{ fontSize: "13px", fontWeight: 600, color: "#c07a00", textDecoration: "underline", whiteSpace: "nowrap", marginLeft: "12px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Upgrade →</button>
                    </div>
                  )}
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
                  {!limits.displayStyles && (
                    <div style={{ marginTop: "-8px", padding: "10px 14px", background: "#fff8e1", border: "1px solid #f5c842", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#7a5c00" }}>
                        🔒 <strong>Carousel & Grid display styles</strong> are not available on your <strong>{plan}</strong> plan. The default style will be used.
                      </span>
                      <button type="button" onClick={() => navigate(`/app/pricing${qs}`)} style={{ fontSize: "13px", fontWeight: 600, color: "#c07a00", textDecoration: "underline", whiteSpace: "nowrap", marginLeft: "12px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Upgrade →</button>
                    </div>
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">Trigger products</Text>
                  <Text variant="bodySm" tone="subdued" as="p">Show this offer when any of these products are in the cart / order.</Text>
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
                        <Button size="slim" tone="critical" variant="plain" onClick={() => removeTrigger(p.id)}>Remove</Button>
                      </InlineStack>
                    ))}
                    <Divider />
                  </BlockStack>
                )}
                <Button onClick={openTriggerPicker} variant="secondary">
                  {triggerProducts.length === 0 ? "Select trigger products" : "Add more products"}
                </Button>
                {triggerProducts.length === 0 && (
                  <Banner tone="warning">No trigger products selected — this funnel will match ALL products.</Banner>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">Offer products</Text>
                  <Text variant="bodySm" tone="subdued" as="p">The product(s) you want to recommend to the customer. Select multiple to show a carousel of offers.</Text>
                </BlockStack>
                {offerProducts.length > 0 && (
                  <BlockStack gap="200">
                    {offerProducts.map((p) => (
                      <InlineStack key={p.id} gap="300" align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Thumbnail
                            source={p.imageUrl || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_small.png"}
                            alt={p.title}
                            size="small"
                          />
                          <BlockStack gap="050">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">{p.title}</Text>
                            <Badge tone="success">Offer product</Badge>
                          </BlockStack>
                        </InlineStack>
                        <Button size="slim" tone="critical" variant="plain" onClick={() => removeOfferProduct(p.id)}>Remove</Button>
                      </InlineStack>
                    ))}
                    <Divider />
                  </BlockStack>
                )}
                <Button onClick={openOfferPicker} variant="secondary">
                  {offerProducts.length === 0 ? "Select offer product(s)" : "Change offer products"}
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Discount</Text>
                <FormLayout>
                  <Select label="Discount type" name="discountType" options={discountTypeOptions} value={discountType} onChange={setDiscountType} />
                  {discountType === "percent" && (
                    <TextField label="Discount percentage" name="discountValue" type="number" value={discountValue} onChange={setDiscountValue} suffix="%" autoComplete="off" />
                  )}
                  {discountType === "fixed" && (
                    <TextField label="Discount amount" name="discountValue" type="number" value={discountValue} onChange={setDiscountValue} prefix="$" autoComplete="off" />
                  )}
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Display conditions</Text>
                <FormLayout>
                  <TextField label="Minimum cart value" name="minCartValue" type="number" value={minCartValue} onChange={setMinCartValue} prefix="$" helpText="Only show this offer if cart total exceeds this amount. Use 0 to always show." autoComplete="off" />
                  <Checkbox label="Skip customers who already purchased the offered product" name="skipSubscribed" checked={skipSubscribed} onChange={setSkipSubscribed} />
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
            disabled: !limits.allowedPlacements.includes(placement) || !limits.allowedOfferTypes.includes(offerType),
          }}
          secondaryActions={[
            { content: "Cancel", url: `/app/funnels${qs}` },
            { content: "Delete funnel", destructive: true, onAction: handleDelete },
          ]}
        />
      </Form>
    </Page>
  );
}
