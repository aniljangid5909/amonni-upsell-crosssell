import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
import {
  Page, IndexTable, Badge, Button, ButtonGroup, EmptyState, Text,
  Banner, BlockStack, InlineStack, ProgressBar, Box,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { getCurrentPlan, getMonthlyImpressions, PLAN_LIMITS } from "../plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? session.shop;
  const host = url.searchParams.get("host") ?? "";

  const [plan, monthlyImpressions, funnels] = await Promise.all([
    getCurrentPlan(admin, session.shop),
    getMonthlyImpressions(session.shop),
    prisma.funnel.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      include: { impressions: { select: { eventType: true } } },
    }),
  ]);

  const limits = PLAN_LIMITS[plan];
  const activeFunnelCount = funnels.filter((f) => f.status === "active").length;

  const funnelStats = funnels.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    placement: f.placement,
    offerType: f.offerType,
    impressionCount: f.impressions.filter((e) => e.eventType === "impression").length,
    acceptRate: (() => {
      const imp = f.impressions.filter((e) => e.eventType === "impression").length;
      const acc = f.impressions.filter((e) => e.eventType === "accept").length;
      return imp > 0 ? ((acc / imp) * 100).toFixed(1) : "0.0";
    })(),
  }));

  return json({ funnels: funnelStats, shop, host, plan, limits, activeFunnelCount, monthlyImpressions });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action") as string;
  const id = formData.get("id") as string;

  if (_action === "delete") {
    await prisma.funnel.delete({ where: { id, shop: session.shop } });
  } else if (_action === "toggle") {
    const currentStatus = formData.get("currentStatus") as string;
    await prisma.funnel.update({
      where: { id, shop: session.shop },
      data: { status: currentStatus === "active" ? "paused" : "active" },
    });
  }
  return json({ ok: true });
};

function placementBadge(placement: string) {
  switch (placement) {
    case "post-purchase": return <Badge tone="success">Post-purchase</Badge>;
    case "cart":          return <Badge tone="info">Cart</Badge>;
    case "product":       return <Badge tone="neutral" as="span">Product page</Badge>;
    case "checkout":      return <Badge tone="warning">Checkout</Badge>;
    default:              return <Badge>{placement}</Badge>;
  }
}

function offerTypeLabel(t: string) {
  return t === "upsell" ? "Upsell" : t === "cross-sell" ? "Cross-sell" : "Bundle";
}

