import React from "react";
import {
  extend,
  render,
  useExtensionInput,
  BlockStack,
  Button,
  CalloutBanner,
  Heading,
  Image,
  Layout,
  Text,
  InlineStack,
} from "@shopify/post-purchase-ui-extensions-react";

extend(
  "Checkout::PostPurchase::ShouldRender",
  async ({ inputData, storage }) => {
    const { initialPurchase } = inputData;
    const productIds = initialPurchase.lineItems.map(
      (item: { product: { id: string } }) => item.product.id
    );

    const response = await fetch(
      `${inputData.shop.storefrontUrl}/apps/amoni/api/funnels?shop=${
        inputData.shop.domain
      }&placement=post-purchase&productIds=${productIds.join(",")}`
    );
    const { funnels } = await response.json();

    if (funnels.length > 0) {
      await storage.update({ offer: funnels[0] });
      return { render: true };
    }
    return { render: false };
  }
);

render("Checkout::PostPurchase::Render", () => <App />);

interface Offer {
  id: string;
  offerName: string;
  offerImageUrl: string;
  offerVariantId: string;
  offerPrice: number;
  discountType: string;
  discountValue: number;
  triggerPrice?: number;
}

function App() {
  const { storage, inputData, applyChange, done } = useExtensionInput<{
    offer: Offer;
  }>();
  const offer: Offer | undefined = storage.initialData?.offer;
  const [loading, setLoading] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  if (!offer) {
    done();
    return null;
  }

  const discountedPrice =
    offer.discountType === "percent"
      ? offer.offerPrice * (1 - offer.discountValue / 100)
      : offer.offerPrice;

  async function handleAccept() {
    setLoading(true);
    const result = await applyChange({
      type: "addVariant",
      variantId: offer!.offerVariantId,
      quantity: 1,
      discount:
        offer!.discountValue > 0
          ? {
              value: offer!.discountValue,
              valueType:
                offer!.discountType === "percent"
                  ? "percentage"
                  : "fixedAmount",
              title: "Amoni Upsell",
            }
          : undefined,
    });
    if (result.type === "success") {
      setAccepted(true);
      await fetch(
        `${inputData.shop.storefrontUrl}/apps/amoni/api/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            funnelId: offer!.id,
            shop: inputData.shop.domain,
            eventType: "accept",
            orderId: inputData.initialPurchase.referenceId,
            revenue: discountedPrice,
          }),
        }
      );
    }
    setLoading(false);
    done();
  }

  if (accepted) {
    return (
      <BlockStack spacing="loose">
        <CalloutBanner title="Added to your order!" status="success">
          <Text>Charged to your original payment method.</Text>
        </CalloutBanner>
        <Button onPress={done}>Continue to order summary</Button>
      </BlockStack>
    );
  }

  return (
    <BlockStack spacing="loose">
      <CalloutBanner title="Wait! One-time offer just for you">
        <Text>
          Added automatically — no need to re-enter payment details.
        </Text>
      </CalloutBanner>
      <Layout
        maxInlineSize={0.95}
        media={[
          { viewportSize: "small", sizes: [1, 0, 1], maxInlineSize: 1 },
          { viewportSize: "medium", sizes: [532, 0, 0], maxInlineSize: 1 },
          { viewportSize: "large", sizes: [378, 0, 0], maxInlineSize: 1 },
        ]}
      >
        <BlockStack spacing="loose">
          <Image source={offer.offerImageUrl} />
          <Heading>{offer.offerName}</Heading>
          <InlineStack>
            <Text size="xlarge" emphasized>
              ${discountedPrice.toFixed(2)}
            </Text>
            {offer.discountValue > 0 && (
              <Text size="medium" subdued>
                <s>${offer.offerPrice.toFixed(2)}</s>
              </Text>
            )}
          </InlineStack>
          <Button onPress={handleAccept} loading={loading} submit>
            Add to my order · ${discountedPrice.toFixed(2)}
          </Button>
          <Button onPress={done} plain>
            No thanks, complete order
          </Button>
        </BlockStack>
      </Layout>
    </BlockStack>
  );
}
