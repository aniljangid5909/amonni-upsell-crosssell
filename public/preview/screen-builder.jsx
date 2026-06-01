/* ============================================================
   Funnel builder — single-page vs wizard layout (tweakable),
   offer-type UX variants. Live widget preview.
   ============================================================ */
function MiniPreview({ draft }) {
  const offer = productById(draft.offer) || PRODUCTS[2];
  const trigger = productById(draft.trigger[0]) || PRODUCTS[0];
  const disc = draft.discount;
  const discounted = disc.type === "percent" ? offer.price * (1 - disc.value / 100) : disc.type === "fixed" ? offer.price - disc.value : offer.price;
  const pm = PLACEMENT_META[draft.placement];
  return (
    <div style={{ position: "sticky", top: 16 }}>
      <InlineStack justify="space-between" style={{ marginBottom: 10 }}>
        <span className="t-h2">Live preview</span>
        <Badge tone={pm.tone} size="sm" icon={pm.icon}>{pm.label}</Badge>
      </InlineStack>
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-sub)", padding: 16 }}>
        {/* faux storefront context */}
        <div style={{ background: "var(--surface)", borderRadius: 12, padding: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
          {draft.placement === "post-purchase" && <div className="t-cap" style={{ marginBottom: 10, fontSize: 11 }}>✓ Order confirmed — one more thing…</div>}
          <div style={{ display: "flex", gap: 12 }}>
            <Thumb product={offer} size={64} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <InlineStack gap={6}>
                <span className="t-strong" style={{ fontSize: 13.5 }}>{offer.name}</span>
                {disc.type !== "none" && <Badge tone="critical" size="sm">{disc.type === "percent" ? `${disc.value}% off` : `Save $${disc.value}`}</Badge>}
              </InlineStack>
              <div className="t-cap" style={{ marginTop: 2 }}>{offer.variant}</div>
              <InlineStack gap={7} style={{ marginTop: 6 }}>
                <span className="t-num" style={{ fontSize: 16 }}>{fmtMoney(discounted, discounted % 1 ? 2 : 0)}</span>
                {disc.type !== "none" && <span className="t-cap" style={{ textDecoration: "line-through" }}>{fmtMoney(offer.price)}</span>}
              </InlineStack>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "var(--amoni)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "default", fontFamily: "inherit" }}>{draft.offerType === "upsell" ? "Upgrade my order" : "Add to order"}</button>
            <button style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-sub)", fontWeight: 600, fontSize: 13, cursor: "default", fontFamily: "inherit" }}>No thanks</button>
          </div>
        </div>
        <div className="t-cap" style={{ textAlign: "center", marginTop: 10, fontSize: 10.5 }}>Triggered when <strong>{trigger.name}</strong> is in the order</div>
      </div>
    </div>
  );
}

/* ---- Section building blocks (shared by both layouts) ---- */
function SecTrigger({ draft, set }) {
  return (
    <BlockStack gap={14}>
      <div>
        <FieldLabel>Trigger products</FieldLabel>
        <div className="t-cap" style={{ marginTop: -2, marginBottom: 8 }}>This funnel fires when a shopper has any of these in their cart or order.</div>
        <BlockStack gap={8}>
          {draft.trigger.map((pid) => { const p = productById(pid); return (
            <div key={pid} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
              <Thumb product={p} size={34} />
              <div style={{ flex: 1 }}><div className="t-strong" style={{ fontSize: 13 }}>{p.name}</div><div className="t-cap">{p.variant} · {fmtMoney(p.price)}</div></div>
              <button onClick={() => set({ trigger: draft.trigger.filter((t) => t !== pid) })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--icon)" }}><Icon name="x" size={16} /></button>
            </div>
          ); })}
        </BlockStack>
        <Button variant="secondary" icon="plus" size="sm" style={{ marginTop: 8 }} onClick={() => { const next = PRODUCTS.find((p) => !draft.trigger.includes(p.id)); if (next) set({ trigger: [...draft.trigger, next.id] }); }}>Add product</Button>
      </div>
      <Divider />
      <Select label="Or trigger by collection" value="none" options={[{ value: "none", label: "Specific products (above)" }, "Serums", "Cleansers & toners", "Sun care", "Subscriptions"]} onChange={() => {}} help="Collections keep funnels in sync as you add products." />
    </BlockStack>
  );
}