function statusBadge(status: string) {
  return status === "active"
    ? <Badge tone="success">Active</Badge>
    : <Badge tone="neutral" as="span">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

const PLAN_LABEL: Record<string, string> = { starter: "Starter (Free)", growth: "Growth", pro: "Pro" };

export default function FunnelsPage() {
  const { funnels, shop, host, plan, limits, activeFunnelCount, monthlyImpressions } =
    useLoaderData<typeof loader>();
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const submit = useSubmit();
  const navigate = useNavigate();

  const atFunnelLimit = limits.maxFunnels !== null && activeFunnelCount >= (limits.maxFunnels as number);
  const atImpressionLimit = limits.maxImpressionsPerMonth !== null &&
    isFinite(limits.maxImpressionsPerMonth as number) &&
    monthlyImpressions >= (limits.maxImpressionsPerMonth as number);

  const funnelProgress = limits.maxFunnels && isFinite(limits.maxFunnels as number)
    ? Math.min(100, Math.round((activeFunnelCount / (limits.maxFunnels as number)) * 100))
    : null;
  const impressionProgress = limits.maxImpressionsPerMonth && isFinite(limits.maxImpressionsPerMonth as number)
    ? Math.min(100, Math.round((monthlyImpressions / (limits.maxImpressionsPerMonth as number)) * 100))
    : null;

  const rowMarkup = funnels.map((funnel, index) => (
    <IndexTable.Row id={funnel.id} key={funnel.id} selected={false} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">{funnel.name}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{placementBadge(funnel.placement)}</IndexTable.Cell>
      <IndexTable.Cell>{offerTypeLabel(funnel.offerType)}</IndexTable.Cell>
      <IndexTable.Cell>{statusBadge(funnel.status)}</IndexTable.Cell>
      <IndexTable.Cell>{funnel.impressionCount.toLocaleString()}</IndexTable.Cell>
      <IndexTable.Cell>{funnel.acceptRate}%</IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button size="slim" onClick={() => navigate(`/app/funnels/${funnel.id}/edit${qs}`)}>Edit</Button>
          <Button size="slim" onClick={() => submit({ _action: "toggle", id: funnel.id, currentStatus: funnel.status }, { method: "post" })}>
            {funnel.status === "active" ? "Pause" : "Activate"}
          </Button>
          <Button size="slim" tone="critical" onClick={() => {
            if (confirm("Delete this funnel?")) submit({ _action: "delete", id: funnel.id }, { method: "post" });
          }}>Delete</Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Funnels"
      primaryAction={
        <Button variant="primary" disabled={atFunnelLimit} onClick={() => navigate(`/app/funnels/new${qs}`)}>
          Create funnel
        </Button>
      }
    >
      <BlockStack gap="400">
        {/* ── Plan usage card ── */}
        <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingSm" as="h3">Plan: {PLAN_LABEL[plan]}</Text>
              <Button size="slim" variant="plain" url={`/app/pricing${qs}`}>
                {plan === "pro" ? "Manage plan" : "Upgrade"}
              </Button>
            </InlineStack>

            <InlineStack gap="600" wrap>
              {/* Funnel usage */}
              <BlockStack gap="100" inlineSize="240px">
                <InlineStack align="space-between">
                  <Text variant="bodySm" as="span">Active funnels</Text>
                  <Text variant="bodySm" as="span">
                    {activeFunnelCount} / {isFinite(limits.maxFunnels as number) ? limits.maxFunnels : "∞"}
                  </Text>
                </InlineStack>
                {funnelProgress !== null && (
                  <ProgressBar progress={funnelProgress} tone={funnelProgress >= 90 ? "critical" : "highlight"} size="small" />
                )}
              </BlockStack>

              {/* Impression usage */}
              {impressionProgress !== null && (
                <BlockStack gap="100" inlineSize="240px">
                  <InlineStack align="space-between">
                    <Text variant="bodySm" as="span">Impressions this month</Text>
                    <Text variant="bodySm" as="span">{monthlyImpressions} / {limits.maxImpressionsPerMonth}</Text>
                  </InlineStack>
                  <ProgressBar progress={impressionProgress} tone={impressionProgress >= 90 ? "critical" : "highlight"} size="small" />
                </BlockStack>
              )}

              {/* Feature flags */}
              <InlineStack gap="200" wrap>
                {[
                  { label: "Cart drawer", ok: limits.cartDrawer },
                  { label: "Bundle", ok: limits.allowedOfferTypes.includes("bundle") },
                  { label: "Discount codes", ok: limits.discountCodes },
                  { label: "Display styles", ok: limits.displayStyles },
                ].map(({ label, ok }) => (
                  <span key={label} style={{ fontSize: "12px", color: ok ? "#0c7a3e" : "#aaa", display: "flex", alignItems: "center", gap: "4px" }}>
                    {ok ? "✓" : "✕"} {label}
                  </span>
                ))}
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Box>

        {/* ── Upgrade banners ── */}
        {atFunnelLimit && plan !== "pro" && (
          <Banner tone="warning" title={`Funnel limit reached (${limits.maxFunnels} on ${PLAN_LABEL[plan]})`}>
            <p>Upgrade to {plan === "starter" ? "Growth" : "Pro"} to create more funnels.</p>
            <Button variant="plain" url={`/app/pricing${qs}`}>View plans →</Button>
          </Banner>
        )}
        {atImpressionLimit && plan !== "pro" && (
          <Banner tone="critical" title="Monthly impression limit reached">
            <p>Your widgets are paused until next month or you upgrade. Upgrade to Growth for unlimited impressions.</p>
            <Button variant="plain" url={`/app/pricing${qs}`}>Upgrade now →</Button>
          </Banner>
        )}

        {/* ── Table ── */}
        {funnels.length === 0 ? (
          <EmptyState
            heading="Create your first upsell funnel"
            action={{ content: "Create funnel", onAction: () => navigate(`/app/funnels/new${qs}`) }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Set up offers that appear at the right moment in your customer&apos;s journey.</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: "funnel", plural: "funnels" }}
            itemCount={funnels.length}
            selectedItemsCount={0}
            onSelectionChange={() => {}}
            headings={[
              { title: "Name" }, { title: "Placement" }, { title: "Offer type" },
              { title: "Status" }, { title: "Impressions" }, { title: "Accept rate" }, { title: "Actions" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        )}
      </BlockStack>
    </Page>
  );
}
