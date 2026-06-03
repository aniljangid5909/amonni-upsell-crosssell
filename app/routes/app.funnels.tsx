import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, Link, useNavigate, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import {
  Page,
  IndexTable,
  Badge,
  Button,
  ButtonGroup,
  EmptyState,
  useIndexResourceState,
  Text,
} from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const funnels = await prisma.funnel.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    include: {
      impressions: {
        select: { eventType: true },
      },
    },
  });

  const funnelStats = funnels.map((f) => {
    const impressionCount = f.impressions.filter(
      (e) => e.eventType === "impression"
    ).length;
    const acceptCount = f.impressions.filter(
      (e) => e.eventType === "accept"
    ).length;
    const acceptRate =
      impressionCount > 0
        ? ((acceptCount / impressionCount) * 100).toFixed(1)
        : "0.0";
    return {
      id: f.id,
      name: f.name,
      status: f.status,
      placement: f.placement,
      offerType: f.offerType,
      impressionCount,
      acceptRate,
    };
  });

  return json({ funnels: funnelStats });
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
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await prisma.funnel.update({
      where: { id, shop: session.shop },
      data: { status: newStatus },
    });
  }

  return json({ ok: true });
};

function placementBadge(placement: string) {
  switch (placement) {
    case "post-purchase":
      return <Badge tone="success">Post-purchase</Badge>;
    case "cart":
      return <Badge tone="info">Cart</Badge>;
    case "product":
      return <Badge tone="neutral" as="span">Product page</Badge>;
    case "checkout":
      return <Badge tone="warning">Checkout</Badge>;
    default:
      return <Badge>{placement}</Badge>;
  }
}

function offerTypeLabel(offerType: string) {
  switch (offerType) {
    case "upsell":
      return "Upsell";
    case "cross-sell":
      return "Cross-sell";
    case "bundle":
      return "Bundle";
    default:
      return offerType;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge tone="success">Active</Badge>;
    case "paused":
      return <Badge tone="neutral" as="span">Paused</Badge>;
    case "draft":
      return <Badge tone="neutral" as="span">Draft</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export default function FunnelsPage() {
  const { funnels } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();

  const resourceName = { singular: "funnel", plural: "funnels" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(funnels);

  const handleToggle = (id: string, currentStatus: string) => {
    submit(
      { _action: "toggle", id, currentStatus },
      { method: "post" }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this funnel?")) {
      submit({ _action: "delete", id }, { method: "post" });
    }
  };

  const rowMarkup = funnels.map((funnel, index) => (
    <IndexTable.Row
      id={funnel.id}
      key={funnel.id}
      selected={selectedResources.includes(funnel.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {funnel.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{placementBadge(funnel.placement)}</IndexTable.Cell>
      <IndexTable.Cell>{offerTypeLabel(funnel.offerType)}</IndexTable.Cell>
      <IndexTable.Cell>{statusBadge(funnel.status)}</IndexTable.Cell>
      <IndexTable.Cell>
        {funnel.impressionCount.toLocaleString()}
      </IndexTable.Cell>
      <IndexTable.Cell>{funnel.acceptRate}%</IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button size="slim" onClick={() => navigate(`/app/funnels/${funnel.id}/edit`)}>
            Edit
          </Button>
          <Button
            size="slim"
            onClick={() => handleToggle(funnel.id, funnel.status)}
          >
            {funnel.status === "active" ? "Pause" : "Activate"}
          </Button>
          <Button
            size="slim"
            tone="critical"
            onClick={() => handleDelete(funnel.id)}
          >
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Funnels"
      primaryAction={
        <Button variant="primary" onClick={() => navigate("/app/funnels/new")}>
          Create funnel
        </Button>
      }
    >
      {funnels.length === 0 ? (
        <EmptyState
          heading="Create your first upsell funnel"
          action={{ content: "Create funnel", onAction: () => navigate("/app/funnels/new") }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Set up offers that appear at the right moment in your customer&apos;s
            journey.
          </p>
        </EmptyState>
      ) : (
        <IndexTable
          resourceName={resourceName}
          itemCount={funnels.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Name" },
            { title: "Placement" },
            { title: "Offer type" },
            { title: "Status" },
            { title: "Impressions" },
            { title: "Accept rate" },
            { title: "Actions" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      )}
    </Page>
  );
}