function SecOffer({ draft, set, offerUX }) {
  const types = Object.entries(OFFERTYPE_META);
  return (
    <BlockStack gap={16}>
      <div>
        <FieldLabel>Offer type</FieldLabel>
        {offerUX === "segmented" ? (
          <BlockStack gap={8}>
            <SegmentedControl full value={draft.offerType} onChange={(v) => set({ offerType: v })}
              options={types.map(([id, m]) => ({ value: id, label: m.label }))} />
            <div className="t-cap" style={{ paddingLeft: 2 }}>{OFFERTYPE_META[draft.offerType].desc}.</div>
          </BlockStack>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {types.map(([id, m]) => (
              <RadioCard key={id} checked={draft.offerType === id} onChange={() => set({ offerType: id })}
                title={m.label} desc={m.desc} icon={id === "upsell" ? "arrowUp" : id === "bundle" ? "tag" : "plus"} />
            ))}
          </div>
        )}
      </div>
      <div>
        <FieldLabel>Offer product</FieldLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
          <Thumb product={draft.offer} size={42} />
          <div style={{ flex: 1 }}><div className="t-strong" style={{ fontSize: 13.5 }}>{productById(draft.offer)?.name}</div><div className="t-cap">{productById(draft.offer)?.variant} · {fmtMoney(productById(draft.offer)?.price)}</div></div>
          <Popover align="right" width={250} trigger={<Button size="sm" variant="secondary" iconRight="chevDown">Change</Button>}>
            <div className="scroll-thin" style={{ maxHeight: 260, overflow: "auto" }}>
              {PRODUCTS.map((p) => <MenuItem key={p.id} onClick={() => set({ offer: p.id })}><Thumb product={p} size={26} radius={6} /><span style={{ marginLeft: 2 }}>{p.name}</span></MenuItem>)}
            </div>
          </Popover>
        </div>
        <div style={{ marginTop: 8 }}><Select label="Variant" value={draft.offer} options={[{ value: draft.offer, label: productById(draft.offer)?.variant + " — default" }]} onChange={() => {}} /></div>
      </div>
      <Divider />
      <div>
        <FieldLabel>Discount</FieldLabel>
        <InlineStack gap={8} align="flex-start">
          <div style={{ width: 190 }}><Select value={draft.discount.type} onChange={(v) => set({ discount: { ...draft.discount, type: v, value: v === "none" ? 0 : draft.discount.value || 10 } })} options={[{ value: "percent", label: "Percentage off" }, { value: "fixed", label: "Fixed amount off" }, { value: "none", label: "No discount" }]} /></div>
          {draft.discount.type !== "none" && (
            <div style={{ width: 120 }}><TextField value={String(draft.discount.value)} onChange={(v) => set({ discount: { ...draft.discount, value: Number(v.replace(/\D/g, "")) || 0 } })} prefix={draft.discount.type === "fixed" ? "$" : null} suffix={draft.discount.type === "percent" ? "%" : null} /></div>
          )}
        </InlineStack>
      </div>
    </BlockStack>
  );
}

function SecConditions({ draft, set }) {
  return (
    <BlockStack gap={14}>
      <Checkbox checked={draft.conditions.skipSubscribed} onChange={(v) => set({ conditions: { ...draft.conditions, skipSubscribed: v } })}
        label="Skip subscribers of the offered product"
        help="Amoni won't show this offer to customers who already subscribe to it — core to subscription-first selling." />
      <Divider />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TextField label="Minimum cart value" optional prefix="$" value={String(draft.conditions.minCart)} onChange={(v) => set({ conditions: { ...draft.conditions, minCart: Number(v.replace(/\D/g, "")) || 0 } })} />
        <Select label="Customer tag" optional value={draft.conditions.customerTag || "any"} onChange={(v) => set({ conditions: { ...draft.conditions, customerTag: v === "any" ? "" : v } })} options={[{ value: "any", label: "Any customer" }, "VIP", "Subscriber", "First-time"]} />
      </div>
      <Divider />
      <Select label="Priority order" value={String(draft.priority || 1)} onChange={() => {}} help="If multiple funnels match the same shopper, the lowest priority number fires first." options={[{ value: "1", label: "1 — Highest" }, { value: "2", label: "2" }, { value: "3", label: "3" }]} />
    </BlockStack>
  );
}

function SecPlacement({ draft, set, plan }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {Object.entries(PLACEMENT_META).map(([id, m]) => {
        const locked = id === "checkout" && plan !== "Pro";
        return (
          <RadioCard key={id} checked={draft.placement === id} onChange={() => !locked && set({ placement: id })}
            icon={m.icon} title={m.label}
            desc={id === "post-purchase" ? "Highest-converting, after checkout" : id === "cart" ? "In the cart drawer or page" : id === "product" ? "On the product detail page" : "Order summary (Shopify Plus)"}
            right={locked ? <Badge tone="amoni" size="sm">Pro</Badge> : (id === "post-purchase" ? <Badge tone="success" size="sm">Best</Badge> : null)} />
        );
      })}
    </div>
  );
}

