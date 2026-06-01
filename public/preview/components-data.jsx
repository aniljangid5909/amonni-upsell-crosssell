/* ============================================================
   Polaris data-display components — tabs, tables, banner, modal,
   tooltip, segmented control, progress, stat tiles, popover.
   ============================================================ */

function Tabs({ tabs, value, onChange, fitted }) {
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
      {tabs.map((t) => {
        const active = (t.id ?? t) === value;
        return (
          <button key={t.id ?? t} onClick={() => onChange(t.id ?? t)} className="focusable" style={{
            flex: fitted ? 1 : "none", position: "relative", background: "none", border: "none", cursor: "pointer",
            padding: "10px 12px", fontSize: 13.5, fontWeight: active ? 600 : 500,
            color: active ? "var(--text-strong)" : "var(--text-sub)", transition: "color .12s",
            borderTopLeftRadius: 8, borderTopRightRadius: 8,
          }}>
            <InlineStack gap={6} justify="center">{t.label ?? t}{t.badge != null && <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 6, background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)" }}>{t.badge}</span>}</InlineStack>
            {active && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2.5, background: "var(--amoni)", borderRadius: 3 }} />}
          </button>
        );
      })}
    </div>
  );
}

function SegmentedControl({ options, value, onChange, size = "md", full }) {
  return (
    <div style={{ display: "inline-flex", width: full ? "100%" : "auto", background: "var(--bg-inset)", borderRadius: "var(--r)", padding: 3, gap: 2, border: "1px solid var(--border)" }}>
      {options.map((o) => {
        const v = o.value ?? o, active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} className="focusable" style={{
            flex: full ? 1 : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: size === "sm" ? "4px 9px" : "6px 13px", fontSize: size === "sm" ? 12.5 : 13, fontWeight: active ? 600 : 500,
            border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
            background: active ? "var(--surface)" : "transparent", color: active ? "var(--text-strong)" : "var(--text-sub)",
            boxShadow: active ? "var(--shadow-card), 0 0 0 1px rgba(0,0,0,0.04)" : "none", transition: "all .12s",
          }}>
            {o.icon && <Icon name={o.icon} size={15} />}{o.label ?? o}
          </button>
        );
      })}
    </div>
  );
}

function Banner({ tone = "info", title, children, onDismiss, icon, action }) {
  const map = {
    info: { bg: "var(--badge-info-bg)", bd: "color-mix(in oklch, var(--badge-info-text) 22%, transparent)", ic: "var(--badge-info-text)", icon: "info" },
    success: { bg: "var(--badge-success-bg)", bd: "color-mix(in oklch, var(--badge-success-text) 22%, transparent)", ic: "var(--badge-success-text)", icon: "check" },
    warning: { bg: "var(--badge-attention-bg)", bd: "color-mix(in oklch, var(--badge-attention-text) 26%, transparent)", ic: "var(--badge-attention-text)", icon: "info" },
    critical: { bg: "var(--badge-critical-bg)", bd: "color-mix(in oklch, var(--badge-critical-text) 24%, transparent)", ic: "var(--badge-critical-text)", icon: "info" },
    amoni: { bg: "var(--amoni-soft)", bd: "color-mix(in oklch, var(--amoni) 35%, transparent)", ic: "var(--amoni-strong)", icon: "sparkle" },
  };
  const m = map[tone] || map.info;
  return (
    <div style={{ display: "flex", gap: 11, padding: "12px 14px", background: m.bg, border: `1px solid ${m.bd}`, borderRadius: "var(--r-lg)" }}>
      <div style={{ color: m.ic, marginTop: 1 }}><Icon name={icon || m.icon} size={18} strokeWidth={1.9} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="t-strong" style={{ fontSize: 13.5, color: m.ic, marginBottom: children ? 3 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 13, color: "var(--text)" }}>{children}</div>}
        {action && <div style={{ marginTop: 9 }}>{action}</div>}
      </div>
      {onDismiss && <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: m.ic, padding: 2, height: "fit-content" }}><Icon name="x" size={16} /></button>}
    </div>
  );
}

