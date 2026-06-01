/* ============================================================
   Polaris core components — layout, buttons, badges, forms.
   Faithful to Shopify Polaris with Amoni accent.
   ============================================================ */
const { useState, useRef, useEffect, useMemo, createContext, useContext } = React;

/* ---------- Layout primitives ---------- */
function BlockStack({ gap = 0, children, style, align, inline }) {
  return <div style={{ display: "flex", flexDirection: "column", gap, alignItems: align, ...style }}>{children}</div>;
}
function InlineStack({ gap = 0, children, style, align = "center", justify, wrap }) {
  return <div style={{ display: "flex", alignItems: align, justifyContent: justify, gap, flexWrap: wrap ? "wrap" : "nowrap", ...style }}>{children}</div>;
}
function Divider({ style }) {
  return <div style={{ height: 1, background: "var(--border)", width: "100%", ...style }} />;
}
function Spacer({ size = 16 }) { return <div style={{ height: size }} />; }

function Card({ children, padding = 16, style, onClick, hover, selected, flush }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: selected ? "var(--surface-selected)" : "var(--surface)",
        border: `1px solid ${selected ? "var(--amoni)" : "var(--border)"}`,
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-card)",
        padding: flush ? 0 : padding,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color .15s, box-shadow .15s, transform .15s",
        ...(hover && h ? { borderColor: "var(--border-hover)", boxShadow: "var(--shadow-pop)" } : {}),
        ...style,
      }}>
      {children}
    </div>
  );
}

/* Page header — Polaris Page with title, subtitle, primary + secondary actions */
function Page({ title, titleMeta, subtitle, backAction, primaryAction, secondaryActions, children, fullWidth, width = 940 }) {
  return (
    <div style={{ maxWidth: fullWidth ? "100%" : width, margin: "0 auto", padding: "20px 24px 64px" }}>
      {(title || backAction) && (
        <div style={{ marginBottom: 20 }}>
          {backAction && (
            <button onClick={backAction.onClick} className="focusable" style={backBtnStyle}>
              <Icon name="chevLeft" size={16} /> {backAction.label || "Back"}
            </button>
          )}
          <InlineStack justify="space-between" align="flex-start" gap={16}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <InlineStack gap={10}>
                <h1 className="t-display" style={{ fontSize: 22, margin: 0, whiteSpace: "nowrap" }}>{title}</h1>
                {titleMeta}
              </InlineStack>
              {subtitle && <div className="t-sub" style={{ marginTop: 4 }}>{subtitle}</div>}
            </div>
            <InlineStack gap={8} style={{ flexShrink: 0 }}>
              {secondaryActions}
              {primaryAction}
            </InlineStack>
          </InlineStack>
        </div>
      )}
      {children}
    </div>
  );
}
const backBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none",
  color: "var(--text-sub)", fontSize: 13, cursor: "pointer", padding: "2px 0", marginBottom: 10,
};

/* ---------- Button ---------- */
function Button({ children, variant = "secondary", size = "md", icon, iconRight, onClick, disabled, tone, full, destructive, style }) {
  const [h, setH] = useState(false);
  const pad = size === "sm" ? "5px 10px" : size === "lg" ? "10px 18px" : "7px 14px";
  const fs = size === "sm" ? 12.5 : size === "lg" ? 14.5 : 13.5;
  let base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: icon && !children ? (size === "sm" ? 6 : 8) : pad,
    fontSize: fs, fontWeight: 600, borderRadius: "var(--r)", cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent", transition: "all .13s", whiteSpace: "nowrap",
    width: full ? "100%" : "auto", opacity: disabled ? 0.5 : 1, lineHeight: 1.2,
  };
  let v;
  if (variant === "primary") {
    v = { background: destructive ? "var(--critical)" : (h ? "var(--btn-primary-bg-hover)" : "var(--btn-primary-bg)"),
          color: destructive ? "#fff" : "var(--btn-primary-text)", boxShadow: "var(--shadow-btn)" };
  } else if (variant === "plain") {
    v = { background: "transparent", color: destructive ? "var(--critical)" : (tone === "amoni" ? "var(--amoni-strong)" : "var(--text)"),
          border: "1px solid transparent", textDecoration: h ? "underline" : "none", padding: pad.replace(/\d+px (\d+)px/, "4px $1px") };
  } else if (variant === "tertiary") {
    v = { background: h ? "var(--nav-item-hover)" : "transparent", color: "var(--text)", border: "1px solid transparent" };
  } else {
    v = { background: h ? "var(--surface-hover)" : "var(--btn-secondary-bg)", color: destructive ? "var(--critical)" : "var(--btn-secondary-text)",
          border: `1px solid ${destructive ? "color-mix(in oklch, var(--critical) 40%, var(--border))" : "var(--btn-secondary-border)"}`,
          boxShadow: "0 1px 0 rgba(0,0,0,0.04)" };
  }
  return (
    <button className="focusable" disabled={disabled} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ ...base, ...v, ...style }}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 15 : 16} />}
    </button>
  );
}