const BUILDER_SECTIONS = [
  { id: "trigger", title: "Trigger", desc: "What activates this funnel", icon: "target", Comp: SecTrigger },
  { id: "placement", title: "Placement", desc: "Where the offer appears", icon: "store", Comp: SecPlacement },
  { id: "offer", title: "Offer & discount", desc: "What you're offering", icon: "tag", Comp: SecOffer },
  { id: "conditions", title: "Display conditions", desc: "Who sees it and when", icon: "filter", Comp: SecConditions },
];

function ScreenBuilder({ initial, onBack, onSave, layout, offerUX, plan }) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const isNew = !initial.name;
  const [name, setName] = useState(initial.name || "");

  const renderSection = (sec) => <sec.Comp draft={draft} set={set} offerUX={offerUX} plan={plan} />;

  const headerActions = (
    <>
      <Button variant="secondary" onClick={onBack}>Discard</Button>
      <Button variant="primary" icon="check" onClick={() => onSave({ ...draft, name: name || "Untitled funnel" })}>{isNew ? "Create funnel" : "Save"}</Button>
    </>
  );

  return (
    <Page width={1140} fullWidth={false}
      backAction={{ label: "Funnels", onClick: onBack }}
      title={isNew ? "Create funnel" : draft.name}
      titleMeta={!isNew && (draft.status === "active" ? <Badge tone="success" dot>Active</Badge> : <Badge tone="neutral" dot>Draft</Badge>)}
      primaryAction={headerActions}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        <BlockStack gap={16}>
          {/* name */}
          <Card padding={16}><TextField label="Funnel name" value={name} onChange={setName} placeholder="e.g. Serum → SPF cross-sell" /></Card>

          {layout === "wizard" ? (
            <Card padding={0} flush>
              {/* step rail */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "4px 6px", gap: 2, overflow: "auto" }}>
                {BUILDER_SECTIONS.map((s, i) => (
                  <button key={s.id} onClick={() => setStep(i)} style={{ flex: 1, minWidth: 120, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "none", background: step === i ? "var(--amoni-softer)" : "transparent", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, background: i < step ? "var(--success)" : step === i ? "var(--amoni)" : "var(--bg-inset)", color: i <= step ? "#fff" : "var(--text-sub)" }}>{i < step ? <Icon name="check" size={12} color="#fff" strokeWidth={2.6} /> : i + 1}</span>
                    <span style={{ textAlign: "left", fontSize: 12.5, fontWeight: step === i ? 650 : 500, color: step === i ? "var(--text-strong)" : "var(--text-sub)" }}>{s.title}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding: 20 }}>
                <div className="anim-fade" key={step}>
                  <div className="t-h1" style={{ fontSize: 16, marginBottom: 2 }}>{BUILDER_SECTIONS[step].title}</div>
                  <div className="t-sub" style={{ marginBottom: 18 }}>{BUILDER_SECTIONS[step].desc}</div>
                  {renderSection(BUILDER_SECTIONS[step])}
                </div>
                <Divider style={{ margin: "20px 0 16px" }} />
                <InlineStack justify="space-between">
                  <Button variant="tertiary" icon="chevLeft" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
                  {step < BUILDER_SECTIONS.length - 1
                    ? <Button variant="primary" iconRight="chevRight" onClick={() => setStep((s) => s + 1)}>Continue</Button>
                    : <Button variant="primary" icon="check" onClick={() => onSave({ ...draft, name: name || "Untitled funnel" })}>{isNew ? "Create funnel" : "Save funnel"}</Button>}
                </InlineStack>
              </div>
            </Card>
          ) : (
            BUILDER_SECTIONS.map((s) => (
              <Card key={s.id} padding={18}>
                <InlineStack gap={10} style={{ marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--amoni-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--amoni-strong)" }}><Icon name={s.icon} size={17} /></div>
                  <div><div className="t-h2">{s.title}</div><div className="t-cap">{s.desc}</div></div>
                </InlineStack>
                {renderSection(s)}
              </Card>
            ))
          )}
        </BlockStack>

        <MiniPreview draft={draft} />
      </div>
    </Page>
  );
}
Object.assign(window, { ScreenBuilder });
