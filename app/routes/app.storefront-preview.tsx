import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};
import {
  Page,
  Card,
  Banner,
  Button,
  InlineStack,
  BlockStack,
  Text,
  Badge,
} from "@shopify/polaris";
import {
  PRODUCTS,
  PP_OFFER,
  PP_TRIGGER,
  PP_DISC,
  CART_OFFER,
  CART_DISC,
  CHECKOUT_OFFER,
  CHECKOUT_DISC,
  BUNDLE_TRIGGER,
  BUNDLE_CROSSSELLS,
  type Product,
} from "../data/products";
import "../styles/storefront-preview.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "post-purchase" | "cart" | "product" | "checkout";
type PPStyle = "classic" | "spotlight" | "compact";
type State = "idle" | "accepted" | "declined";
type Disc = { type: "percent"; value: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function discountedPrice(price: number, disc: Disc): number {
  if (disc.type === "percent") return price * (1 - disc.value / 100);
  return price;
}

function fmt(price: number): string {
  return `$${price.toFixed(2)}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Thumb component ──────────────────────────────────────────────────────────
function Thumb({ product, size }: { product: Product; size: number }) {
  const fontSize = size <= 48 ? 10 : size <= 72 ? 12 : size <= 92 ? 14 : 16;
  return (
    <div
      className="thumb"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${product.tone}, ${product.tone}cc)`,
        fontSize,
        borderRadius: size <= 48 ? 6 : 10,
      }}
    >
      {initials(product.name)}
    </div>
  );
}

// ─── PostPurchaseWidget ───────────────────────────────────────────────────────
interface PPWProps {
  style: PPStyle;
  offer: Product;
  disc: Disc;
  state: State;
  onAccept: () => void;
  onDecline: () => void;
}

