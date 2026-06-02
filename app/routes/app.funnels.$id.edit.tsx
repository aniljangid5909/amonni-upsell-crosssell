import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigation, Form } from "@remix-run/react";
import { useState } from "react";
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
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const funnel = await prisma.funnel.findFirst({
    where: { id: id as string, shop: session.shop },
  });

  if (!funnel) {
    throw new Response("Not found", { status: 404 });
  }

  return json({ funnel });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;
  const formData = await request.formData();
  const _action = formData.get("_action") as string;

  if (_action === "delete") {
    await prisma.funnel.delete({
      where: { id: id as string, shop: session.shop },
    });
    return redirect("/app/funnels");
  }

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

  const triggerProductIds = triggerProductIdsRaw
    ? triggerProductIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  await prisma.funnel.update({
    where: { id: id as string, shop: session.shop },
    data: {
      name,
      placement,
      offerType,
      triggerProductIds,
      offerProductId: offerProductId || "",
      discountType,
      discountValue,
      minCartValue,
      skipSubscribed,
    },
  });

  return redirect("/app/funnels");
};

const placementOptions = [
  {
    label: "Post-purchase (between order confirmation and thank-you)",
    value: "post-purchase",
  },
  { label: "Cart drawer (when trigger product is in cart)", value: "cart" },
  {
    label: "Product page (frequently bought together)",
    value: "product",
  },
  {
    label: "Checkout block (Shopify Plus only)",
    value: "checkout",
  },
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

export default function EditFunnelPage() {
  const { funnel } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [discountType, setDiscountType] = useState(funnel.discountType);
  const [discountValue, setDiscountValue] = useState(
    funnel.discountValue ? String(funnel.discountValue) : ""
  );
  const [minCartValue, setMinCartValue] = useState(
    String(funnel.minCartValue)
  );
  const [skipSubscribed, setSkipSubscribed] = useState(funnel.skipSubscribed);
  const [name, setName] = useState(funnel.name);
  const [placement, setPlacement] = useState(funnel.placement);
  const [offerType, setOfferType] = useState(funnel.offerType);
  const [triggerProductIds, setTriggerProductIds] = useState(
    funnel.triggerProductIds.join(", ")
  );
  const [offerProductId, setOfferProductId] = useState(funnel.offerProductId);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this funnel? This cannot be undone.")) {
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
    <Page
      backAction={{ content: "Funnels", url: "/app/funnels" }}
      title="Edit funnel"
    >
      <Form method="post">
        <Layout>
          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">
                Funnel details
              </Text>
              <div style={{ marginTop: "16px" }}>
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
                  />
                  <Select
                    label="Offer type"
                    name="offerType"
                    options={offerTypeOptions}
                    value={offerType}
                    onChange={setOfferType}
                  />
                </FormLayout>
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">
                Trigger &amp; offer products
              </Text>
              <div style={{ marginTop: "16px" }}>
                <FormLayout>
                  <TextField
                    label="Trigger product IDs"
                    name="triggerProductIds"
                    value={triggerProductIds}
                    onChange={setTriggerProductIds}
                    helpText="Comma-separated Shopify product IDs. This funnel fires when any of these are in the order/cart."
                    placeholder="8432156..., 8432157..."
                    autoComplete="off"
                  />
                  <TextField
                    label="Offer product ID"
                    name="offerProductId"
                    value={offerProductId}
                    onChange={setOfferProductId}
                    helpText="The product ID to offer."
                    placeholder="8432158..."
                    autoComplete="off"
                  />
                </FormLayout>
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">
                Discount
              </Text>
              <div style={{ marginTop: "16px" }}>
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
              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">
                Display conditions
              </Text>
              <div style={{ marginTop: "16px" }}>
                <FormLayout>
                  <TextField
                    label="Minimum cart value"
                    name="minCartValue"
                    type="number"
                    value={minCartValue}
                    onChange={setMinCartValue}
                    prefix="$"
                    helpText="Only show this funnel if cart value is above this amount. Leave 0 to always show."
                    autoComplete="off"
                  />
                  <Checkbox
                    label="Skip customers who already subscribe to the offered product"
                    name="skipSubscribed"
                    checked={skipSubscribed}
                    onChange={setSkipSubscribed}
                  />
                </FormLayout>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
        <PageActions
          primaryAction={{
            content: "Save funnel",
            submit: true,
            loading: isSubmitting,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              url: "/app/funnels",
            },
            {
              content: "Delete funnel",
              destructive: true,
              onAction: handleDelete,
            },
          ]}
        />
      </Form>
    </Page>
  );
}