function Modal({ open, onClose, title, children, primaryAction, secondaryActions, width = 540 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 20px", backdropFilter: "blur(1px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="anim-pop scroll-thin" style={{
        background: "var(--surface)", borderRadius: "var(--r-xl)", width: "100%", maxWidth: width, maxHeight: "84vh",
        overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.32)", border: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
          <h2 className="t-h1" style={{ fontSize: 17 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--icon)", padding: 4 }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {(primaryAction || secondaryActions) && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border)", position: "sticky", bottom: 0, background: "var(--surface)" }}>
            {secondaryActions}{primaryAction}
          </div>
        )}
      </div>
    </div>
  );
}

function Tooltip({ content, children, side = "top" }) {
  const [show, setShow] = useState(false);
  const pos = side === "top"
    ? { bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)" }
    : { top: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)" };
  return (
    <span style={{ position: "relative", display: "inline-flex" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="anim-pop" style={{
          position: "absolute", ...pos, zIndex: 50, background: "#1a1a1a", color: "#fff",
          fontSize: 12, padding: "5px 9px", borderRadius: 7, whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)", fontWeight: 500,
        }}>{content}</span>
      )}
    </span>
  );
}

function ProgressBar({ value, tone = "amoni", height = 8, track }) {
  const color = tone === "amoni" ? "var(--amoni)" : tone === "success" ? "var(--success)" : tone === "info" ? "var(--badge-info-text)" : "var(--text-strong)";
  return (
    <div style={{ width: "100%", height, background: track || "var(--bg-inset)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s cubic-bezier(.3,1,.4,1)" }} />
    </div>
  );
}

/* KPI stat tile */
function Stat({ label, value, delta, deltaLabel, icon, accent, spark }) {
  const up = delta != null && delta >= 0;
  return (
    <Card padding={16} style={{ flex: 1, minWidth: 0 }}>
      <BlockStack gap={10}>
        <InlineStack justify="space-between">
          <span className="t-sub" style={{ fontSize: 12.5, fontWeight: 550 }}>{label}</span>
          {icon && <div style={{ width: 28, height: 28, borderRadius: 8, background: accent ? "var(--amoni-soft)" : "var(--bg-inset)", display: "flex", alignItems: "center", justifyContent: "center", color: accent ? "var(--amoni-strong)" : "var(--icon)" }}><Icon name={icon} size={16} /></div>}
        </InlineStack>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <span className="t-num" style={{ fontSize: 26, lineHeight: 1 }}>{value}</span>
          {spark}
        </div>
        {delta != null && (
          <InlineStack gap={5}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 650, color: up ? "var(--success)" : "var(--critical)" }}>
              <Icon name={up ? "arrowUp" : "arrowDown"} size={13} strokeWidth={2.2} />{Math.abs(delta)}%
            </span>
            <span className="t-cap">{deltaLabel || "vs. prev. period"}</span>
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}

/* Lightweight popover/menu */
function Popover({ trigger, children, align = "right", width = 200 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div className="anim-pop" onClick={() => setOpen(false)} style={{
          position: "absolute", top: "calc(100% + 6px)", [align]: 0, zIndex: 40, width,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-pop)", padding: 6,
        }}>{children}</div>
      )}
    </div>
  );
}
function MenuItem({ icon, children, onClick, destructive }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", border: "none",
      background: h ? "var(--nav-item-hover)" : "transparent", borderRadius: 7, cursor: "pointer",
      fontSize: 13.5, color: destructive ? "var(--critical)" : "var(--text)", textAlign: "left", fontFamily: "inherit",
    }}>{icon && <Icon name={icon} size={16} />}{children}</button>
  );
}

/* Empty state */
function EmptyState({ icon, title, children, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: 420, margin: "0 auto" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--amoni-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--amoni-strong)" }}>
        <Icon name={icon || "sparkle"} size={26} />
      </div>
      <h3 className="t-h1" style={{ fontSize: 16, marginBottom: 6 }}>{title}</h3>
      <p className="t-sub" style={{ margin: "0 auto 18px", maxWidth: 320 }}>{children}</p>
      {action}
    </div>
  );
}

Object.assign(window, {
  Tabs, SegmentedControl, Banner, Modal, Tooltip, ProgressBar, Stat, Popover, MenuItem, EmptyState,
});