function PostPurchaseWidget({ style, offer, disc, state, onAccept, onDecline }: PPWProps) {
  const salePrice = discountedPrice(offer.price, disc);
  const savings = offer.price - salePrice;
  const triggerWord = PP_TRIGGER.name.split(" ")[0];

  return (
    <div className="ppw">
      {/* Header */}
      <div className="ppw-header">
        <div className="ppw-header-left">
          <div className="ppw-check">✓</div>
          <div>
            <div className="ppw-order-text">Order #1042 confirmed</div>
            <div className="ppw-wait-text">Wait! Add this before we pack it</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="ppw-body">
        {state === "accepted" ? (
          <div className="ppw-accepted">
            <div className="ppw-accepted-check">✓</div>
            <div className="ppw-accepted-title">Added to your order!</div>
            <div className="ppw-accepted-sub">
              Charged to your original payment — no re-entry needed.
            </div>
          </div>
        ) : (
          <>
            <div className="ppw-brand-label">
              ★ One-time offer · pairs with your {triggerWord}
            </div>

            {style === "classic" && (
              <div className="ppw-classic-row">
                <div className="ppw-thumb-wrap">
                  <Thumb product={offer} size={92} />
                  <span className="ppw-badge">{disc.value}% off</span>
                </div>
                <div className="ppw-info">
                  <div className="ppw-name">{offer.name}</div>
                  <div className="ppw-variant">{offer.variant}</div>
                  <div className="ppw-price-row">
                    <span className="ppw-price-new">{fmt(salePrice)}</span>
                    <span className="ppw-price-old">{fmt(offer.price)}</span>
                  </div>
                  <div className="ppw-savings">You save {fmt(savings)}</div>
                </div>
              </div>
            )}

            {style === "spotlight" && (
              <div className="ppw-spotlight-center">
                <div className="ppw-thumb-wrap" style={{ display: "inline-block" }}>
                  <Thumb product={offer} size={148} />
                  <span className="ppw-badge ppw-badge-right">{disc.value}% off</span>
                </div>
                <div className="ppw-name" style={{ marginTop: 8 }}>
                  {offer.name}
                </div>
                <div className="ppw-variant">{offer.variant}</div>
                <div className="ppw-spotlight-price">{fmt(salePrice)}</div>
                <div className="ppw-price-row" style={{ justifyContent: "center" }}>
                  <span className="ppw-price-old">{fmt(offer.price)}</span>
                  <span className="ppw-savings">Save {fmt(savings)}</span>
                </div>
              </div>
            )}

            {style === "compact" && (
              <>
                <div className="ppw-compact-row">
                  <div className="ppw-thumb-wrap">
                    <Thumb product={offer} size={56} />
                  </div>
                  <div className="ppw-compact-info">
                    <div className="ppw-compact-name">{offer.name}</div>
                    <div className="ppw-compact-price">
                      {fmt(salePrice)}{" "}
                      <span style={{ textDecoration: "line-through", color: "#bbb" }}>
                        {fmt(offer.price)}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: "var(--amoni)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {disc.value}% off
                  </span>
                </div>
                <div className="ppw-divider" />
              </>
            )}

            <button className="w-btn-primary" onClick={onAccept} style={{ marginBottom: 8 }}>
              Add to my order · {fmt(salePrice)}
            </button>
            <button className="w-btn-ghost" onClick={onDecline}>
              No thanks, complete order
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="ppw-footer">
        One-click — charged to your original payment method
      </div>
    </div>
  );
}

// ─── CartDrawerWidget ─────────────────────────────────────────────────────────
interface CDWProps {
  offer: Product;
  disc: Disc;
  state: "idle" | "accepted";
  onAccept: () => void;
}

function CartDrawerWidget({ offer, disc, state, onAccept }: CDWProps) {
  const salePrice = discountedPrice(offer.price, disc);
  const cartItems = [
    { product: PRODUCTS[0], qty: 1, price: PRODUCTS[0].price },
    { product: PRODUCTS[1], qty: 1, price: PRODUCTS[1].price },
  ];
  const subtotal = cartItems.reduce((s, i) => s + i.price, 0);
  const checkoutTotal = state === "accepted" ? subtotal + salePrice : subtotal;

  return (
    <div className="cdw">
      <div className="cdw-header">
        <div className="cdw-title">Your cart (2)</div>
        <button className="cdw-close">✕</button>
      </div>

      <div className="cdw-items">
        {cartItems.map((item) => (
          <div key={item.product.id} className="cdw-item">
            <Thumb product={item.product} size={48} />
            <div className="cdw-item-info">
              <div className="cdw-item-name">{item.product.name}</div>
              <div className="cdw-item-price">{fmt(item.price)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add-on block */}
      <div className="cdw-addon">
        <div className="cdw-addon-label">Complete your routine</div>
        <div className="cdw-addon-row">
          <Thumb product={offer} size={44} />
          <div className="cdw-addon-info">
            <div className="cdw-addon-name">{offer.name}</div>
            <div className="cdw-addon-price">
              {fmt(salePrice)}{" "}
              <span style={{ textDecoration: "line-through", color: "#ccc" }}>
                {fmt(offer.price)}
              </span>
            </div>
          </div>
          <button
            className={`cdw-add-btn${state === "accepted" ? " added" : ""}`}
            onClick={state === "idle" ? onAccept : undefined}
          >
            {state === "accepted" ? "✓" : "Add"}
          </button>
        </div>
      </div>

      <button className="cdw-checkout">Checkout · {fmt(checkoutTotal)}</button>
    </div>
  );
}

// ─── ProductPageWidget ────────────────────────────────────────────────────────
interface PPGWProps {
  trigger: Product;
  offers: Product[];
  disc: Disc;
  accepted: string[];
  onToggle: (id: string) => void;
}

function ProductPageWidget({ trigger, offers, disc, accepted, onToggle }: PPGWProps) {
  const allProducts = [trigger, ...offers];

  // Compute running total: trigger always included, others if accepted
  const total = allProducts.reduce((sum, p) => {
    if (p.id === trigger.id) return sum + p.price;
    if (accepted.includes(p.id)) return sum + discountedPrice(p.price, disc);
    return sum;
  }, 0);

  const acceptedCount = accepted.length + 1; // trigger always included

  return (
    <div className="ppgw">
      <div className="ppgw-header">
        <div className="ppgw-title">Frequently bought together</div>
        <div className="ppgw-sub">Save {disc.value}% when added as a bundle</div>
      </div>

      {/* Thumbnails row */}
      <div className="ppgw-thumbs-row">
        {allProducts.map((p, i) => (
          <div key={p.id} style={{ display: "contents" }}>
            {i > 0 && <span className="ppgw-plus">+</span>}
            <div
              className="ppgw-thumb-wrap"
              style={{ opacity: p.id !== trigger.id && !accepted.includes(p.id) ? 0.4 : 1 }}
            >
              <Thumb product={p} size={72} />
              {p.id === trigger.id && (
                <span className="ppgw-this-badge">This item</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Item rows */}
      <div className="ppgw-items">
        {allProducts.map((p) => {
          const isTriger = p.id === trigger.id;
          const isChecked = isTriger || accepted.includes(p.id);
          const checkboxClass = isTriger
            ? "ppgw-checkbox checked-black"
            : isChecked
            ? "ppgw-checkbox checked-amoni"
            : "ppgw-checkbox";

          return (
            <div key={p.id} className="ppgw-item-row">
              <div
                className={checkboxClass}
                onClick={isTriger ? undefined : () => onToggle(p.id)}
                style={{ cursor: isTriger ? "default" : "pointer" }}
              >
                {isChecked && "✓"}
              </div>
              <span className={`ppgw-item-name${!isChecked ? " dim" : ""}`}>
                {p.name}
                <span style={{ color: "#bbb", fontWeight: 400 }}> · {p.variant}</span>
              </span>
              <div className="ppgw-item-prices">
                {isTriger ? (
                  <span className="ppgw-item-price-new">{fmt(p.price)}</span>
                ) : (
                  <>
                    <span className="ppgw-item-price-new">{fmt(discountedPrice(p.price, disc))}</span>
                    <span className="ppgw-item-price-old">{fmt(p.price)}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total + CTA */}
      <div className="ppgw-total-row">
        <span className="ppgw-total-label">Bundle total</span>
        <span className="ppgw-total-price">{fmt(total)}</span>
      </div>
      <button className="w-btn-primary">Add {acceptedCount} to cart</button>
    </div>
  );
}

// ─── CheckoutWidget ───────────────────────────────────────────────────────────
interface CKWProps {
  offer: Product;
  disc: Disc;
  state: "idle" | "accepted";
  onAccept: () => void;
}

function CheckoutWidget({ offer, disc, state, onAccept }: CKWProps) {
  const salePrice = discountedPrice(offer.price, disc);
  const orderItems = [
    { product: PRODUCTS[0], qty: 1 },
    { product: PRODUCTS[1], qty: 1 },
  ];
  const subtotal = orderItems.reduce((s, i) => s + i.product.price, 0);
  const total = state === "accepted" ? subtotal + salePrice : subtotal;

  return (
    <div className="ckw">
      <div className="ckw-header">
        <span className="ckw-wordmark">Lumen Skin</span>
        <span className="ckw-secure">🔒 Secure checkout</span>
      </div>

      <div className="ckw-body">
        {/* Left column */}
        <div className="ckw-left">
          <div className="ckw-express-row">
            <button className="ckw-express-btn shoppay">Shop Pay</button>
            <button className="ckw-express-btn paypal">PayPal</button>
            <button className="ckw-express-btn applepay">Apple Pay</button>
          </div>

          <div className="ckw-or-divider">OR</div>

          <div className="ckw-field">
            <div>
              <span className="ckw-field-label">Contact</span>
              <span className="ckw-field-value">customer@example.com</span>
            </div>
            <span style={{ fontSize: 11, color: "#888" }}>Change</span>
          </div>

          <div className="ckw-field">
            <div>
              <span className="ckw-field-label">Ship to</span>
              <span className="ckw-field-value">123 Main St, New York NY 10001</span>
            </div>
            <span style={{ fontSize: 11, color: "#888" }}>Change</span>
          </div>

          <div className="ckw-field">
            <div>
              <span className="ckw-field-label">Method</span>
              <span className="ckw-field-value">Standard shipping · Free</span>
            </div>
          </div>

          <div className="ckw-field">
            <div>
              <span className="ckw-field-label">Payment</span>
              <span className="ckw-field-value">Credit card ···· 4242</span>
            </div>
          </div>

          <button className="ckw-pay-btn">Pay now · {fmt(total)}</button>
        </div>

        {/* Right column */}
        <div className="ckw-right">
          {orderItems.map((item) => (
            <div key={item.product.id} className="ckw-order-item">
              <div className="ckw-item-qty-wrap">
                <Thumb product={item.product} size={44} />
                <span className="ckw-item-qty-badge">{item.qty}</span>
              </div>
              <div className="ckw-item-info">
                <div className="ckw-item-name">{item.product.name}</div>
                <div className="ckw-item-variant">{item.product.variant}</div>
              </div>
              <span className="ckw-item-price">{fmt(item.product.price)}</span>
            </div>
          ))}

          {/* Cross-sell block */}
          <div className="ckw-crosssell">
            <div className="ckw-crosssell-label">✦ Add &amp; save before you pay</div>
            <div className="ckw-crosssell-row">
              <Thumb product={offer} size={40} />
              <div className="ckw-crosssell-info">
                <div className="ckw-crosssell-name">{offer.name}</div>
                <div className="ckw-crosssell-prices">
                  <span className="ckw-crosssell-price-new">{fmt(salePrice)}</span>
                  <span className="ckw-crosssell-price-old">{fmt(offer.price)}</span>
                  <span className="ckw-crosssell-badge">{disc.value}% off</span>
                </div>
              </div>
            </div>
            <button
              className={`ckw-add-btn${state === "accepted" ? " added" : ""}`}
              onClick={state === "idle" ? onAccept : undefined}
            >
              {state === "accepted" ? "✓ Added" : "Add to order"}
            </button>
          </div>

          {/* Discount code */}
          <div className="ckw-discount-row">
            <input
              className="ckw-discount-input"
              placeholder="Discount code or gift card"
              readOnly
            />
            <button className="ckw-discount-apply">Apply</button>
          </div>

          {/* Totals */}
          <div className="ckw-totals">
            <div className="ckw-totals-row">
              <span>Subtotal</span>
              <span>{fmt(subtotal + (state === "accepted" ? salePrice : 0))}</span>
            </div>
            <div className="ckw-totals-row">
              <span>Shipping</span>
              <span style={{ color: "#22c55e" }}>Free</span>
            </div>
            <div className="ckw-totals-divider" />
            <div className="ckw-totals-row ckw-totals-total">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: string; url: string; bgColor: string }[] = [
  {
    id: "post-purchase",
    label: "Post-purchase",
    icon: "✦",
    url: "lumenskin.com/checkout/thank-you",
    bgColor: "#f4f1ee",
  },
  {
    id: "cart",
    label: "Cart drawer",
    icon: "🛒",
    url: "lumenskin.com/cart",
    bgColor: "#2a2a2e",
  },
  {
    id: "product",
    label: "Product page",
    icon: "🏷",
    url: "lumenskin.com/products/radiance-vitamin-c-serum",
    bgColor: "linear-gradient(180deg, #faf8f5 0%, #f0ece6 100%)",
  },
  {
    id: "checkout",
    label: "Checkout",
    icon: "🔒",
    url: "lumenskin.com/checkout",
    bgColor: "#eef0f1",
  },
];

const BANNER_TEXT: Record<Tab, string> = {
  "post-purchase":
    "Shown between order confirmation and the thank-you page. One-click accept charges the original payment method via Shopify's Post-Purchase API — no card re-entry.",
  cart: "A Theme App Extension block triggered by cart contents. Dismissible, and the dismissal is remembered for the session via localStorage.",
  product:
    'A "Frequently bought together" Theme App Extension block. Merchants position it in the theme editor — no hardcoded injection, zero layout shift.',
  checkout:
    "Checkout UI Extension in the order-summary sidebar (Shopify Plus / Pro plan). Skipped automatically for customers who already subscribe to the offered product.",
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StorefrontPreview() {
  const [tab, setTab] = useState<Tab>("post-purchase");
  const [ppStyle, setPpStyle] = useState<PPStyle>("classic");
  const [ppState, setPpState] = useState<State>("idle");
  const [cartState, setCartState] = useState<"idle" | "accepted">("idle");
  const [checkoutState, setCheckoutState] = useState<"idle" | "accepted">("idle");
  const [bundleAccepted, setBundleAccepted] = useState<string[]>([
    BUNDLE_CROSSSELLS[0].id,
  ]);

  function resetAll() {
    setPpState("idle");
    setCartState("idle");
    setCheckoutState("idle");
    setBundleAccepted([BUNDLE_CROSSSELLS[0].id]);
    setPpStyle("classic");
  }

  function toggleBundle(id: string) {
    setBundleAccepted((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <Page
      title="Storefront preview"
      subtitle="Exactly how your offers appear to shoppers. Interactive — try accepting an offer."
      primaryAction={
        <Button variant="secondary" icon={<ExternalIcon />} url="https://example.myshopify.com" target="_blank">
          Open live storefront
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* Main preview card */}
        <Card padding="0">
          {/* Tab bar */}
          <div className="sp-tab-bar">
            <div className="sp-tab-group">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`sp-tab-btn${tab === t.id ? " active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="sp-tab-actions">
              {tab === "post-purchase" && (
                <select
                  className="sp-style-select"
                  value={ppStyle}
                  onChange={(e) => setPpStyle(e.target.value as PPStyle)}
                >
                  <option value="classic">Classic</option>
                  <option value="spotlight">Spotlight</option>
                  <option value="compact">Compact</option>
                </select>
              )}
              {tab === "checkout" && (
                <span className="sp-plus-badge">Shopify Plus</span>
              )}
              <Button variant="tertiary" size="slim" onClick={resetAll}>
                Reset
              </Button>
            </div>
          </div>

          {/* Stage area */}
          <div
            className="sp-stage"
            style={{
              background: activeTab.bgColor,
            }}
          >
            {/* Faux browser bar */}
            <div className="sp-browser-bar">
              <div className="sp-browser-dots">
                <div className="sp-browser-dot" style={{ background: "#ff5f57" }} />
                <div className="sp-browser-dot" style={{ background: "#febc2e" }} />
                <div className="sp-browser-dot" style={{ background: "#28c840" }} />
              </div>
              <div className="sp-browser-url">{activeTab.url}</div>
            </div>

            {/* Widget content area */}
            <div className="sp-stage-content">
              {tab === "post-purchase" && (
                <PostPurchaseWidget
                  style={ppStyle}
                  offer={PP_OFFER}
                  disc={PP_DISC}
                  state={ppState}
                  onAccept={() => setPpState("accepted")}
                  onDecline={() => setPpState("declined")}
                />
              )}

              {tab === "cart" && (
                <CartDrawerWidget
                  offer={CART_OFFER}
                  disc={CART_DISC}
                  state={cartState}
                  onAccept={() => setCartState("accepted")}
                />
              )}

              {tab === "product" && (
                <ProductPageWidget
                  trigger={BUNDLE_TRIGGER}
                  offers={BUNDLE_CROSSSELLS}
                  disc={PP_DISC}
                  accepted={bundleAccepted}
                  onToggle={toggleBundle}
                />
              )}

              {tab === "checkout" && (
                <CheckoutWidget
                  offer={CHECKOUT_OFFER}
                  disc={CHECKOUT_DISC}
                  state={checkoutState}
                  onAccept={() => setCheckoutState("accepted")}
                />
              )}
            </div>
          </div>
        </Card>

        {/* Info banner */}
        <Banner tone="info">
          <Text as="p" variant="bodyMd">
            {BANNER_TEXT[tab]}
          </Text>
        </Banner>

        {/* Feature cards */}
        <div className="sp-feature-grid">
          <div className="sp-feature-card">
            <div className="sp-feature-icon">⚡</div>
            <div className="sp-feature-title">Zero layout shift</div>
            <div className="sp-feature-desc">
              Widgets reserve space and load async — no CLS, theme-agnostic.
            </div>
          </div>
          <div className="sp-feature-card">
            <div className="sp-feature-icon">🔒</div>
            <div className="sp-feature-title">One-click, no re-auth</div>
            <div className="sp-feature-desc">
              Post-purchase charges the original payment method via Shopify.
            </div>
          </div>
          <div className="sp-feature-card">
            <div className="sp-feature-icon">🏪</div>
            <div className="sp-feature-title">Theme app extension</div>
            <div className="sp-feature-desc">
              Merchants position blocks in the theme editor — no code injection.
            </div>
          </div>
        </div>
      </BlockStack>
    </Page>
  );
}

// Inline SVG icon for external link (Polaris doesn't export ExternalIcon directly in all versions)
function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
      <path d="M15 11v4.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H10V4.5H5.5A1.5 1.5 0 0 0 4 6v9a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-4h-1Zm-3-7v1h2.793l-6.147 6.146.708.708L15.5 5.707V8.5h1v-4.5H12Z" />
    </svg>
  );
}
