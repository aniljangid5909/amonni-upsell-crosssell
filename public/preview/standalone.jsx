/* ============================================================
   Standalone Storefront Preview — just the 4 widget placements
   in a clean tabbed view. No admin shell.
   ============================================================ */
function MiniMark({ size = 26 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: "var(--amoni)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.12)", flexShrink: 0 }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15 L10 5 L16 15" /><path d="M7 15 L10 10 L13 15" opacity="0.55" />
      </svg>
    </div>
  );
}

const PLACEMENT_TABS = [
  { value: "post-purchase", label: "Post-purchase", icon: "sparkle" },
  { value: "cart", label: "Cart drawer", icon: "cart" },
  { value: "product", label: "Product page", icon: "tag" },
  { value: "checkout", label: "Checkout", icon: "lock" },
];

function StandaloneStorefront() {
  const [dark, setDark] = useState(() => localStorage.getItem("sf_dark") === "1");
  const [tab, setTab] = useState("post-purchase");
  const [ppStyle, setPpStyle] = useState("classic");
  const [ppState, setPpState] = useState("idle");
  const [cartState, setCartState] = useState("idle");
  const [checkoutState, setCheckoutState] = useState("idle");
  const [bundleAccepted, setBundleAccepted] = useState([PRODUCTS[2].id]);

  useEffect(() => { localStorage.setItem("sf_dark", dark ? "1" : "0"); }, [dark]);

  const offer = PRODUCTS[2], trigger = PRODUCTS[0], disc = { type: "percent", value: 15 };
  const reset = () => { setPpState("idle"); setCartState("idle"); setCheckoutState("idle"); setBundleAccepted([PRODUCTS[2].id]); };

  const note = {
    "post-purchase": "Shown between order confirmation and the thank-you page. One-click accept charges the original payment method via Shopify's Post-Purchase API — no card re-entry.",
    "cart": "A Theme App Extension block triggered by cart contents. Dismissible, and the dismissal is remembered for the session via localStorage.",
    "product": "A \u201CFrequently bought together\u201D Theme App Extension block. Merchants position it in the theme editor — no hardcoded injection, zero layout shift.",
    "checkout": "Checkout UI Extension in the order-summary sidebar (Shopify Plus). Skipped automatically for customers who already subscribe to the offered product.",
  };

  return (
    <div className={dark ? "theme-dark" : "theme-light"} style={{ "--amoni": "oklch(0.64 0.12 35)", "--amoni-strong": "oklch(0.56 0.13 33)", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface)", position: "sticky", top: 0, zIndex: 10 }}>
        <InlineStack gap={11}>
          <MiniMark size={30} />
          <div style={{ lineHeight: 1.15 }}>
            <div className="t-display" style={{ fontSize: 17 }}>Storefront preview</div>
            <div className="t-cap" style={{ fontSize: 11.5 }}>Amoni Upsell · how offers appear to shoppers</div>
          </div>
        </InlineStack>
        <InlineStack gap={14}>
          <InlineStack gap={8}><span className="t-cap" style={{ fontSize: 12 }}>Dark</span><Toggle size="sm" checked={dark} onChange={setDark} /></InlineStack>
          <Button size="sm" variant="tertiary" icon="refresh" onClick={reset}>Reset</Button>
        </InlineStack>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 1080, margin: "0 auto", padding: "24px 28px 48px" }}>
        <BlockStack gap={16}>
          <Card padding={0} flush>
            {/* tab row */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <SegmentedControl value={tab} onChange={setTab} options={PLACEMENT_TABS} />
              {tab === "post-purchase"
                ? <InlineStack gap={8}><span className="t-cap" style={{ fontSize: 12 }}>Style</span><SegmentedControl size="sm" value={ppStyle} onChange={setPpStyle} options={[{ value: "classic", label: "Classic" }, { value: "spotlight", label: "Spotlight" }, { value: "compact", label: "Compact" }]} /></InlineStack>
                : tab === "checkout" ? <Badge tone="amoni" size="sm">Shopify Plus</Badge> : <span />}
            </div>

            {/* stage */}
            <div className="scroll-thin" style={{ background: tab === "post-purchase" ? "#f4f1ee" : tab === "cart" ? "#2a2a2e" : tab === "checkout" ? "#eef0f1" : "#f6f4f1", padding: tab === "cart" ? "28px" : "40px 24px", display: "flex", justifyContent: "center", minHeight: 480, alignItems: (tab === "cart" || tab === "checkout") ? "flex-start" : "center", position: "relative", backgroundImage: tab === "product" ? "linear-gradient(180deg,#faf8f5,#f0ece6)" : "none" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 30, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 99, background: c }} />)}
                <span style={{ fontSize: 11, color: tab === "cart" ? "#bbb" : "#999", marginLeft: 10 }}>lumenskin.com{tab === "product" ? "/products/vitamin-c-serum" : tab === "cart" ? "/cart" : tab === "checkout" ? "/checkouts/co-9f2a" : "/checkout/thank-you"}</span>
              </div>
              {tab === "post-purchase" && <div style={{ marginTop: 14 }}><PostPurchaseWidget style={ppStyle} offer={offer} trigger={trigger} disc={disc} state={ppState} onAccept={() => setPpState("accepted")} onDecline={() => setPpState("declined")} /></div>}
              {tab === "cart" && <div style={{ marginTop: 24, marginLeft: "auto" }}><CartDrawerWidget offer={PRODUCTS[4]} disc={{ type: "percent", value: 20 }} state={cartState} onAccept={() => setCartState("accepted")} /></div>}
              {tab === "product" && <div style={{ marginTop: 22 }}><ProductPageWidget trigger={trigger} offers={[PRODUCTS[2], PRODUCTS[4]]} disc={{ type: "percent", value: 15 }} accepted={bundleAccepted} onToggle={(id) => setBundleAccepted((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id])} /></div>}
              {tab === "checkout" && <div style={{ marginTop: 22, width: "100%", display: "flex", justifyContent: "center" }}><CheckoutWidget offer={PRODUCTS[6]} disc={{ type: "percent", value: 10 }} state={checkoutState} onAccept={() => setCheckoutState("accepted")} /></div>}
            </div>
          </Card>

          <Banner tone="amoni" icon={tab === "cart" ? "cart" : tab === "product" ? "store" : "lock"}>{note[tab]}</Banner>
        </BlockStack>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<StandaloneStorefront />);
