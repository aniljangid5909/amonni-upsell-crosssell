/* ============================================================
   AI Recommendations (Pro) — co-purchase analysis, create
   funnel from a suggested pairing.
   ============================================================ */
function ScreenAI({ onCreateFromRec, onNav }) {
  const [analyzing, setAnalyzing] = useState(false);
  const lastRun = "May 28, 2026";

  return (
    <Page title="AI Recommendations" width={1000}
      titleMeta={<Badge tone="amoni">Pro</Badge>}
      subtitle="Amoni analyzes 90 days of order history to surface your highest-intent pairings."
      secondaryActions={<Button icon="refresh" variant="secondary" onClick={() => { setAnalyzing(true); setTimeout(() => setAnalyzing(false), 2200); }} disabled={analyzing}>{analyzing ? "Analyzing…" : "Re-run analysis"}</Button>}>
      <BlockStack gap={16}>
        <Card padding={18} style={{ background: "linear-gradient(120deg, var(--amoni-softer), var(--surface))", borderColor: "color-mix(in oklch, var(--amoni) 24%, transparent)" }}>
          <InlineStack justify="space-between" wrap gap={16}>
            <InlineStack gap={14}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--amoni)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="sparkle" size={24} /></div>
              <div>
                <div className="t-h2" style={{ fontSize: 15 }}>Co-purchase intelligence</div>
                <div className="t-sub" style={{ marginTop: 2 }}>Last analyzed {lastRun} · 14,208 orders scanned · re-runs weekly</div>
              </div>
            </InlineStack>
            <InlineStack gap={22}>
              {[["Pairings found", AI_RECS.length], ["Avg. lift", "2.7×"], ["Est. monthly upside", "$8.4k"]].map(([l, v]) => (
                <div key={l} style={{ textAlign: "center" }}><div className="t-num" style={{ fontSize: 22 }}>{v}</div><div className="t-cap" style={{ fontSize: 11 }}>{l}</div></div>
              ))}
            </InlineStack>
          </InlineStack>
          {analyzing && <div style={{ marginTop: 16 }}><div className="t-cap" style={{ marginBottom: 6 }}>Scanning order history…</div><ProgressBar value={66} /></div>}
        </Card>

        <div>
          <InlineStack justify="space-between" style={{ marginBottom: 10 }}>
            <div className="t-h2">Suggested pairings</div>
            <span className="t-cap">Ranked by purchase intent</span>
          </InlineStack>
          <BlockStack gap={10}>
            {AI_RECS.map((rec, i) => {
              const a = productById(rec.a), b = productById(rec.b);
              return (
                <Card key={i} padding={14} hover>
                  <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
                    {/* pairing */}
                    <InlineStack gap={10}>
                      <Thumb product={a} size={40} />
                      <Icon name="plus" size={14} color="var(--text-sub)" />
                      <Thumb product={b} size={40} />
                      <div style={{ minWidth: 0, marginLeft: 4 }}>
                        <div className="t-strong" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                        <div className="t-cap" style={{ fontSize: 11.5 }}>buy-with → {b.name}</div>
                      </div>
                    </InlineStack>
                    <div><div className="t-cap" style={{ fontSize: 11 }}>Bought together</div><div className="t-num" style={{ fontSize: 16 }}>{fmtNum(rec.count)}×</div></div>
                    <div><div className="t-cap" style={{ fontSize: 11 }}>Lift</div><div className="t-num" style={{ fontSize: 16 }}>{rec.lift}×</div></div>
                    <div style={{ minWidth: 90 }}><div className="t-cap" style={{ fontSize: 11, marginBottom: 4 }}>Confidence</div><InlineStack gap={7}><div style={{ flex: 1 }}><ProgressBar value={rec.conf * 100} height={6} /></div><span className="t-cap" style={{ fontSize: 11 }}>{(rec.conf * 100).toFixed(0)}%</span></InlineStack></div>
                    <Button size="sm" variant="primary" icon="plus" onClick={() => onCreateFromRec(rec)}>Create funnel</Button>
                  </div>
                </Card>
              );
            })}
          </BlockStack>
        </div>

        <Card padding={16}>
          <InlineStack gap={10}><Icon name="info" size={17} color="var(--icon)" /><div className="t-sub" style={{ fontSize: 12.5 }}>Recommendations respect subscription status — Amoni won't suggest pairing a product a customer already subscribes to. Analysis runs automatically every week via a background job.</div></InlineStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
Object.assign(window, { ScreenAI });
