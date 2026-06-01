/* ============================================================
   App shell — embedded Shopify admin chrome + Amoni Upsell nav.
   ============================================================ */

function AmoniMark({ size = 22, light }) {
  // Simple geometric mark: clay rounded square with an "upward" notch
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.28, background: "var(--amoni)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.12)" }}>
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15 L10 5 L16 15" /><path d="M7 15 L10 10 L13 15" opacity="0.55" />
        </svg>
      </div>
    </div>
  );
}

function TopBar({ dark, onToggleTheme, onNav }) {
  return (
    <div style={{ height: 48, background: "var(--topbar-bg)", display: "flex", alignItems: "center", padding: "0 12px", gap: 12, flexShrink: 0, position: "sticky", top: 0, zIndex: 30 }}>
      {/* Shopify-style store switcher (generic) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#f0c9a8,#e7d4f0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#5a4a3a", fontFamily: "var(--font-brand)" }}>L</div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 600 }}>Lumen Skin</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10.5 }}>Shopify Plus</span>
        </div>
      </div>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, background: "var(--topbar-search)", borderRadius: 8, padding: "6px 11px", color: "rgba(255,255,255,0.55)" }}>
        <Icon name="search" size={15} />
        <span style={{ fontSize: 12.5 }}>Search</span>
      </div>
      <InlineStack gap={4}>
        <Tooltip content={dark ? "Light mode" : "Dark mode"} side="bottom">
          <button onClick={onToggleTheme} className="focusable" style={topIconBtn}>
            <Icon name={dark ? "sparkle" : "settings"} size={17} color="rgba(255,255,255,0.8)" />
          </button>
        </Tooltip>
        <button className="focusable" style={topIconBtn}><Icon name="bell" size={17} color="rgba(255,255,255,0.8)" /></button>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: "#5b6b7a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>RA</div>
      </InlineStack>
    </div>
  );
}
const topIconBtn = { width: 32, height: 32, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "funnels", label: "Funnels", icon: "funnel" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "abtests", label: "A/B Tests", icon: "beaker", badge: "Pro" },
  { id: "ai", label: "AI Recommendations", icon: "sparkle", badge: "Pro" },
  { id: "storefront", label: "Storefront preview", icon: "store" },
];
const NAV_FOOTER = [
  { id: "billing", label: "Plan & billing", icon: "tag" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function NavLink({ item, active, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="focusable" style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 10px", borderRadius: "var(--r)",
      border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", position: "relative",
      background: active ? "var(--nav-item-active)" : h ? "var(--nav-item-hover)" : "transparent",
      color: active ? "var(--text-strong)" : "var(--text)", fontSize: 13.5, fontWeight: active ? 600 : 500,
      boxShadow: active ? "var(--shadow-card), 0 0 0 1px rgba(0,0,0,0.04)" : "none", transition: "background .1s",
    }}>
      {active && <span style={{ position: "absolute", left: -8, top: 8, bottom: 8, width: 3, borderRadius: 3, background: "var(--amoni)" }} />}
      <Icon name={item.icon} size={18} color={active ? "var(--amoni-strong)" : "var(--icon)"} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "var(--amoni-soft)", color: "var(--amoni-strong)" }}>{item.badge}</span>}
    </button>
  );
}

function SideNav({ route, onNav, plan }) {
  return (
    <nav style={{ width: 232, background: "var(--nav-bg)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "12px 8px", flexShrink: 0, height: "100%", overflow: "auto" }} className="scroll-thin">
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 14px" }}>
        <AmoniMark size={26} />
        <div style={{ lineHeight: 1.15 }}>
          <div className="t-display" style={{ fontSize: 15, whiteSpace: "nowrap" }}>Amoni Upsell</div>
          <div className="t-cap" style={{ fontSize: 10.5, marginTop: 1 }}>by Amoni</div>
        </div>
      </div>
      <BlockStack gap={2}>
        {NAV_ITEMS.map((it) => <NavLink key={it.id} item={it} active={route === it.id} onClick={() => onNav(it.id)} />)}
      </BlockStack>
      <div style={{ flex: 1 }} />
      <Divider style={{ margin: "10px 4px" }} />
      <BlockStack gap={2}>
        {NAV_FOOTER.map((it) => <NavLink key={it.id} item={it} active={route === it.id} onClick={() => onNav(it.id)} />)}
      </BlockStack>
      {/* Plan card */}
      <div style={{ margin: "10px 4px 2px", padding: 11, borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--border)" }}>
        <InlineStack justify="space-between" style={{ marginBottom: 6 }}>
          <span className="t-cap" style={{ fontSize: 11 }}>Current plan</span>
          <Badge tone="amoni" size="sm">{plan}</Badge>
        </InlineStack>
        <div className="t-cap" style={{ fontSize: 11, marginBottom: 8 }}>312 / 500 orders this month</div>
        <ProgressBar value={62.4} height={5} />
        <button onClick={() => onNav("billing")} style={{ marginTop: 9, width: "100%", padding: "6px", borderRadius: 7, border: "1px solid var(--border-strong)", background: "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "inherit" }}>Upgrade to Pro</button>
      </div>
    </nav>
  );
}

function AppFrame({ route, onNav, plan, dark, onToggleTheme, children }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      <TopBar dark={dark} onToggleTheme={onToggleTheme} onNav={onNav} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <SideNav route={route} onNav={onNav} plan={plan} />
        <main className="scroll-thin" style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>{children}</main>
      </div>
    </div>
  );
}

Object.assign(window, { AppFrame, AmoniMark, NAV_ITEMS });
