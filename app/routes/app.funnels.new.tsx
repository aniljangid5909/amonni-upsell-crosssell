import type { ActionFunctionArgs, HeadersFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useNavigation, Form, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
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

  if (!name || !placement || !offerType) {
    return redirect("/app/funnels/new");
  }

  const triggerProductIds = triggerProductIdsRaw
    ? triggerProductIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  await prisma.funnel.create({
    data: {
      shop: session.shop,
      name,
      placement,
      offerType,
      triggerProductIds,
      offerProductId: offerProductId || "",
      discountType,
      discountValue,
      minCartValue,
      skipSubscribed,
      status: "active",
    },
  });

  return redirect("/app/funnels");
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
};

function extractNumericId(gid: string) {
  return gid.split("/").pop() || gid;
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export default function NewFunnelPage() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [minCartValue, setMinCartValue] = useState("0");
  const [skipSubscribed, setSkipSubscribed] = useState(true);
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState("cart");
  const [offerType, setOfferType] = useState("cross-sell");
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
      setOfferProduct({
        id: p.id,
        title: p.title,
        imageUrl: p.images?.[0]?.originalSrc || "",
      });
    }
  }, [offerProduct]);

  const removeTrigger = (id: string) =>
    setTriggerProducts((prev) => prev.filter((p) => p.id !== id));

  const triggerProductIds = triggerProducts
    .map((p) => extractNumericId(p.id))
    .join(",");
  const offerProductId = offerProduct ? extractNumericId(offerProduct.id) : "";

  return (
    <Page
      backAction={{ content: "Funnels", url: "/app/funnels" }}
      title="Create funnel"
    >
      <Form method="post">
        {/* Hidden fields carrying the resolved IDs */}
        <input type="hidden" name="triggerProductIds" value={triggerProductIds} />
        <input type="hidden" name="offerProductId" value={offerProductId} />

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
                    options={placementOptions}
                    value={placement}
                    onChange={setPlacement}
                    helpText="Where this offer appears in the customer journey"
                  />
                  <Select
                    label="Offer type"
                    name="offerType"
                    options={offerTypeOptions}
                    value={offerType}
                    onChange={setOfferType}
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
