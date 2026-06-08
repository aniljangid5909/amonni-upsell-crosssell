import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, Form } from "@remix-run/react";
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
import { createFunnelDiscount, deleteFunnelDiscount } from "../discount.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  const url = new URL(request.url);

  const funnel = await prisma.funnel.findFirst({
    where: { id: id as string, shop: session.shop },
  });

  if (!funnel) throw new Response("Not found", { status: 404 });

  return json({
    funnel,
    host: url.searchParams.get("host") ?? "",
    shop: url.searchParams.get("shop") ?? session.shop,
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
  const discountType = formData.get("discountType") as string;
  const discountValue = parseFloat((formData.get("discountValue") as string) || "0");
  const minCartValue = parseFloat((formData.get("minCartValue") as string) || "0");
  const skipSubscribed = formData.get("skipSubscribed") === "on";
  const offerImageUrl = (formData.get("offerImageUrl") as string) || "";
  const offerVariantId = (formData.get("offerVariantId") as string) || "";
  const offerPrice = parseFloat((formData.get("offerPrice") as string) || "0");

  const triggerProductIds = triggerProductIdsRaw
    ? triggerProductIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

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
    data: { name, placement, offerType, triggerProductIds, offerProductId: offerProductId || "", offerImageUrl, offerVariantId, offerPrice, discountType, discountValue, minCartValue, skipSubscribed, discountCode, discountRuleId },
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
  const { funnel, shop, host } = useLoaderData<typeof loader>();
  const qs = buildQs(shop, host);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [discountType, setDiscountType] = useState(funnel.discountType);
  const [discountValue, setDiscountValue] = useState(funnel.discountValue ? String(funnel.discountValue) : "");
  const [minCartValue, setMinCartValue] = useState(String(funnel.minCartValue));
  const [skipSubscribed, setSkipSubscribed] = useState(funnel.skipSubscribed);
  const [name, setName] = useState(funnel.name);
  const [placement, setPlacement] = useState(funnel.placement);
  const [offerType, setOfferType] = useState(funnel.offerType);

  const [triggerProducts, setTriggerProducts] = useState<PickedProduct[]>(
    funnel.triggerProductIds.map((id) => ({ id: numericToGid(id), title: `Product ${id}`, imageUrl: "" }))
  );
  const [offerProduct, setOfferProduct] = useState<PickedProduct | null>(
    funnel.offerProductId
      ? { id: numericToGid(funnel.offerProductId), title: `Product ${funnel.offerProductId}`, imageUrl: funnel.offerImageUrl, variantId: funnel.offerVariantId, price: String(funnel.offerPrice) }
      : null
  );

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
      multiple: false,
      selectionIds: offerProduct ? [{ id: offerProduct.id }] : [],
    });
    if (selected?.[0]) {
      const p = selected[0];
      const v = p.variants?.[0];
      setOfferProduct({ id: p.id, title: p.title, imageUrl: p.images?.[0]?.originalSrc || "", variantId: v?.id ? extractNumericId(v.id) : "", price: v?.price || "0" });
    }
  }, [offerProduct]);

  const removeTrigger = (id: string) =>
    setTriggerProducts((prev) => prev.filter((p) => p.id !== id));

  const triggerProductIds = triggerProducts.map((p) => extractNumericId(p.id)).join(",");
  const offerProductId = offerProduct ? extractNumericId(offerProduct.id) : "";

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
        <input type="hidden" name="offerImageUrl" value={offerProduct?.imageUrl || ""} />
        <input type="hidden" name="offerVariantId" value={offerProduct?.variantId || ""} />
        <input type="hidden" name="offerPrice" value={offerProduct?.price || "0"} />

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Funnel details</Text>
                <FormLayout>
                  <TextField label="Funnel name" name="name" value={name} onChange={setName} placeholder="e.g. Serum → SPF cross-sell" autoComplete="off" requiredIndicator />
                  <Select label="Placement" name="placement" options={placementOptions} value={placement} onChange={setPlacement} helpText="Where this offer appears in the customer journey" />
                  <Select label="Offer type" name="offerType" options={offerTypeOptions} value={offerType} onChange={setOfferType} />
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
                  <Text variant="headingMd" as="h2">Offer product</Text>
                  <Text variant="bodySm" tone="subdued" as="p">The product you want to recommend to the customer.</Text>
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
                        <Text as="span" variant="bodyMd" fontWeight="semibold">{offerProduct.title}</Text>
                        <Badge tone="success">Offer product</Badge>
                      </BlockStack>
                    </InlineStack>
                    <Button size="slim" variant="plain" onClick={() => setOfferProduct(null)}>Change</Button>
                  </InlineStack>
                )}
                {!offerProduct && (
                  <Button onClick={openOfferPicker} variant="secondary">Select offer product</Button>
                )}
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
          primaryAction={{ content: "Save funnel", submit: true, loading: isSubmitting }}
          secondaryActions={[
            { content: "Cancel", url: `/app/funnels${qs}` },
            { content: "Delete funnel", destructive: true, onAction: handleDelete },
          ]}
        />
      </Form>
    </Page>
  );
}
