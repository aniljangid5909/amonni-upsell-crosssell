/* ============================================================
   Funnels list screen
   ============================================================ */
function FunnelRow({ f, onEdit, onToggle, onDuplicate, onDelete, last }) {
  const statusBadge = f.status === "active"
    ? <Badge tone="success" dot>Active</Badge>
    : f.status === "paused" ? <Badge tone="attention" dot>Paused</Badge>
    : <Badge tone="neutral" dot>Draft</Badge>;
  return (
    <div className="row-hover" style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 1fr 0.9fr 1fr 40px", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: last ? "none" : "1px solid var(--border)", cursor: "pointer" }} onClick={() => onEdit(f.id)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ position: "relative" }}>
          <Thumb product={f.offer} size={40} />
          {f.trigger[0] && <div style={{ position: "absolute", left: -8, bottom: -4, border: "2px solid var(--surface)", borderRadius: 7 }}><Thumb product={f.trigger[0]} size={22} radius={5} /></div>}
        </div>
        <div style={{ minWidth: 0, paddingLeft: 6 }}>
          <div className="t-strong" style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
          <InlineStack gap={6} style={{ marginTop: 3 }}>
            <span className="t-cap" style={{ fontSize: 11.5 }}>{OFFERTYPE_META[f.offerType].label}</span>
            {f.discount.type !== "none" && <Badge tone="amoni" size="sm">{f.discount.type === "percent" ? `${f.discount.value}% off` : `$${f.discount.value} off`}</Badge>}
            {f.ab && <Badge tone="info" size="sm" icon="beaker">A/B</Badge>}
          </InlineStack>
        </div>
      </div>
      <div><Badge tone={PLACEMENT_META[f.placement].tone} icon={PLACEMENT_META[f.placement].icon} size="sm">{PLACEMENT_META[f.placement].label}</Badge></div>
      <div>{statusBadge}</div>
      <div style={{ textAlign: "right" }}>
        {f.impressions ? <><span className="t-num" style={{ fontSize: 14 }}>{acceptRate(f).toFixed(1)}%</span><div className="t-cap" style={{ fontSize: 11 }}>{fmtNum(f.accepts)} accepts</div></> : <span className="t-cap">—</span>}
      </div>
      <div style={{ textAlign: "right" }}>
        {f.revenue ? <><span className="t-num" style={{ fontSize: 14 }}>{fmtMoney(f.revenue)}</span><div className="t-cap" style={{ fontSize: 11 }}>revenue</div></> : <span className="t-cap">—</span>}
      </div>
      <div onClick={(e) => e.stopPropagation()} style={{ justifySelf: "end" }}>
        <Popover align="right" width={184} trigger={<button className="focusable" style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid transparent", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--icon)" }}><Icon name="dots" size={18} /></button>}>
          <MenuItem icon="edit" onClick={() => onEdit(f.id)}>Edit funnel</MenuItem>
          <MenuItem icon={f.status === "active" ? "pause" : "play"} onClick={() => onToggle(f.id)}>{f.status === "active" ? "Pause" : "Activate"}</MenuItem>
          <MenuItem icon="copy" onClick={() => onDuplicate(f.id)}>Duplicate</MenuItem>
          <Divider style={{ margin: "4px 0" }} />
          <MenuItem icon="trash" destructive onClick={() => onDelete(f.id)}>Delete</MenuItem>
        </Popover>
      </div>
    </div>
  );
}

function ScreenFunnels({ funnels, setFunnels, onEdit, onCreate }) {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const counts = {
    all: funnels.length,
    active: funnels.filter((f) => f.status === "active").length,
    paused: funnels.filter((f) => f.status === "paused").length,
    draft: funnels.filter((f) => f.status === "draft").length,
  };
  const filtered = funnels.filter((f) => (tab === "all" || f.status === tab) && f.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id) => setFunnels((fs) => fs.map((f) => f.id === id ? { ...f, status: f.status === "active" ? "paused" : "active" } : f));
  const dup = (id) => setFunnels((fs) => { const f = fs.find((x) => x.id === id); return [...fs, { ...f, id: "f" + Date.now(), name: f.name + " (copy)", status: "draft", impressions: 0, accepts: 0, revenue: 0 }]; });
  const del = (id) => setFunnels((fs) => fs.filter((f) => f.id !== id));

  return (
    <Page title="Funnels" width={1080}
      subtitle="Upsell, cross-sell and bundle offers across your store."
      primaryAction={<Button variant="primary" icon="plus" onClick={onCreate}>Create funnel</Button>}
      secondaryActions={<Button icon="external" variant="tertiary">Help</Button>}
    >
      <BlockStack gap={14}>
        <Card padding={0} flush>
          <div style={{ padding: "4px 8px 0" }}>
            <Tabs value={tab} onChange={setTab} tabs={[
              { id: "all", label: "All", badge: counts.all },
              { id: "active", label: "Active", badge: counts.active },
              { id: "paused", label: "Paused", badge: counts.paused },
              { id: "draft", label: "Draft", badge: counts.draft },
            ]} />
          </div>
          {/* search + filter row */}
          <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ flex: 1, maxWidth: 320 }}><TextField prefix={<Icon name="search" size={15} color="var(--icon)" />} placeholder="Search funnels" value={q} onChange={setQ} /></div>
            <Button icon="filter" variant="secondary" size="md">Filters</Button>
            <div style={{ flex: 1 }} />
            <Button icon="arrowDown" variant="tertiary" size="md">Sort: Revenue</Button>
          </div>
          {/* header */}
          <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 1fr 0.9fr 1fr 40px", gap: 12, padding: "9px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-sub)" }}>
            {["Funnel", "Placement", "Status", "Accept rate", "Revenue", ""].map((h, i) => <span key={i} className="t-cap" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i >= 3 && i < 5 ? "right" : "left" }}>{h}</span>)}
          </div>
          {filtered.length ? filtered.map((f, i) => (
            <FunnelRow key={f.id} f={f} last={i === filtered.length - 1} onEdit={onEdit} onToggle={toggle} onDuplicate={dup} onDelete={del} />
          )) : (
            <EmptyState icon="funnel" title="No funnels here yet" action={<Button variant="primary" icon="plus" onClick={onCreate}>Create funnel</Button>}>
              {tab === "all" ? "Create your first upsell funnel to start lifting AOV." : `You have no ${tab} funnels.`}
            </EmptyState>
          )}
        </Card>
        <div className="t-cap" style={{ textAlign: "center" }}>Showing {filtered.length} of {funnels.length} funnels · Growth plan allows 10 active funnels</div>
      </BlockStack>
    </Page>
  );
}
Object.assign(window, { ScreenFunnels });
