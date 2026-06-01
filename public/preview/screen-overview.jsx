/* ============================================================
   Overview (home) screen
   ============================================================ */
function ScreenOverview({ onNav, funnels, plan }) {
  const active = funnels.filter((f) => f.status === "active");
  const totalRev = funnels.reduce((s, f) => s + f.revenue, 0);
  const totalImp = funnels.reduce((s, f) => s + f.impressions, 0);
  const totalAcc = funnels.reduce((s, f) => s + f.accepts, 0);
  const rate = totalImp ? (totalAcc / totalImp * 100) : 0;
  const top = [...funnels].sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  return (
    <Page
      title="Overview"
      subtitle="Your upsell performance across every placement, last 30 days."
      primaryAction={<Button variant="primary" icon="plus" onClick={() => onNav("funnels", { create: true })}>Create funnel</Button>}
      secondaryActions={<Button icon="chart" onClick={() => onNav("analytics")}>View analytics</Button>}
    >
      <BlockStack gap={16}>
        {/* AI suggestion banner */}
        <Banner tone="amoni" title="3 new AI pairings found" icon="sparkle"
          action={<Button size="sm" variant="primary" onClick={() => onNav("ai")}>Review suggestions</Button>}>
          Amoni analyzed your last 90 days of orders. Customers who buy <strong>Radiance Vitamin C Serum</strong> add <strong>Daily Mineral SPF 40</strong> 3.2× more often — a strong post-purchase cross-sell.
        </Banner>

        {/* KPIs */}
        <InlineStack gap={12} align="stretch" wrap style={{ alignItems: "stretch" }}>
          <Stat label="Revenue attributed" value={fmtMoney(totalRev)} delta={18} icon="bolt" accent spark={<Sparkline data={SERIES_30D.slice(-12)} />} />
          <Stat label="AOV lift" value="+$9.40" delta={6} icon="arrowUp" />
          <Stat label="Accept rate" value={rate.toFixed(1) + "%"} delta={2} icon="target" />
          <Stat label="Active funnels" value={active.length} deltaLabel={`of ${funnels.length} total`} delta={null} icon="funnel" />
        </InlineStack>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          {/* Revenue chart */}
          <Card padding={18}>
            <InlineStack justify="space-between" style={{ marginBottom: 4 }}>
              <div>
                <div className="t-h2">Revenue attributed</div>
                <div className="t-cap" style={{ marginTop: 2 }}>Daily, last 30 days</div>
              </div>
              <InlineStack gap={14}>
                <InlineStack gap={6}><span style={{ width: 18, height: 3, background: "var(--amoni)", borderRadius: 2 }} /><span className="t-cap">This period</span></InlineStack>
                <InlineStack gap={6}><span style={{ width: 18, height: 0, borderTop: "2px dashed var(--border-strong)" }} /><span className="t-cap">Previous</span></InlineStack>
              </InlineStack>
            </InlineStack>
            <LineChart data={SERIES_30D} compare={SERIES_PREV} height={210} />
          </Card>

          {/* Placement mix donut */}
          <Card padding={18}>
            <div className="t-h2" style={{ marginBottom: 14 }}>Revenue by placement</div>
            <InlineStack gap={18} justify="center">
              <Donut size={138} thickness={22} centerValue={fmtMoney(totalRev / 1000, 0).replace("$", "$") + "k"} centerLabel="total"
                segments={[
                  { value: 29848, color: "var(--amoni)" },
                  { value: 31251, color: "color-mix(in oklch, var(--amoni) 66%, #fff)" },
                  { value: 38052, color: "color-mix(in oklch, var(--amoni) 40%, #fff)" },
                ]} />
              <BlockStack gap={10}>
                {[["Post-purchase", "var(--amoni)", "$29.8k"], ["Cart drawer", "color-mix(in oklch, var(--amoni) 66%, #fff)", "$31.3k"], ["Product page", "color-mix(in oklch, var(--amoni) 40%, #fff)", "$38.1k"]].map(([l, c, v]) => (
                  <InlineStack key={l} gap={8}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                    <div style={{ lineHeight: 1.15 }}><div className="t-cap" style={{ fontSize: 11.5 }}>{l}</div><div className="t-strong" style={{ fontSize: 13 }}>{v}</div></div>
                  </InlineStack>
                ))}
              </BlockStack>
            </InlineStack>
          </Card>
        </div>

        {/* Top funnels + quick start */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <Card padding={0} flush>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="t-h2">Top performing funnels</div>
              <Button variant="plain" tone="amoni" size="sm" iconRight="arrowRight" onClick={() => onNav("funnels")}>All funnels</Button>
            </div>
            <BlockStack>
              {top.map((f, i) => (
                <div key={f.id} onClick={() => onNav("funnels", { edit: f.id })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < top.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }} className="row-hover">
                  <Thumb product={f.offer} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-strong" style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                    <InlineStack gap={6} style={{ marginTop: 3 }}><Badge tone={PLACEMENT_META[f.placement].tone} size="sm">{PLACEMENT_META[f.placement].label}</Badge><span className="t-cap">{acceptRate(f).toFixed(1)}% accept</span></InlineStack>
                  </div>
                  <div style={{ textAlign: "right" }}><div className="t-num" style={{ fontSize: 15 }}>{fmtMoney(f.revenue)}</div><div className="t-cap" style={{ fontSize: 11 }}>attributed</div></div>
                </div>
              ))}
            </BlockStack>
          </Card>

          <BlockStack gap={16}>
            <Card padding={18}>
              <div className="t-h2" style={{ marginBottom: 4 }}>Set-up checklist</div>
              <div className="t-cap" style={{ marginBottom: 14 }}>3 of 4 complete</div>
              <BlockStack gap={11}>
                {[["Create your first funnel", true], ["Enable post-purchase extension", true], ["Add cart widget in theme editor", true], ["Upgrade for AI recommendations", false]].map(([l, done]) => (
                  <InlineStack key={l} gap={10}>
                    <span style={{ width: 20, height: 20, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--success)" : "var(--bg-inset)", border: done ? "none" : "1.5px solid var(--border-strong)" }}>
                      {done && <Icon name="check" size={13} color="#fff" strokeWidth={2.4} />}
                    </span>
                    <span style={{ fontSize: 13, color: done ? "var(--text-sub)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{l}</span>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>
            <Card padding={18} style={{ background: "var(--amoni-softer)", borderColor: "color-mix(in oklch, var(--amoni) 28%, transparent)" }}>
              <InlineStack gap={9} style={{ marginBottom: 8 }}><Icon name="store" size={18} color="var(--amoni-strong)" /><div className="t-h2">Preview your widgets</div></InlineStack>
              <div className="t-sub" style={{ marginBottom: 12 }}>See exactly how offers appear to shoppers — post-purchase, cart, and product page.</div>
              <Button variant="primary" size="sm" icon="eye" onClick={() => onNav("storefront")}>Open storefront preview</Button>
            </Card>
          </BlockStack>
        </div>
      </BlockStack>
    </Page>
  );
}
Object.assign(window, { ScreenOverview });
