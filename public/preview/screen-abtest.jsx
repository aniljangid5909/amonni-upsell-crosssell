/* ============================================================
   A/B Testing (Pro) — variant comparison, declare winner.
   ============================================================ */
function VariantCard({ v, label, winner, leading, onDeclare }) {
  return (
    <Card padding={18} selected={leading} style={{ flex: 1, position: "relative" }}>
      <InlineStack justify="space-between" style={{ marginBottom: 14 }}>
        <InlineStack gap={8}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: leading ? "var(--amoni)" : "var(--bg-inset)", color: leading ? "#fff" : "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, fontFamily: "var(--font-brand)" }}>{label}</span>
          <span className="t-h2">{v.label}</span>
        </InlineStack>
        {leading && <Badge tone="success" icon="star">Leading</Badge>}
      </InlineStack>
      <InlineStack gap={12} style={{ marginBottom: 16 }}>
        <Thumb product={v.offer} size={52} />
        <div><div className="t-strong" style={{ fontSize: 13.5 }}>{productById(v.offer)?.name}</div><Badge tone="amoni" size="sm">{v.discount}</Badge></div>
      </InlineStack>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {[["Accept rate", v.rate + "%"], ["Revenue", fmtMoney(v.revenue)], ["Impressions", fmtNum(v.impressions)], ["Accepts", fmtNum(v.accepts)]].map(([l, val]) => (
          <div key={l} style={{ padding: 11, borderRadius: 9, background: "var(--surface-sub)" }}><div className="t-cap" style={{ fontSize: 11 }}>{l}</div><div className="t-num" style={{ fontSize: 18, marginTop: 2 }}>{val}</div></div>
        ))}
      </div>
      <Button full variant={leading ? "primary" : "secondary"} icon={leading ? "check" : null} onClick={onDeclare}>{leading ? "Declare winner" : "Keep this variant"}</Button>
    </Card>
  );
}

function ScreenABTest({ funnels, onNav }) {
  const t = AB_TEST;
  const f = funnels.find((x) => x.id === t.funnel) || funnels[1];
  const leadingB = t.variantB.rate > t.variantA.rate;
  const [declared, setDeclared] = useState(false);

  return (
    <Page title="A/B Tests" width={1000}
      titleMeta={<Badge tone="amoni">Pro</Badge>}
      subtitle="Test two offer variants head-to-head; Amoni splits traffic and tracks the winner."
      primaryAction={<Button variant="primary" icon="plus">New test</Button>}>
      <BlockStack gap={16}>
        {declared && <Banner tone="success" title="Winner declared" onDismiss={() => setDeclared(false)}>Variant B is now live for 100% of traffic. The losing variant has been paused.</Banner>}

        <Card padding={18}>
          <InlineStack justify="space-between" wrap gap={12}>
            <InlineStack gap={12}>
              <Thumb product={f.offer} size={44} />
              <div><div className="t-h2">{f.name}</div><InlineStack gap={6} style={{ marginTop: 3 }}><Badge tone={PLACEMENT_META[f.placement].tone} size="sm">{PLACEMENT_META[f.placement].label}</Badge><span className="t-cap">Running {t.daysRunning} days · 50/50 split</span></InlineStack></div>
            </InlineStack>
            <InlineStack gap={20}>
              <div style={{ textAlign: "right" }}><div className="t-cap" style={{ fontSize: 11 }}>Statistical confidence</div><div className="t-num" style={{ fontSize: 20, color: t.confidence > 0.9 ? "var(--success)" : "var(--text-strong)" }}>{(t.confidence * 100).toFixed(0)}%</div></div>
              <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
              <div style={{ textAlign: "right" }}><div className="t-cap" style={{ fontSize: 11 }}>Status</div><div style={{ marginTop: 4 }}><Badge tone="success" dot>Running</Badge></div></div>
            </InlineStack>
          </InlineStack>
          {t.confidence > 0.9 && (
            <div style={{ marginTop: 14 }}>
              <Banner tone="amoni" icon="bolt" title="Result is statistically significant">
                Variant B (<strong>Buy 2 get 1 free</strong>) is winning with {(t.confidence * 100).toFixed(0)}% confidence. We recommend declaring it the winner.
              </Banner>
            </div>
          )}
        </Card>

        <InlineStack gap={16} align="stretch" style={{ alignItems: "stretch" }}>
          <VariantCard v={t.variantA} label="A" leading={!leadingB} onDeclare={() => setDeclared(true)} />
          <div style={{ display: "flex", alignItems: "center" }}><span style={{ width: 36, height: 36, borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "var(--text-sub)" }}>vs</span></div>
          <VariantCard v={t.variantB} label="B" leading={leadingB} onDeclare={() => setDeclared(true)} />
        </InlineStack>

        <Card padding={18}>
          <div className="t-h2" style={{ marginBottom: 14 }}>Accept rate over time</div>
          <div style={{ position: "relative" }}>
            <LineChart data={[8.1, 9.4, 10.2, 9.8, 11.1, 10.9, 11.4, 11.2, 11.6, 11.5, 11.8, 11.9]} compare={[9.2, 9.5, 10.1, 10.4, 10.6, 10.3, 10.8, 10.7, 10.9, 10.8, 11.0, 10.9]} height={180} money={false} />
          </div>
          <InlineStack gap={18} justify="center" style={{ marginTop: 8 }}>
            <InlineStack gap={6}><span style={{ width: 18, height: 3, background: "var(--amoni)", borderRadius: 2 }} /><span className="t-cap">Variant B</span></InlineStack>
            <InlineStack gap={6}><span style={{ width: 18, height: 0, borderTop: "2px dashed var(--border-strong)" }} /><span className="t-cap">Variant A</span></InlineStack>
          </InlineStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
Object.assign(window, { ScreenABTest });
