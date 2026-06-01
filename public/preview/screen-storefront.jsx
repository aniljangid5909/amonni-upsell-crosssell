/* ============================================================
   Storefront preview — merchant-facing widgets.
   Post-purchase (3 visual styles), cart drawer, product page.
   ============================================================ */
function priceAfter(p, disc) {
  if (!disc || disc.type === "none") return p.price;
  return disc.type === "percent" ? p.price * (1 - disc.value / 100) : p.price - disc.value;
}

/* ---------- POST-PURCHASE ---------- */
function PostPurchaseWidget({ style, offer, trigger, disc, onAccept, onDecline, state }) {
  const after = priceAfter(offer, disc);
  const save = offer.price - after;
  const badge = disc.type === "percent" ? `${disc.value}% OFF` : `SAVE ${fmtMoney(disc.value)}`;
  const cta = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={onAccept} style={ppBtnPrimary}>Add to my order · {fmtMoney(after, after % 1 ? 2 : 0)}</button>
      <button onClick={onDecline} style={ppBtnGhost}>No thanks, complete order</button>
    </div>
  );

  let body;
  if (style === "spotlight") {
    body = (
      <div style={{ textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
          <Thumb product={offer} size={148} radius={18} />
          <span style={{ position: "absolute", top: -8, right: -8 }}><Badge tone="critical">{badge}</Badge></span>
        </div>
        <div className="t-strong" style={{ fontSize: 17, color: "#1a1a1a" }}>{offer.name}</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 3 }}>{offer.variant}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "baseline", margin: "10px 0 18px" }}>
          <span className="t-num" style={{ fontSize: 24, color: "#1a1a1a" }}>{fmtMoney(after, after % 1 ? 2 : 0)}</span>
          <span style={{ fontSize: 14, color: "#999", textDecoration: "line-through" }}>{fmtMoney(offer.price)}</span>
        </div>
        {cta}
      </div>
    );
  } else if (style === "compact") {
    body = (
      <div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0" }}>
          <Thumb product={offer} size={56} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-strong" style={{ fontSize: 14, color: "#1a1a1a" }}>{offer.name}</div>
            <InlineStack gap={7} style={{ marginTop: 3 }}><span className="t-num" style={{ fontSize: 15, color: "#1a1a1a" }}>{fmtMoney(after, after % 1 ? 2 : 0)}</span><span style={{ fontSize: 12.5, color: "#999", textDecoration: "line-through" }}>{fmtMoney(offer.price)}</span><Badge tone="critical" size="sm">{badge}</Badge></InlineStack>
          </div>
        </div>
        <Divider style={{ background: "#eee", margin: "4px 0 14px" }} />
        {cta}
      </div>
    );
  } else { // classic
    body = (
      <div>
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <div style={{ position: "relative" }}><Thumb product={offer} size={92} radius={14} /><span style={{ position: "absolute", top: -7, left: -7 }}><Badge tone="critical" size="sm">{badge}</Badge></span></div>
          <div style={{ flex: 1 }}>
            <div className="t-strong" style={{ fontSize: 15, color: "#1a1a1a" }}>{offer.name}</div>
            <div style={{ fontSize: 12.5, color: "#666", marginTop: 2 }}>{offer.variant}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 8 }}>
              <span className="t-num" style={{ fontSize: 20, color: "#1a1a1a" }}>{fmtMoney(after, after % 1 ? 2 : 0)}</span>
              <span style={{ fontSize: 13, color: "#999", textDecoration: "line-through" }}>{fmtMoney(offer.price)}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--amoni-strong)", fontWeight: 600, marginTop: 4 }}>You save {fmtMoney(save, save % 1 ? 2 : 0)}</div>
          </div>
        </div>
        {cta}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 380 }}>
      {/* order confirmed strip */}
      <div style={{ background: "#fff", borderRadius: "14px 14px 0 0", padding: "14px 18px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 24, height: 24, borderRadius: 99, background: "#0c8a4f", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} color="#fff" strokeWidth={3} /></span>
        <div style={{ lineHeight: 1.2 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Order #1042 confirmed</div><div style={{ fontSize: 11.5, color: "#888" }}>Wait! Add this before we pack it</div></div>
      </div>
      <div style={{ background: "#fff", borderRadius: "0 0 14px 14px", padding: 18, position: "relative" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--amoni-strong)", textTransform: "uppercase", marginBottom: 12 }}>★ One-time offer · pairs with your {trigger.name.split(" ")[0]}</div>
        {state === "accepted"
          ? <div className="anim-pop" style={{ textAlign: "center", padding: "24px 0" }}><span style={{ width: 48, height: 48, borderRadius: 99, background: "#0c8a4f", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon name="check" size={26} color="#fff" strokeWidth={3} /></span><div className="t-strong" style={{ fontSize: 16, color: "#1a1a1a" }}>Added to your order!</div><div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>Charged to your original payment — no re-entry needed.</div></div>
          : body}
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 10.5, color: "#aaa" }}>One-click — charged to your original payment method</div>
      </div>
    </div>
  );
}
const ppBtnPrimary = { width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "var(--amoni)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
const ppBtnGhost = { width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "transparent", color: "#888", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };

/* ---------- CART DRAWER ---------- */
function CartDrawerWidget({ offer, disc, onAccept, state }) {
  const after = priceAfter(offer, disc);
  return (
    <div style={{ width: 340, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.16)" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>Your cart (2)</span><Icon name="x" size={16} color="#999" />
      </div>
      <div style={{ padding: 16 }}>
        {[PRODUCTS[1], PRODUCTS[0]].map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <Thumb product={p} size={48} radius={9} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{p.name}</div><div style={{ fontSize: 12, color: "#888" }}>Qty 1 · {fmtMoney(p.price)}</div></div>
          </div>
        ))}
      </div>
      {/* Amoni add-on offer */}
      <div className="anim-fade" style={{ margin: "0 12px 12px", border: "1.5px dashed var(--amoni)", borderRadius: 12, padding: 12, background: "var(--amoni-softer)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--amoni-strong)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Complete your routine</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Thumb product={offer} size={46} radius={9} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{offer.name}</div><InlineStack gap={6}><span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{fmtMoney(after, after % 1 ? 2 : 0)}</span><span style={{ fontSize: 11.5, color: "#aaa", textDecoration: "line-through" }}>{fmtMoney(offer.price)}</span></InlineStack></div>
          {state === "accepted"
            ? <span style={{ width: 30, height: 30, borderRadius: 8, background: "#0c8a4f", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={16} color="#fff" strokeWidth={2.6} /></span>
            : <button onClick={onAccept} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "var(--amoni)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Add</button>}
        </div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <button style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Checkout · {fmtMoney(72 + (state === "accepted" ? after : 0), 2)}</button>
      </div>
    </div>
  );
}

/* ---------- PRODUCT PAGE (Frequently bought together) ---------- */
function ProductPageWidget({ trigger, offers, disc, accepted, onToggle }) {
  const items = [trigger, ...offers];
  const total = items.reduce((s, p, i) => s + (i === 0 ? p.price : (accepted.includes(p.id) ? priceAfter(p, disc) : 0)), 0);
  return (
    <div style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 8px 28px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>Frequently bought together</div>
      <div style={{ fontSize: 12.5, color: "#888", marginBottom: 16 }}>Save {disc.value}% when added as a bundle</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        {items.map((p, i) => (
          <React.Fragment key={p.id}>
            {i > 0 && <Icon name="plus" size={14} color="#bbb" />}
            <div style={{ textAlign: "center", width: 76 }}>
              <div style={{ position: "relative", opacity: i === 0 || accepted.includes(p.id) ? 1 : 0.5 }}><Thumb product={p} size={72} radius={12} />{i === 0 && <span style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)" }}><Badge tone="neutral" size="sm">This item</Badge></span>}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
      <BlockStack gap={8} style={{ marginBottom: 16 }}>
        {items.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {i === 0
              ? <span style={{ width: 18, height: 18, borderRadius: 5, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="check" size={12} color="#fff" strokeWidth={2.6} /></span>
              : <span onClick={() => onToggle(p.id)} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${accepted.includes(p.id) ? "var(--amoni)" : "#ccc"}`, background: accepted.includes(p.id) ? "var(--amoni)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>{accepted.includes(p.id) && <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />}</span>}
            <span style={{ flex: 1, fontSize: 13, color: "#333", fontWeight: i === 0 ? 600 : 400 }}>{p.name}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{fmtMoney(i === 0 ? p.price : priceAfter(p, disc), 2)}</span>
          </div>
        ))}
      </BlockStack>
      <Divider style={{ background: "#eee", marginBottom: 14 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 11.5, color: "#888" }}>Total price</div><div className="t-num" style={{ fontSize: 22, color: "#1a1a1a" }}>{fmtMoney(total, 2)}</div></div>
        <button style={{ padding: "12px 22px", borderRadius: 10, border: "none", background: "var(--amoni)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Add {accepted.length + 1} to cart</button>
      </div>
    </div>
  );
}

/* ---------- CHECKOUT (Shopify Plus — Checkout UI Extension) ---------- */
function CheckoutWidget({ offer, disc, state, onAccept }) {
  const after = priceAfter(offer, disc);
  const items = [PRODUCTS[1], PRODUCTS[0]];
  const itemsTotal = items.reduce((s, p) => s + p.price, 0);
  const total = itemsTotal + (state === "accepted" ? after : 0);
  const fieldRow = (label, value, action) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #e3e3e3", borderRadius: 8, background: "#fff" }}>
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 10.5, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div><div style={{ fontSize: 13, color: "#1a1a1a", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>
      {action && <span style={{ fontSize: 12.5, color: "#2a6fdb", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>{action}</span>}
    </div>
  );
  return (
    <div style={{ width: "100%", maxWidth: 760, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.12)" }}>
      {/* checkout header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-brand)", fontWeight: 800, fontSize: 16, color: "#1a1a1a", letterSpacing: "-0.01em" }}>LUMEN SKIN</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#888" }}><Icon name="lock" size={13} /> Secure checkout</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr" }}>
        {/* LEFT — forms (summarized) */}
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 40, borderRadius: 8, background: "#5a31f4", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>shop Pay</div>
            <div style={{ flex: 1, height: 40, borderRadius: 8, background: "#ffc439", display: "flex", alignItems: "center", justifyContent: "center", color: "#003087", fontWeight: 800, fontSize: 13, fontStyle: "italic" }}>PayPal</div>
            <div style={{ flex: 1, height: 40, borderRadius: 8, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 12.5 }}> Pay</div>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", margin: "0 0 14px", position: "relative" }}><span style={{ background: "#fff", padding: "0 10px", position: "relative", zIndex: 1 }}>OR</span><div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#eee" }} /></div>
          <BlockStack gap={10}>
            {fieldRow("Contact", "ava.reyes@email.com", "Change")}
            {fieldRow("Ship to", "48 Marigold Ave, Austin, TX 78701", "Change")}
            {fieldRow("Method", "Standard shipping · Free", "Change")}
            <div style={{ marginTop: 4, fontSize: 11.5, color: "#888", fontWeight: 600 }}>Payment</div>
            <div style={{ padding: "12px 14px", border: "1.5px solid #1a1a1a", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 16, height: 16, borderRadius: 99, border: "5px solid #1a1a1a" }} />
              <span style={{ fontSize: 13, color: "#1a1a1a", flex: 1 }}>Credit card ···· 4242</span>
              <Icon name="lock" size={14} color="#888" />
            </div>
          </BlockStack>
          <button style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>Pay now · {fmtMoney(total, 2)}</button>
        </div>

        {/* RIGHT — order summary sidebar (where the Amoni block lives) */}
        <div style={{ padding: 20, background: "#f7f5f2", borderLeft: "1px solid #eee" }}>
          {items.map((p) => (
            <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <div style={{ position: "relative" }}><Thumb product={p} size={46} radius={9} /><span style={{ position: "absolute", top: -7, right: -7, width: 19, height: 19, borderRadius: 99, background: "#6b6b6b", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1a1a" }}>{p.name}</div><div style={{ fontSize: 11.5, color: "#999" }}>{p.variant}</div></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{fmtMoney(p.price)}</span>
            </div>
          ))}

          {/* Amoni cross-sell block */}
          <div className="anim-fade" style={{ border: "1.5px solid var(--amoni)", borderRadius: 12, padding: 12, background: "#fff", margin: "4px 0 16px", boxShadow: "0 2px 10px color-mix(in oklch, var(--amoni) 18%, transparent)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--amoni-strong)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}><Icon name="sparkle" size={12} /> Add & save before you pay</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Thumb product={offer} size={44} radius={9} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{offer.name}</div>
                <InlineStack gap={6} style={{ marginTop: 2 }}><span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{fmtMoney(after, after % 1 ? 2 : 0)}</span><span style={{ fontSize: 11.5, color: "#aaa", textDecoration: "line-through" }}>{fmtMoney(offer.price)}</span><Badge tone="critical" size="sm">{disc.value}% off</Badge></InlineStack>
              </div>
            </div>
            {state === "accepted"
              ? <div style={{ marginTop: 10, padding: "8px", borderRadius: 8, background: "#e7f6ee", color: "#0c5132", fontSize: 12, fontWeight: 600, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="check" size={14} strokeWidth={2.6} /> Added to your order</div>
              : <button onClick={onAccept} style={{ width: "100%", marginTop: 10, padding: "9px", borderRadius: 8, border: "none", background: "var(--amoni)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>+ Add to order</button>}
          </div>

          {/* discount + totals */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, background: "#fff", fontSize: 12.5, color: "#aaa" }}>Discount code</div>
            <button style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #ccc", background: "#efefef", fontSize: 12.5, fontWeight: 600, color: "#666", cursor: "pointer" }}>Apply</button>
          </div>
          <BlockStack gap={7}>
            <InlineStack justify="space-between"><span style={{ fontSize: 12.5, color: "#666" }}>Subtotal</span><span style={{ fontSize: 12.5, color: "#1a1a1a", fontWeight: 600 }}>{fmtMoney(total, 2)}</span></InlineStack>
            <InlineStack justify="space-between"><span style={{ fontSize: 12.5, color: "#666" }}>Shipping</span><span style={{ fontSize: 12.5, color: "#1a1a1a" }}>Free</span></InlineStack>
            <Divider style={{ background: "#e3ddd4", margin: "5px 0" }} />
            <InlineStack justify="space-between" align="baseline"><span style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 600 }}>Total</span><span className="t-num" style={{ fontSize: 19, color: "#1a1a1a" }}>{fmtMoney(total, 2)}</span></InlineStack>
          </BlockStack>
        </div>
      </div>
    </div>
  );
}

function ScreenStorefront({ ppStyle }) {
  const [tab, setTab] = useState("post-purchase");
  const [ppState, setPpState] = useState("idle");
  const [cartState, setCartState] = useState("idle");
  const [checkoutState, setCheckoutState] = useState("idle");
  const [bundleAccepted, setBundleAccepted] = useState([PRODUCTS[2].id]);

  const offer = PRODUCTS[2], trigger = PRODUCTS[0], disc = { type: "percent", value: 15 };

  return (
    <Page title="Storefront preview" width={1080}
      subtitle="Exactly how your offers appear to shoppers. Interactive — try accepting an offer."
      primaryAction={<Button variant="secondary" icon="external">Open live storefront</Button>}>
      <BlockStack gap={16}>
        <Card padding={0} flush>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <SegmentedControl value={tab} onChange={setTab} options={[
              { value: "post-purchase", label: "Post-purchase", icon: "sparkle" },
              { value: "cart", label: "Cart drawer", icon: "cart" },
              { value: "product", label: "Product page", icon: "tag" },
              { value: "checkout", label: "Checkout", icon: "lock" },
            ]} />
            <InlineStack gap={8}>
              {tab === "post-purchase" && <Badge tone="amoni" size="sm">Style: {ppStyle}</Badge>}
              {tab === "checkout" && <Badge tone="amoni" size="sm">Shopify Plus only</Badge>}
              <Button size="sm" variant="tertiary" icon="refresh" onClick={() => { setPpState("idle"); setCartState("idle"); setCheckoutState("idle"); setBundleAccepted([PRODUCTS[2].id]); }}>Reset</Button>
            </InlineStack>
          </div>

          {/* Storefront stage */}
          <div className="scroll-thin" style={{ background: tab === "post-purchase" ? "#f4f1ee" : tab === "cart" ? "#2a2a2e" : tab === "checkout" ? "#eef0f1" : "#f6f4f1", padding: tab === "cart" ? "28px" : "36px 24px", display: "flex", justifyContent: "center", minHeight: 440, alignItems: (tab === "cart" || tab === "checkout") ? "flex-start" : "center", position: "relative", backgroundImage: tab === "product" ? "linear-gradient(180deg,#faf8f5,#f0ece6)" : "none" }}>
            {/* faux browser bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 30, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 99, background: c }} />)}
              <span style={{ fontSize: 11, color: tab === "cart" ? "#bbb" : "#999", marginLeft: 10 }}>lumenskin.com{tab === "product" ? "/products/vitamin-c-serum" : tab === "cart" ? "/cart" : tab === "checkout" ? "/checkouts/co-9f2a" : "/checkout/thank-you"}</span>
            </div>

            {tab === "post-purchase" && <div style={{ marginTop: 14 }}><PostPurchaseWidget style={ppStyle} offer={offer} trigger={trigger} disc={disc} state={ppState} onAccept={() => setPpState("accepted")} onDecline={() => setPpState("declined")} /></div>}
            {tab === "cart" && <div style={{ marginTop: 24, marginLeft: "auto" }}><CartDrawerWidget offer={PRODUCTS[4]} disc={{ type: "percent", value: 20 }} state={cartState} onAccept={() => setCartState("accepted")} /></div>}
            {tab === "product" && <div style={{ marginTop: 20 }}><ProductPageWidget trigger={trigger} offers={[PRODUCTS[2], PRODUCTS[4]]} disc={{ type: "percent", value: 15 }} accepted={bundleAccepted} onToggle={(id) => setBundleAccepted((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id])} /></div>}
            {tab === "checkout" && <div style={{ marginTop: 22, width: "100%", display: "flex", justifyContent: "center" }}><CheckoutWidget offer={PRODUCTS[6]} disc={{ type: "percent", value: 10 }} state={checkoutState} onAccept={() => setCheckoutState("accepted")} /></div>}
          </div>
        </Card>

        <Banner tone="amoni" icon={tab === "post-purchase" ? "lock" : tab === "cart" ? "cart" : tab === "product" ? "store" : "lock"}>
          {tab === "post-purchase" && "Shown between order confirmation and the thank-you page. One-click accept charges the original payment method via Shopify's Post-Purchase API — no card re-entry."}
          {tab === "cart" && "A Theme App Extension block triggered by cart contents. Dismissible, and the dismissal is remembered for the session via localStorage."}
          {tab === "product" && "A \u201CFrequently bought together\u201D Theme App Extension block. Merchants position it in the theme editor — no hardcoded injection, zero layout shift."}
          {tab === "checkout" && <span><strong>Checkout UI Extension</strong> in the order-summary sidebar (Shopify Plus / Pro plan). Skipped automatically for customers who already subscribe to the offered product.</span>}
        </Banner>

        <InlineStack gap={12} wrap style={{ alignItems: "stretch" }}>
          <Card padding={16} style={{ flex: 1 }}><InlineStack gap={9} style={{ marginBottom: 6 }}><Icon name="bolt" size={16} color="var(--amoni-strong)" /><span className="t-strong" style={{ fontSize: 13 }}>Zero layout shift</span></InlineStack><span className="t-cap">Widgets reserve space and load async — no CLS, theme-agnostic.</span></Card>
          <Card padding={16} style={{ flex: 1 }}><InlineStack gap={9} style={{ marginBottom: 6 }}><Icon name="lock" size={16} color="var(--amoni-strong)" /><span className="t-strong" style={{ fontSize: 13 }}>One-click, no re-auth</span></InlineStack><span className="t-cap">Post-purchase charges the original payment method via Shopify.</span></Card>
          <Card padding={16} style={{ flex: 1 }}><InlineStack gap={9} style={{ marginBottom: 6 }}><Icon name="store" size={16} color="var(--amoni-strong)" /><span className="t-strong" style={{ fontSize: 13 }}>Theme app extension</span></InlineStack><span className="t-cap">Merchants position blocks in the theme editor — no code injection.</span></Card>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
Object.assign(window, { ScreenStorefront });
