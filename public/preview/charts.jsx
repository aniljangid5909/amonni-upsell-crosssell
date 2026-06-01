/* ============================================================
   Charts — lightweight SVG. Line (with area), bars, donut,
   sparkline, conversion funnel. Amoni accent palette.
   ============================================================ */

function useResize(ref) {
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
}

/* Line chart with gradient area + optional comparison line + hover */
function LineChart({ data, compare, height = 220, money = true, animate = true }) {
  const wrap = useRef(null);
  const W = useResize(wrap);
  const [hi, setHi] = useState(null);
  const padL = 8, padR = 8, padT = 14, padB = 22;
  const max = Math.max(...data, ...(compare || [])) * 1.12;
  const min = 0;
  const n = data.length;
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${path(data)} L${x(n - 1)},${height - padB} L${x(0)},${height - padB} Z`;
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + t * (height - padT - padB));
  return (
    <div ref={wrap} style={{ width: "100%", position: "relative" }}
      onMouseLeave={() => setHi(null)}
      onMouseMove={(e) => {
        const r = wrap.current.getBoundingClientRect();
        const rel = e.clientX - r.left;
        const i = Math.round(((rel - padL) / (W - padL - padR)) * (n - 1));
        setHi(Math.max(0, Math.min(n - 1, i)));
      }}>
      <svg width={W} height={height} style={{ display: "block" }}>
        <defs>
          <linearGradient id="amoniArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--amoni)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--amoni)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridY.map((gy, i) => <line key={i} x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="var(--chart-grid)" strokeWidth="1" />)}
        {compare && <path d={path(compare)} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="4 4" />}
        <path d={area} fill="url(#amoniArea)" />
        <path d={path(data)} fill="none" stroke="var(--amoni)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={animate ? { strokeDasharray: 2400, strokeDashoffset: 2400, animation: "amoni-draw 1.1s ease forwards" } : {}}
          ref={(el) => { if (el) el.style.setProperty("--dash", "2400"); }} />
        {hi != null && (
          <g>
            <line x1={x(hi)} y1={padT} x2={x(hi)} y2={height - padB} stroke="var(--amoni)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={x(hi)} cy={y(data[hi])} r="5" fill="var(--surface)" stroke="var(--amoni)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hi != null && (
        <div style={{ position: "absolute", left: Math.min(Math.max(x(hi), 50), W - 50), top: 0, transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", fontSize: 11.5, padding: "5px 9px", borderRadius: 7, pointerEvents: "none", whiteSpace: "nowrap", fontWeight: 600 }}>
          {money ? fmtMoney(data[hi]) : fmtNum(data[hi])} <span style={{ opacity: 0.6, fontWeight: 400 }}>· day {hi + 1}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginTop: 2 }}>
        {["30d ago", "20d", "10d", "Today"].map((l, i) => <span key={i} className="t-cap" style={{ fontSize: 11 }}>{l}</span>)}
      </div>
    </div>
  );
}

/* Vertical bar chart */
function BarChart({ data, height = 180, money = false, color = "var(--amoni)" }) {
  const wrap = useRef(null);
  const W = useResize(wrap);
  const [hi, setHi] = useState(null);
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const padB = 26, padT = 8;
  const n = data.length;
  const gap = 12;
  const bw = (W - gap * (n - 1)) / n;
  return (
    <div ref={wrap} style={{ width: "100%" }}>
      <svg width={W} height={height} style={{ display: "block" }} onMouseLeave={() => setHi(null)}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - padT - padB);
          const bx = i * (bw + gap);
          const by = height - padB - h;
          return (
            <g key={i} onMouseEnter={() => setHi(i)}>
              <rect x={bx} y={padT} width={bw} height={height - padT - padB} fill="var(--chart-grid)" rx="6" opacity="0.5" />
              <rect x={bx} y={by} width={bw} height={h} rx="6" fill={d.color || color} opacity={hi == null || hi === i ? 1 : 0.45} style={{ transition: "opacity .12s" }}>
                <animate attributeName="height" from="0" to={h} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from={height - padB} to={by} dur="0.6s" fill="freeze" />
              </rect>
              <text x={bx + bw / 2} y={by - 6} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--text-strong)" fontFamily="var(--font-brand)" opacity={hi === i ? 1 : 0}>
                {money ? fmtMoney(d.value) : fmtNum(d.value)}
              </text>
              <text x={bx + bw / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-sub)">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Donut chart */
function Donut({ segments, size = 140, thickness = 20, centerLabel, centerValue }) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-inset)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circ;
          const el = (
            <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-acc * circ} strokeLinecap="butt"
              style={{ transition: "stroke-dasharray .6s" }} />
          );
          acc += frac;
          return el;
        })}
      </svg>
      {(centerValue || centerLabel) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {centerValue && <span className="t-num" style={{ fontSize: 22, lineHeight: 1 }}>{centerValue}</span>}
          {centerLabel && <span className="t-cap" style={{ fontSize: 11, marginTop: 2 }}>{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

/* Mini sparkline */
function Sparkline({ data, width = 72, height = 28, tone = "var(--amoni)" }) {
  const max = Math.max(...data), min = Math.min(...data);
  const x = (i) => (i / (data.length - 1)) * width;
  const y = (v) => height - 2 - ((v - min) / (max - min || 1)) * (height - 4);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={tone} opacity="0.1" />
      <path d={path} fill="none" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Conversion funnel (horizontal bars) */
function ConvFunnel({ steps }) {
  const max = steps[0].value;
  const palette = ["var(--amoni)", "color-mix(in oklch, var(--amoni) 80%, #fff)", "color-mix(in oklch, var(--amoni) 62%, #fff)", "color-mix(in oklch, var(--amoni) 46%, #fff)"];
  return (
    <BlockStack gap={12}>
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = i === 0 ? 100 : (s.value / steps[i - 1].value) * 100;
        return (
          <div key={i}>
            <InlineStack justify="space-between" style={{ marginBottom: 5 }}>
              <span className="t-strong" style={{ fontSize: 13 }}>{s.label}</span>
              <InlineStack gap={8}>
                <span className="t-num" style={{ fontSize: 14 }}>{fmtNum(s.value)}</span>
                {i > 0 && <Badge tone={conv > 50 ? "success" : conv > 20 ? "attention" : "neutral"} size="sm">{conv.toFixed(0)}%</Badge>}
              </InlineStack>
            </InlineStack>
            <div style={{ height: 30, background: "var(--bg-inset)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: palette[i], borderRadius: 8, transition: "width .6s cubic-bezier(.3,1,.4,1)" }} />
            </div>
          </div>
        );
      })}
    </BlockStack>
  );
}

Object.assign(window, { LineChart, BarChart, Donut, Sparkline, ConvFunnel });
