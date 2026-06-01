/* ============================================================
   Analytics dashboard — data-viz variants (line vs bars),
   date range, per-funnel table, conversion funnel.
   ============================================================ */
function ScreenAnalytics({ funnels, dashViz, plan, onNav }) {
  const [range, setRange] = useState("30d");
  const [placement, setPlacement] = useState("all");
  const totalRev = funnels.reduce((s, f) => s + f.revenue, 0);
  const totalImp = funnels.reduce((s, f) => s + f.impressions, 0);
  const totalAcc = funnels.reduce((s, f) => s + f.accepts, 0);
  const rate = totalImp ? totalAcc / totalImp * 100 : 0;
  const ranked = [...funnels].filter((f) => f.impressions).sort((a, b) => b.revenue - a.revenue);

  const barData = ranked.slice(0, 6).map((f) => ({ label: f.name.split(" ")[0], value: f.revenue }));
  const placementBars = Object.entries(PLACEMENT_META).map(([id, m]) => ({
    label: m.label.split(" ")[0],
    value: funnels.filter((f) => f.placement === id).reduce((s, f) => s + f.revenue, 0),
    color: id === "post-purchase" ? "var(--amoni)" : undefined,
  })).filter((d) => d.value);

  return (
    <Page title="Analytics" width={1080}
      subtitle="Measure the AOV lift from every funnel and placement."
      secondaryActions={<Button icon="external" variant="secondary">Export CSV</Button>}
      primaryAction={
        <SegmentedControl size="sm" value={range} onChange={setRange} options={[{ value: "7d", label: "7d" }, { value: "30d", label: "30d" }, { value: "90d", label: "90d" }, { value: "custom", label: "Custom" }]} />
      }>
      <BlockStack gap={16}>
        {plan === "Growth" && (
          <Banner tone="amoni" title="Unlock advanced analytics" icon="bolt"
            action={<Button size="sm" variant="primary" onClick={() => onNav("billing")}>Upgrade to Pro</Button>}>
            Funnel comparison, A/B test results and conversion-by-placement are available on Pro.
          </Banner>
        )}

        <InlineStack gap={12} wrap style={{ alignItems: "stretch" }}>
          <Stat label="Revenue attributed" value={fmtMoney(totalRev)} delta={18} icon="bolt" accent />
          <Stat label="AOV lift" value="+$9.40" delta={6} icon="arrowUp" />
          <Stat label="Total accepts" value={fmtNum(totalAcc)} delta={12} icon="check" />
          <Stat label="Accept rate" value={rate.toFixed(1) + "%"} delta={2} icon="target" />
        </InlineStack>

        {/* Main chart — variant: line or bars */}
        <Card padding={18}>
          <InlineStack justify="space-between" style={{ marginBottom: 14 }}>
            <div><div className="t-h2">{dashViz === "bars" ? "Revenue by funnel" : "Revenue attributed over time"}</div><div className="t-cap" style={{ marginTop: 2 }}>{dashViz === "bars" ? "Top funnels, this period" : "Daily, vs. previous period"}</div></div>
            <SegmentedControl size="sm" value={placement} onChange={setPlacement} options={[{ value: "all", label: "All" }, { value: "pp", label: "Post-purchase" }, { value: "cart", label: "Cart" }]} />
          </InlineStack>
          {dashViz === "bars"
            ? <BarChart data={barData} height={230} money />
            : <LineChart data={SERIES_30D} compare={SERIES_PREV} height={230} />}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card padding={18}>
            <div className="t-h2" style={{ marginBottom: 4 }}>Conversion funnel</div>
            <div className="t-cap" style={{ marginBottom: 16 }}>How shoppers move from impression to completed upsell</div>
            <ConvFunnel steps={CONV_STEPS} />
          </Card>
          <Card padding={18}>
            <div className="t-h2" style={{ marginBottom: 4 }}>Revenue by placement</div>
            <div className="t-cap" style={{ marginBottom: 16 }}>{plan === "Growth" ? "Available on Pro — sample shown" : "This period"}</div>
            <div style={{ opacity: plan === "Growth" ? 0.5 : 1, pointerEvents: plan === "Growth" ? "none" : "auto", filter: plan === "Growth" ? "blur(0px)" : "none" }}>
              <BarChart data={placementBars} height={196} money />
            </div>
          </Card>
        </div>

        {/* per-funnel table */}
        <Card padding={0} flush>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="t-h2">Funnel performance</div>
            <Button variant="plain" tone="amoni" size="sm" iconRight="arrowRight" onClick={() => onNav("funnels")}>Manage funnels</Button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr 1.4fr", gap: 12, padding: "9px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-sub)" }}>
            {["Funnel", "Impressions", "Accepts", "Accept rate", "Revenue", "Trend"].map((h, i) => <span key={i} className="t-cap" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i > 0 && i < 5 ? "right" : "left" }}>{h}</span>)}
          </div>
          {ranked.map((f, i) => (
            <div key={f.id} className="row-hover" style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr 1.4fr", gap: 12, padding: "11px 18px", borderBottom: i < ranked.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
              <InlineStack gap={10} style={{ minWidth: 0 }}><Thumb product={f.offer} size={32} /><div style={{ minWidth: 0 }}><div className="t-strong" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div><Badge tone={PLACEMENT_META[f.placement].tone} size="sm">{PLACEMENT_META[f.placement].label}</Badge></div></InlineStack>
              <span className="t-body" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(f.impressions)}</span>
              <span className="t-body" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(f.accepts)}</span>
              <span style={{ textAlign: "right" }}><Badge tone={acceptRate(f) > 10 ? "success" : "neutral"} size="sm">{acceptRate(f).toFixed(1)}%</Badge></span>
              <span className="t-num" style={{ textAlign: "right", fontSize: 13.5 }}>{fmtMoney(f.revenue)}</span>
              <div style={{ display: "flex", justifyContent: "flex-end" }}><Sparkline data={SERIES_30D.slice(i * 2, i * 2 + 12).length > 3 ? SERIES_30D.slice(i, i + 12) : SERIES_30D.slice(-12)} /></div>
            </div>
          ))}
        </Card>
      </BlockStack>
    </Page>
  );
}
Object.assign(window, { ScreenAnalytics });
