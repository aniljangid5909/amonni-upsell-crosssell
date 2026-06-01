/* ============================================================
   Plan & billing — Shopify native billing tiers + settings.
   ============================================================ */
function PlanCard({ plan, current, onSelect, annual }) {
  const price = annual && plan.price ? (plan.price * 0.8).toFixed(2) : plan.price.toFixed(2);
  return (
    <Card padding={0} flush style={{ flex: 1, position: "relative", overflow: "hidden", borderColor: plan.popular ? "var(--amoni)" : "var(--border)", borderWidth: plan.popular ? 1.5 : 1 }}>
      {plan.popular && <div style={{ position: "absolute", top: 0, right: 0, background: "var(--amoni)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderBottomLeftRadius: 10 }}>MOST POPULAR</div>}
      <div style={{ padding: 20 }}>
        <InlineStack gap={8}><span className="t-display" style={{ fontSize: 18 }}>{plan.name}</span>{current && <Badge tone="success" size="sm">Current</Badge>}</InlineStack>
        <div className="t-sub" style={{ marginTop: 3, marginBottom: 14, fontSize: 12.5 }}>{plan.tagline}</div>
        <InlineStack gap={4} align="baseline" style={{ marginBottom: 4 }}>
          <span className="t-num" style={{ fontSize: 34 }}>{plan.price === 0 ? "Free" : "$" + price}</span>
          {plan.price > 0 && <span className="t-sub" style={{ fontSize: 13 }}>/ month</span>}
        </InlineStack>
        {plan.price > 0 && annual && <div className="t-cap" style={{ color: "var(--success)", marginBottom: 14 }}>Save 20% billed annually</div>}
        <div style={{ marginTop: 14 }}>
          {current
            ? <Button full variant="secondary" disabled>Current plan</Button>
            : <Button full variant={plan.popular ? "primary" : "secondary"} onClick={() => onSelect(plan)}>{plan.price === 0 ? "Downgrade" : "Choose " + plan.name}</Button>}
        </div>
      </div>
      <Divider />
      <div style={{ padding: 20 }}>
        <BlockStack gap={9}>
          {plan.features.map((f) => <InlineStack key={f} gap={9} align="flex-start"><Icon name="check" size={15} color="var(--success)" strokeWidth={2.4} style={{ marginTop: 1, flexShrink: 0 }} /><span style={{ fontSize: 12.5, color: "var(--text)" }}>{f}</span></InlineStack>)}
          {plan.missing.map((f) => <InlineStack key={f} gap={9} align="flex-start"><Icon name="x" size={15} color="var(--text-disabled)" style={{ marginTop: 1, flexShrink: 0 }} /><span style={{ fontSize: 12.5, color: "var(--text-disabled)" }}>{f}</span></InlineStack>)}
        </BlockStack>
      </div>
    </Card>
  );
}

function ScreenBilling({ plan, onSelectPlan }) {
  const [annual, setAnnual] = useState(false);
  const [confirm, setConfirm] = useState(null);
  return (
    <Page title="Plan & billing" width={1040}
      subtitle="Billed securely through Shopify. Change or cancel anytime.">
      <BlockStack gap={18}>
        <Card padding={16}>
          <InlineStack justify="space-between" wrap gap={12}>
            <InlineStack gap={12}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--amoni-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--amoni-strong)" }}><Icon name="tag" size={20} /></div>
              <div><div className="t-h2">You're on the {plan} plan</div><div className="t-cap" style={{ marginTop: 2 }}>312 of 500 monthly orders used · renews June 28, 2026</div></div>
            </InlineStack>
            <InlineStack gap={14}>
              <span className="t-sub" style={{ fontSize: 13 }}>Monthly</span>
              <Toggle checked={annual} onChange={setAnnual} />
              <span className="t-sub" style={{ fontSize: 13 }}>Annual <span style={{ color: "var(--success)", fontWeight: 600 }}>−20%</span></span>
            </InlineStack>
          </InlineStack>
        </Card>

        <InlineStack gap={14} align="stretch" style={{ alignItems: "stretch" }}>
          {BILLING_PLANS.map((p) => <PlanCard key={p.id} plan={{ ...p, current: p.name === plan }} current={p.name === plan} annual={annual} onSelect={setConfirm} />)}
        </InlineStack>

        <Card padding={16}>
          <InlineStack gap={10}><Icon name="lock" size={16} color="var(--icon)" /><span className="t-sub" style={{ fontSize: 12.5 }}>Charges appear on your Shopify invoice. <strong>Test billing is enabled</strong> in development — no real charges are made until go-live.</span></InlineStack>
        </Card>
      </BlockStack>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Switch to ${confirm?.name}?`}
        primaryAction={<Button variant="primary" onClick={() => { onSelectPlan(confirm.name); setConfirm(null); }}>Confirm & approve in Shopify</Button>}
        secondaryActions={<Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>}>
        {confirm && <BlockStack gap={12}>
          <div className="t-body">You'll be redirected to Shopify to approve a <strong>{fmtMoney(annual ? confirm.price * 0.8 * 12 : confirm.price, 2)}{annual ? "/year" : "/month"}</strong> recurring charge for the {confirm.name} plan.</div>
          <Banner tone="info">Your new limits and features take effect immediately after approval.</Banner>
        </BlockStack>}
      </Modal>
    </Page>
  );
}

function ScreenSettings({ dark, onToggleTheme }) {
  return (
    <Page title="Settings" width={760}
      subtitle="Configure how Amoni Upsell behaves across your store.">
      <BlockStack gap={16}>
        <Card padding={18}>
          <div className="t-h2" style={{ marginBottom: 14 }}>Widget appearance</div>
          <BlockStack gap={14}>
            <SettingRow title="Match my theme fonts" desc="Inherit typography from your storefront theme"><Toggle checked={true} onChange={() => {}} /></SettingRow>
            <Divider />
            <SettingRow title="Show 'Powered by Amoni'" desc="Removed automatically on Growth and Pro"><Toggle checked={false} onChange={() => {}} /></SettingRow>
            <Divider />
            <SettingRow title="Dark admin theme" desc="Use a dark interface for this dashboard"><Toggle checked={dark} onChange={onToggleTheme} /></SettingRow>
          </BlockStack>
        </Card>
        <Card padding={18}>
          <div className="t-h2" style={{ marginBottom: 14 }}>Selling behavior</div>
          <BlockStack gap={14}>
            <SettingRow title="Respect subscription status globally" desc="Never upsell a product the customer already subscribes to"><Toggle checked={true} onChange={() => {}} /></SettingRow>
            <Divider />
            <SettingRow title="Frequency cap" desc="Max offers shown to one shopper per session"><div style={{ width: 90 }}><Select value="2" options={["1", "2", "3", "Unlimited"]} onChange={() => {}} /></div></SettingRow>
          </BlockStack>
        </Card>
        <Card padding={18}>
          <div className="t-h2" style={{ marginBottom: 4 }}>Theme app extension</div>
          <div className="t-sub" style={{ marginBottom: 14 }}>Add Amoni widget blocks to your storefront in the theme editor.</div>
          <Button variant="secondary" icon="external">Open theme editor</Button>
        </Card>
      </BlockStack>
    </Page>
  );
}
function SettingRow({ title, desc, children }) {
  return (
    <InlineStack justify="space-between" gap={16}>
      <div><div className="t-strong" style={{ fontSize: 13.5 }}>{title}</div><div className="t-cap" style={{ marginTop: 2 }}>{desc}</div></div>
      {children}
    </InlineStack>
  );
}
Object.assign(window, { ScreenBilling, ScreenSettings });