/* ---------- Badge ---------- */
function Badge({ children, tone = "neutral", icon, size = "md", dot }) {
  const map = {
    success: ["--badge-success-bg", "--badge-success-text"],
    attention: ["--badge-attention-bg", "--badge-attention-text"],
    info: ["--badge-info-bg", "--badge-info-text"],
    critical: ["--badge-critical-bg", "--badge-critical-text"],
    neutral: ["--badge-neutral-bg", "--badge-neutral-text"],
    amoni: null,
  };
  const isAmoni = tone === "amoni";
  const [bg, fg] = map[tone] || map.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: isAmoni ? "var(--amoni-soft)" : `var(${bg})`,
      color: isAmoni ? "var(--amoni-strong)" : `var(${fg})`,
      fontSize: size === "sm" ? 11 : 12, fontWeight: 600, padding: size === "sm" ? "1px 7px" : "2px 9px",
      borderRadius: 8, lineHeight: 1.5, whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: "currentColor", opacity: 0.9 }} />}
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}

/* ---------- Product thumbnail placeholder ---------- */
function Thumb({ product, size = 44, radius = 8, badge }) {
  const p = typeof product === "string" ? productById(product) : product;
  if (!p) return null;
  const initials = p.name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: `linear-gradient(135deg, ${p.tone}, color-mix(in srgb, ${p.tone} 60%, #fff))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden",
      }}>
        <span style={{ fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: size * 0.32, color: "rgba(40,30,20,0.62)" }}>{initials}</span>
      </div>
      {badge && <span style={{ position: "absolute", top: -6, right: -6 }}>{badge}</span>}
    </div>
  );
}

/* ---------- Form fields ---------- */
function FieldLabel({ children, optional, hint }) {
  if (!children) return null;
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 550, color: "var(--text)", marginBottom: 5 }}>
      {children}
      {optional && <span className="t-cap" style={{ fontWeight: 400 }}>(optional)</span>}
      {hint}
    </label>
  );
}
function TextField({ label, value, onChange, placeholder, prefix, suffix, type = "text", optional, help, full = true, width, multiline, align }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ width: full ? "100%" : width }}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <div style={{
        display: "flex", alignItems: "center", background: "var(--surface)",
        border: `1px solid ${f ? "var(--amoni)" : "var(--border-strong)"}`,
        boxShadow: f ? "0 0 0 2px color-mix(in oklch, var(--amoni) 25%, transparent)" : "inset 0 1px 1px rgba(0,0,0,0.03)",
        borderRadius: "var(--r)", padding: "0 10px", transition: "border-color .12s, box-shadow .12s",
      }}>
        {prefix && <span className="t-sub" style={{ marginRight: 4 }}>{prefix}</span>}
        {multiline ? (
          <textarea value={value} onChange={(e) => onChange && onChange(e.target.value)} placeholder={placeholder}
            rows={multiline === true ? 3 : multiline}
            style={{ ...inputReset, padding: "8px 0", resize: "vertical", textAlign: align }} onFocus={() => setF(true)} onBlur={() => setF(false)} />
        ) : (
          <input value={value} onChange={(e) => onChange && onChange(e.target.value)} placeholder={placeholder} type={type}
            style={{ ...inputReset, padding: "8px 0", textAlign: align }} onFocus={() => setF(true)} onBlur={() => setF(false)} />
        )}
        {suffix && <span className="t-sub" style={{ marginLeft: 4 }}>{suffix}</span>}
      </div>
      {help && <div className="t-cap" style={{ marginTop: 4 }}>{help}</div>}
    </div>
  );
}
const inputReset = {
  flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--text)",
  fontSize: 13.5, fontFamily: "inherit", width: "100%", minWidth: 0,
};

function Select({ label, value, onChange, options, optional, full = true, width, help }) {
  return (
    <div style={{ width: full ? "100%" : width }}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={(e) => onChange && onChange(e.target.value)}
          className="focusable" style={{
            width: "100%", appearance: "none", background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--border-strong)", borderRadius: "var(--r)", padding: "8px 32px 8px 10px",
            fontSize: 13.5, fontFamily: "inherit", cursor: "pointer", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.03)",
          }}>
          {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--icon)" }}>
          <Icon name="chevDown" size={15} />
        </div>
      </div>
      {help && <div className="t-cap" style={{ marginTop: 4 }}>{help}</div>}
    </div>
  );
}

function Checkbox({ checked, onChange, label, help }) {
  return (
    <label style={{ display: "flex", gap: 9, cursor: "pointer", alignItems: help ? "flex-start" : "center" }}>
      <span onClick={(e) => { e.preventDefault(); onChange && onChange(!checked); }} style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: help ? 1 : 0,
        border: `1.5px solid ${checked ? "var(--amoni)" : "var(--border-strong)"}`,
        background: checked ? "var(--amoni)" : "var(--surface)",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all .12s",
      }}>{checked && <Icon name="check" size={13} color="#fff" strokeWidth={2.4} />}</span>
      {label && <span><span style={{ fontSize: 13.5, color: "var(--text)" }}>{label}</span>{help && <div className="t-cap" style={{ marginTop: 2 }}>{help}</div>}</span>}
    </label>
  );
}

function RadioCard({ checked, onChange, title, desc, icon, right }) {
  return (
    <div onClick={onChange} className="focusable" style={{
      display: "flex", gap: 11, padding: 12, borderRadius: "var(--r)", cursor: "pointer",
      border: `1px solid ${checked ? "var(--amoni)" : "var(--border)"}`,
      background: checked ? "var(--surface-selected)" : "var(--surface)",
      boxShadow: checked ? "0 0 0 1px var(--amoni)" : "none", transition: "all .12s", alignItems: "flex-start",
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 99, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${checked ? "var(--amoni)" : "var(--border-strong)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{checked && <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--amoni)" }} />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineStack gap={6}>{icon && <Icon name={icon} size={15} color="var(--icon)" />}<span className="t-strong" style={{ fontSize: 13.5 }}>{title}</span></InlineStack>
        {desc && <div className="t-cap" style={{ marginTop: 2 }}>{desc}</div>}
      </div>
      {right}
    </div>
  );
}

function Toggle({ checked, onChange, size = "md" }) {
  const w = size === "sm" ? 34 : 40, h = size === "sm" ? 20 : 24, k = h - 6;
  return (
    <button onClick={() => onChange && onChange(!checked)} className="focusable" style={{
      width: w, height: h, borderRadius: 99, border: "none", cursor: "pointer", padding: 0,
      background: checked ? "var(--amoni)" : "var(--border-strong)", position: "relative", transition: "background .15s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: checked ? w - k - 3 : 3, width: k, height: k, borderRadius: 99,
        background: "#fff", transition: "left .16s cubic-bezier(.4,1.3,.6,1)", boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
      }} />
    </button>
  );
}

Object.assign(window, {
  BlockStack, InlineStack, Divider, Spacer, Card, Page, Button, Badge, Thumb,
  FieldLabel, TextField, Select, Checkbox, RadioCard, Toggle,
});
