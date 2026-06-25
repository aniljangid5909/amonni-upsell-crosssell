import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Layout, Text, BlockStack, InlineStack, Box, Badge, ProgressBar, Divider, Button } from "@shopify/polaris";
import { authenticate, prisma } from "../shopify.server";
import { getCurrentPlan, getMonthlyImpressions, PLAN_LIMITS } from "../plan.server";

const PLAN_LABEL: Record<string, string> = { starter: "Starter (Free)", growth: "Growth", pro: "Pro" };
const PLAN_COLOR: Record<string, string> = { starter: "#888", growth: "#1a7f5a", pro: "#1a1a6e" };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);

  const [plan, monthlyImpressions, funnels, thisMonthEvents, lastMonthEvents, last7Events] = await Promise.all([
    getCurrentPlan(admin, shop),
    getMonthlyImpressions(shop),
    prisma.funnel.findMany({
      where: { shop },
      include: { impressions: { select: { eventType: true, revenue: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.funnelEvent.findMany({ where: { shop, createdAt: { gte: monthStart } }, select: { eventType: true, revenue: true, funnelId: true } }),
    prisma.funnelEvent.findMany({ where: { shop, createdAt: { gte: lastMonthStart, lt: monthStart } }, select: { eventType: true, revenue: true } }),
    prisma.funnelEvent.findMany({ where: { shop, createdAt: { gte: weekStart } }, select: { eventType: true, createdAt: true } }),
  ]);

  const rawLimits = PLAN_LIMITS[plan];
  const limits = {
    ...rawLimits,
    maxFunnels: isFinite(rawLimits.maxFunnels) ? rawLimits.maxFunnels : null,
    maxImpressionsPerMonth: isFinite(rawLimits.maxImpressionsPerMonth) ? rawLimits.maxImpressionsPerMonth : null,
  };

  // This month stats
  const thisImpressions = thisMonthEvents.filter(e => e.eventType === "impression").length;
  const thisAccepts = thisMonthEvents.filter(e => e.eventType === "accept").length;
  const thisRevenue = thisMonthEvents.filter(e => e.eventType === "accept").reduce((s, e) => s + (e.revenue || 0), 0);
  const thisConversion = thisImpressions > 0 ? ((thisAccepts / thisImpressions) * 100) : 0;

  // Last month stats
  const lastImpressions = lastMonthEvents.filter(e => e.eventType === "impression").length;
  const lastAccepts = lastMonthEvents.filter(e => e.eventType === "accept").length;
  const lastRevenue = lastMonthEvents.filter(e => e.eventType === "accept").reduce((s, e) => s + (e.revenue || 0), 0);

  // Last 7 days by day
  const dailyData: Record<string, { impressions: number; accepts: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyData[key] = { impressions: 0, accepts: 0 };
  }
  last7Events.forEach(e => {
    const key = new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dailyData[key]) {
      if (e.eventType === "impression") dailyData[key].impressions++;
      if (e.eventType === "accept") dailyData[key].accepts++;
    }
  });

  // Per-funnel stats
  const activeFunnelCount = funnels.filter(f => f.status === "active").length;
  const funnelStats = funnels.map(f => {
    const imp = f.impressions.filter(e => e.eventType === "impression").length;
    const acc = f.impressions.filter(e => e.eventType === "accept").length;
    const rev = f.impressions.filter(e => e.eventType === "accept").reduce((s, e) => s + (e.revenue || 0), 0);
    return {
      id: f.id, name: f.name, status: f.status, placement: f.placement, offerType: f.offerType,
      impressions: imp, accepts: acc, revenue: rev,
      conversionRate: imp > 0 ? ((acc / imp) * 100).toFixed(1) : "0.0",
    };
  }).sort((a, b) => b.impressions - a.impressions);

  // Per-placement breakdown (Pro) — derive placement from funnelId→funnel map
  const funnelPlacementMap: Record<string, string> = {};
  funnels.forEach(f => { funnelPlacementMap[f.id] = f.placement; });
  const placements = ["post-purchase", "cart", "product", "checkout"];
  const placementBreakdown = placements.map(p => {
    const events = thisMonthEvents.filter(e => funnelPlacementMap[e.funnelId] === p);
    const imp = events.filter(e => e.eventType === "impression").length;
    const acc = events.filter(e => e.eventType === "accept").length;
    const rev = events.filter(e => e.eventType === "accept").reduce((s, e) => s + (e.revenue || 0), 0);
    return { placement: p, impressions: imp, accepts: acc, revenue: rev, conversionRate: imp > 0 ? ((acc / imp) * 100).toFixed(1) : "0.0" };
  }).filter(p => p.impressions > 0 || funnels.some(f => f.placement === p));

  // CSV export data (all funnels, full stats)
  const csvRows = funnelStats.map(f => `"${f.name}","${f.placement}","${f.offerType}","${f.status}",${f.impressions},${f.accepts},${f.conversionRate}%,$${f.revenue.toFixed(2)}`);
  const csvData = `Name,Placement,Offer type,Status,Impressions,Accepts,Conversion rate,Revenue\n${csvRows.join("\n")}`;

  return json({
    shop, plan, limits, activeFunnelCount,
    monthlyImpressions,
    host: url.searchParams.get("host") ?? "",
    stats: { thisImpressions, thisAccepts, thisRevenue, thisConversion, lastImpressions, lastAccepts, lastRevenue },
    dailyData,
    funnelStats: funnelStats.slice(0, 5),
    allFunnelStats: funnelStats,
    totalFunnels: funnels.length,
    placementBreakdown,
    csvData,
  });
};

function pct(a: number, b: number) {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}

function StatCard({ title, value, sub, delta, prefix = "", locked = false }: {
  title: string; value: string | number; sub?: string; delta?: number | null; prefix?: string; locked?: boolean;
}) {
  return (
    <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border" minWidth="160px">
      <BlockStack gap="100">
        <Text variant="bodySm" tone="subdued" as="p">{title}</Text>
        {locked ? (
          <InlineStack gap="100" blockAlign="center">
            <span style={{ fontSize: "20px" }}>🔒</span>
            <Text variant="bodySm" tone="subdued" as="p">Upgrade to unlock</Text>
          </InlineStack>
        ) : (
          <>
            <Text variant="headingLg" as="p">{prefix}{typeof value === "number" ? value.toLocaleString() : value}</Text>
            {sub && <Text variant="bodySm" tone="subdued" as="p">{sub}</Text>}
            {delta !== null && delta !== undefined && (
              <span style={{ fontSize: "12px", color: delta >= 0 ? "#0c7a3e" : "#d72c0d", fontWeight: 600 }}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs last month
              </span>
            )}
          </>
        )}
      </BlockStack>
    </Box>
  );
}

function MiniBar({ label, impressions, accepts, maxImpressions }: { label: string; impressions: number; accepts: number; maxImpressions: number }) {
  const impPct = maxImpressions > 0 ? (impressions / maxImpressions) * 100 : 0;
  const accPct = maxImpressions > 0 ? (accepts / maxImpressions) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
      <span style={{ width: "48px", color: "#666", textAlign: "right", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: "16px", background: "#f0f0f0", borderRadius: "3px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${impPct}%`, background: "#c5e8ff", borderRadius: "3px" }} />
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${accPct}%`, background: "#1a7f5a", borderRadius: "3px" }} />
      </div>
      <span style={{ width: "28px", color: "#333", fontWeight: 600, flexShrink: 0 }}>{impressions}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { shop, plan, limits, activeFunnelCount, monthlyImpressions, host, stats, dailyData, funnelStats, allFunnelStats, totalFunnels, placementBreakdown, csvData } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);
  const qs = params.toString() ? `?${params.toString()}` : "";

  const isGrowthPlus = plan === "growth" || plan === "pro";
  const isPro = plan === "pro";

  const funnelPct = limits.maxFunnels !== null ? Math.min(100, Math.round((activeFunnelCount / limits.maxFunnels) * 100)) : null;
  const impPct = limits.maxImpressionsPerMonth !== null ? Math.min(100, Math.round((monthlyImpressions / limits.maxImpressionsPerMonth) * 100)) : null;

  const maxDaily = Math.max(...Object.values(dailyData).map(d => d.impressions), 1);

  return (
    <Page
      title="Dashboard"
      subtitle={`Welcome back — here's how your upsells are performing`}
      primaryAction={<Button variant="primary" onClick={() => navigate(`/app/funnels/new${qs}`)}>Create funnel</Button>}
    >
      <BlockStack gap="500">

        {/* ── Plan overview ── */}
        <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Text variant="headingSm" as="h3">Plan overview</Text>
                <span style={{ background: PLAN_COLOR[plan], color: "#fff", fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px" }}>
                  {PLAN_LABEL[plan]}
                </span>
              </InlineStack>
              <Button size="slim" variant="plain" onClick={() => navigate(`/app/pricing${qs}`)}>
                {plan === "pro" ? "Manage plan" : "Upgrade →"}
              </Button>
            </InlineStack>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              {/* Active funnels */}
              <BlockStack gap="100">
                <InlineStack align="space-between">
                  <Text variant="bodySm" as="span">Active funnels</Text>
                  <Text variant="bodySm" as="span">{activeFunnelCount} / {limits.maxFunnels ?? "∞"}</Text>
                </InlineStack>
                {funnelPct !== null && <ProgressBar progress={funnelPct} tone={funnelPct >= 90 ? "critical" : "highlight"} size="small" />}
                {funnelPct === null && <div style={{ height: "6px", background: "#e0f5ec", borderRadius: "3px" }} />}
              </BlockStack>

              {/* Impressions */}
              <BlockStack gap="100">
                <InlineStack align="space-between">
                  <Text variant="bodySm" as="span">Impressions this month</Text>
                  <Text variant="bodySm" as="span">{monthlyImpressions.toLocaleString()} / {limits.maxImpressionsPerMonth?.toLocaleString() ?? "∞"}</Text>
                </InlineStack>
                {impPct !== null && <ProgressBar progress={impPct} tone={impPct >= 90 ? "critical" : "highlight"} size="small" />}
                {impPct === null && <div style={{ height: "6px", background: "#e0f5ec", borderRadius: "3px" }} />}
              </BlockStack>

              {/* Feature flags */}
              <InlineStack gap="300" wrap blockAlign="center">
                {[
                  { label: "Cart drawer", ok: limits.cartDrawer },
                  { label: "Bundle", ok: limits.allowedOfferTypes.includes("bundle") },
                  { label: "Discount codes", ok: limits.discountCodes },
                  { label: "Display styles", ok: limits.displayStyles },
                ].map(({ label, ok }) => (
                  <span key={label} style={{ fontSize: "12px", color: ok ? "#0c7a3e" : "#bbb", display: "flex", gap: "4px", alignItems: "center" }}>
                    {ok ? "✓" : "✕"} {label}
                  </span>
                ))}
              </InlineStack>
            </div>
          </BlockStack>
        </Box>

        {/* ── Key metrics ── */}
        <BlockStack gap="200">
          <Text variant="headingSm" as="h3">This month</Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
            <StatCard
              title="Impressions"
              value={stats.thisImpressions}
              delta={pct(stats.thisImpressions, stats.lastImpressions)}
              sub={`${stats.lastImpressions} last month`}
            />
            <StatCard
              title="Accepts"
              value={stats.thisAccepts}
              delta={pct(stats.thisAccepts, stats.lastAccepts)}
              sub={`${stats.lastAccepts} last month`}
            />
            <StatCard
              title="Conversion rate"
              value={`${stats.thisConversion.toFixed(1)}%`}
              sub={stats.thisImpressions > 0 ? `${stats.thisAccepts} of ${stats.thisImpressions}` : "No impressions yet"}
            />
            <StatCard
              title="Revenue attributed"
              value={stats.thisRevenue > 0 ? stats.thisRevenue.toFixed(2) : "—"}
              prefix={stats.thisRevenue > 0 ? "$" : ""}
              delta={stats.thisRevenue > 0 ? pct(stats.thisRevenue, stats.lastRevenue) : null}
              sub={stats.thisRevenue > 0 ? `$${stats.lastRevenue.toFixed(2)} last month` : "Track revenue by passing order value"}
              locked={!isGrowthPlus}
            />
          </div>
        </BlockStack>

        <Layout>
          {/* ── 7-day chart ── */}
          <Layout.Section variant="oneHalf">
            <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text variant="headingSm" as="h3">Last 7 days</Text>
                  <InlineStack gap="200">
                    <span style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#c5e8ff", borderRadius: "2px" }} /> Impressions
                    </span>
                    <span style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#1a7f5a", borderRadius: "2px" }} /> Accepts
                    </span>
                  </InlineStack>
                </InlineStack>
                <BlockStack gap="150">
                  {Object.entries(dailyData).map(([label, d]) => (
                    <MiniBar key={label} label={label} impressions={d.impressions} accepts={d.accepts} maxImpressions={maxDaily} />
                  ))}
                </BlockStack>
              </BlockStack>
            </Box>
          </Layout.Section>

          {/* ── Top funnels ── */}
          <Layout.Section variant="oneHalf">
            <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingSm" as="h3">Top funnels</Text>
                  <Button size="slim" variant="plain" onClick={() => navigate(`/app/funnels${qs}`)}>View all ({totalFunnels})</Button>
                </InlineStack>
                {funnelStats.length === 0 ? (
                  <Box paddingBlock="400">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text variant="bodySm" tone="subdued" as="p" alignment="center">No funnels yet</Text>
                      <Button size="slim" onClick={() => navigate(`/app/funnels/new${qs}`)}>Create your first funnel</Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <BlockStack gap="0">
                    {funnelStats.map((f, i) => (
                      <div key={f.id}>
                        {i > 0 && <Divider />}
                        <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <BlockStack gap="050">
                            <InlineStack gap="150" blockAlign="center">
                              <Text variant="bodySm" fontWeight="semibold" as="span">{f.name}</Text>
                              <span style={{
                                fontSize: "10px", padding: "1px 6px", borderRadius: "10px",
                                background: f.status === "active" ? "#e3f5eb" : "#f0f0f0",
                                color: f.status === "active" ? "#0c7a3e" : "#888",
                              }}>{f.status}</span>
                            </InlineStack>
                            <Text variant="bodySm" tone="subdued" as="span">{f.placement} · {f.offerType}</Text>
                          </BlockStack>
                          <BlockStack gap="050" inlineAlign="end">
                            <Text variant="bodySm" fontWeight="semibold" as="span">{f.conversionRate}%</Text>
                            <Text variant="bodySm" tone="subdued" as="span">{f.impressions.toLocaleString()} impr.</Text>
                          </BlockStack>
                        </div>
                      </div>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Box>
          </Layout.Section>
        </Layout>

        {/* ── Advanced analytics ── */}
        {isPro ? (
          <BlockStack gap="400">
            {/* Per-placement breakdown */}
            <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingSm" as="h3">Revenue by placement</Text>
                  <Button size="slim" variant="plain" onClick={() => {
                    const blob = new Blob([csvData], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "amoni-funnels-export.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }}>Export to CSV ↓</Button>
                </InlineStack>
                {placementBreakdown.length === 0 ? (
                  <Text variant="bodySm" tone="subdued" as="p">No data yet — impressions will appear here once your funnels receive traffic.</Text>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e4e4e4" }}>
                          {["Placement", "Impressions", "Accepts", "Conv. rate", "Revenue"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "#555", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {placementBreakdown.map((p, i) => (
                          <tr key={p.placement} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                            <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{p.placement.replace("-", " ")}</td>
                            <td style={{ padding: "8px 12px" }}>{p.impressions.toLocaleString()}</td>
                            <td style={{ padding: "8px 12px" }}>{p.accepts.toLocaleString()}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a7f5a" }}>{p.conversionRate}%</td>
                            <td style={{ padding: "8px 12px" }}>{p.revenue > 0 ? `$${p.revenue.toFixed(2)}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </BlockStack>
            </Box>

            {/* Full funnel table with revenue */}
            <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">All funnels — revenue breakdown</Text>
                {allFunnelStats.length === 0 ? (
                  <Text variant="bodySm" tone="subdued" as="p">Create a funnel to start tracking revenue.</Text>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e4e4e4" }}>
                          {["Funnel", "Placement", "Type", "Status", "Impressions", "Accepts", "Conv.", "Revenue"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "#555", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allFunnelStats.map((f, i) => (
                          <tr key={f.id} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 500, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</td>
                            <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{f.placement.replace("-", " ")}</td>
                            <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{f.offerType}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", background: f.status === "active" ? "#e3f5eb" : "#f0f0f0", color: f.status === "active" ? "#0c7a3e" : "#888" }}>{f.status}</span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>{f.impressions.toLocaleString()}</td>
                            <td style={{ padding: "8px 12px" }}>{f.accepts.toLocaleString()}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1a7f5a" }}>{f.conversionRate}%</td>
                            <td style={{ padding: "8px 12px" }}>{f.revenue > 0 ? `$${f.revenue.toFixed(2)}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </BlockStack>
            </Box>
          </BlockStack>
        ) : (
          <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingSm" as="h3">Advanced analytics</Text>
                  <span style={{ background: "#1a1a6e", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px" }}>Pro</span>
                </InlineStack>
                <Text variant="bodySm" tone="subdued" as="p">Per-placement revenue breakdown, full funnel revenue table, and export to CSV.</Text>
              </BlockStack>
              <Button variant="primary" onClick={() => navigate(`/app/pricing${qs}`)}>Upgrade to Pro</Button>
            </InlineStack>
          </Box>
        )}

        {/* ── Quick actions ── */}
        <Box background="bg-surface" borderRadius="300" padding="400" borderWidth="025" borderColor="border">
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Quick actions</Text>
            <InlineStack gap="300" wrap>
              <Button onClick={() => navigate(`/app/funnels/new${qs}`)}>+ Create funnel</Button>
              <Button onClick={() => navigate(`/app/funnels${qs}`)}>Manage funnels</Button>
              <Button onClick={() => navigate(`/app/pricing${qs}`)}>View pricing</Button>
              <Button onClick={() => navigate(`/app/storefront-preview${qs}`)}>Preview widget</Button>
            </InlineStack>
          </BlockStack>
        </Box>

      </BlockStack>
    </Page>
  );
}
