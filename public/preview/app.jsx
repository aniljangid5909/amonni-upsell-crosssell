/* ============================================================
   Amoni Upsell — app router, state, tweaks.
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accent": ["oklch(0.64 0.12 35)", "oklch(0.56 0.13 33)"],
  "plan": "Growth",
  "builderLayout": "single",
  "offerUX": "cards",
  "dashViz": "line",
  "ppStyle": "classic"
}/*EDITMODE-END*/;

const ACCENTS = {
  "Clay": ["oklch(0.64 0.12 35)", "oklch(0.56 0.13 33)"],
  "Rose": ["oklch(0.63 0.13 12)", "oklch(0.55 0.14 10)"],
  "Plum": ["oklch(0.55 0.13 330)", "oklch(0.48 0.14 328)"],
  "Sage": ["oklch(0.62 0.07 155)", "oklch(0.52 0.08 156)"],
  "Indigo": ["oklch(0.55 0.13 270)", "oklch(0.48 0.14 270)"],
};

function newDraft(over) {
  return {
    id: null, name: "", status: "draft", placement: "post-purchase", offerType: "cross-sell",
    trigger: ["p1"], offer: "p3", discount: { type: "percent", value: 15 }, priority: 1,
    conditions: { minCart: 0, customerTag: "", skipSubscribed: true }, ...over,
  };
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("overview");
  const [funnels, setFunnels] = useState(FUNNELS);
  const [builder, setBuilder] = useState(null); // {draft}

  const dark = t.dark;
  const accent = ACCENTS[t.accent] ? ACCENTS[t.accent] : (Array.isArray(t.accent) ? t.accent : ACCENTS.Clay);

  const nav = (r, opts = {}) => {
    if (r === "funnels" && opts.create) { setBuilder({ draft: newDraft() }); setRoute("builder"); return; }
    if (r === "funnels" && opts.edit) { const f = funnels.find((x) => x.id === opts.edit); setBuilder({ draft: { ...f } }); setRoute("builder"); return; }
    setBuilder(null);
    setRoute(r);
  };

  const editFunnel = (id) => { const f = funnels.find((x) => x.id === id); setBuilder({ draft: { ...f } }); setRoute("builder"); };
  const createFunnel = () => { setBuilder({ draft: newDraft() }); setRoute("builder"); };
  const createFromRec = (rec) => {
    setBuilder({ draft: newDraft({ trigger: [rec.a], offer: rec.b, name: `${productById(rec.a).name.split(" ")[0]} → ${productById(rec.b).name.split(" ")[0]} (AI)`, placement: "post-purchase" }) });
    setRoute("builder");
  };
  const saveFunnel = (draft) => {
    setFunnels((fs) => {
      if (draft.id && fs.some((f) => f.id === draft.id)) return fs.map((f) => f.id === draft.id ? draft : f);
      return [...fs, { ...draft, id: "f" + Date.now(), status: "active", impressions: 0, accepts: 0, revenue: 0, aov: 0, ab: false }];
    });
    setBuilder(null); setRoute("funnels");
  };

  const navActive = route === "builder" ? "funnels" : route;

  let screen;
  if (route === "overview") screen = <ScreenOverview onNav={nav} funnels={funnels} plan={t.plan} />;
  else if (route === "funnels") screen = <ScreenFunnels funnels={funnels} setFunnels={setFunnels} onEdit={editFunnel} onCreate={createFunnel} />;
  else if (route === "builder") screen = <ScreenBuilder initial={builder.draft} onBack={() => nav("funnels")} onSave={saveFunnel} layout={t.builderLayout} offerUX={t.offerUX} plan={t.plan} />;
  else if (route === "analytics") screen = <ScreenAnalytics funnels={funnels} dashViz={t.dashViz} plan={t.plan} onNav={nav} />;
  else if (route === "abtests") screen = <ScreenABTest funnels={funnels} onNav={nav} />;
  else if (route === "ai") screen = <ScreenAI onCreateFromRec={createFromRec} onNav={nav} />;
  else if (route === "storefront") screen = <ScreenStorefront ppStyle={t.ppStyle} />;
  else if (route === "billing") screen = <ScreenBilling plan={t.plan} onSelectPlan={(p) => setTweak("plan", p)} />;
  else if (route === "settings") screen = <ScreenSettings dark={dark} onToggleTheme={() => setTweak("dark", !dark)} />;

  return (
    <div className={dark ? "theme-dark" : "theme-light"} style={{ "--amoni": accent[0], "--amoni-strong": accent[1], height: "100vh" }}>
      <AppFrame route={navActive} onNav={nav} plan={t.plan} dark={dark} onToggleTheme={() => setTweak("dark", !dark)}>
        <div key={route} className="anim-fade">{screen}</div>
      </AppFrame>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={dark} onChange={(v) => setTweak("dark", v)} />
        <TweakSelect label="Accent color" value={t.accent} options={Object.keys(ACCENTS)} onChange={(v) => setTweak("accent", v)} />
        <TweakSelect label="Billing plan" value={t.plan} options={["Free", "Growth", "Pro"]} onChange={(v) => setTweak("plan", v)} />

        <TweakSection label="Funnel builder" />
        <TweakRadio label="Layout" value={t.builderLayout} options={["single", "wizard"]} onChange={(v) => setTweak("builderLayout", v)} />
        <TweakRadio label="Offer-type UX" value={t.offerUX} options={["cards", "segmented"]} onChange={(v) => setTweak("offerUX", v)} />

        <TweakSection label="Analytics" />
        <TweakRadio label="Dashboard chart" value={t.dashViz} options={["line", "bars"]} onChange={(v) => setTweak("dashViz", v)} />

        <TweakSection label="Post-purchase widget" />
        <TweakRadio label="Visual style" value={t.ppStyle} options={["classic", "spotlight", "compact"]} onChange={(v) => setTweak("ppStyle", v)} />
        <div style={{ padding: "4px 2px 0" }}>
          <button onClick={() => { setRoute("storefront"); }} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>View storefront preview →</button>
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
