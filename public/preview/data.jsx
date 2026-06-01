/* ============================================================
   Sample data — "Lumen Skin", a skincare/beauty D2C on Shopify.
   Subscription-first repeat-purchase brand.
   ============================================================ */

// Product catalog. tone = placeholder thumbnail color.
const PRODUCTS = [
  { id: "p1", name: "Radiance Vitamin C Serum", variant: "30ml", price: 48, tone: "#f0c9a8", tag: "Serum", sub: true },
  { id: "p2", name: "Gentle Gel Cleanser", variant: "150ml", price: 24, tone: "#cfe3d6", tag: "Cleanser", sub: true },
  { id: "p3", name: "Daily Mineral SPF 40", variant: "50ml", price: 32, tone: "#f6e0a6", tag: "SPF" },
  { id: "p4", name: "Overnight Repair Cream", variant: "50ml", price: 54, tone: "#e7d4f0", tag: "Moisturizer", sub: true },
  { id: "p5", name: "Hydra-Plump Hyaluronic", variant: "30ml", price: 42, tone: "#bfe0ef", tag: "Serum", sub: true },
  { id: "p6", name: "Resurfacing AHA Toner", variant: "120ml", price: 36, tone: "#f3cdd6", tag: "Toner" },
  { id: "p7", name: "Ceramide Barrier Balm", variant: "30ml", price: 38, tone: "#f0dcc4", tag: "Moisturizer" },
  { id: "p8", name: "Soft Foam Lip Mask", variant: "12ml", price: 18, tone: "#f4c4c0", tag: "Lip" },
  { id: "p9", name: "Detox Clay Mask", variant: "75ml", price: 28, tone: "#dcd2c4", tag: "Mask" },
  { id: "p10", name: "Refillable Serum Pod", variant: "30ml refill", price: 39, tone: "#cfd8e0", tag: "Refill", sub: true },
];

const productById = (id) => PRODUCTS.find((p) => p.id === id);

// Upsell / cross-sell funnels
const FUNNELS = [
  {
    id: "f1", name: "Serum → SPF cross-sell", status: "active", placement: "post-purchase",
    offerType: "cross-sell", trigger: ["p1"], offer: "p3", discount: { type: "percent", value: 15 },
    impressions: 4820, accepts: 612, revenue: 16646, aov: 12.4, ab: false,
    conditions: { minCart: 0, customerTag: "", skipSubscribed: true },
  },
  {
    id: "f2", name: "Cleanser refill bundle", status: "active", placement: "cart",
    offerType: "bundle", trigger: ["p2"], offer: "p10", discount: { type: "percent", value: 20 },
    impressions: 9140, accepts: 1043, revenue: 21288, aov: 8.1, ab: true,
    conditions: { minCart: 40, customerTag: "", skipSubscribed: true },
  },
  {
    id: "f3", name: "Upgrade to Overnight Repair", status: "active", placement: "post-purchase",
    offerType: "upsell", trigger: ["p7"], offer: "p4", discount: { type: "fixed", value: 8 },
    impressions: 2610, accepts: 287, revenue: 13202, aov: 17.0, ab: false,
    conditions: { minCart: 0, customerTag: "VIP", skipSubscribed: false },
  },
  {
    id: "f4", name: "Add Hyaluronic to routine", status: "active", placement: "product",
    offerType: "cross-sell", trigger: ["p1", "p2"], offer: "p5", discount: { type: "none", value: 0 },
    impressions: 12830, accepts: 906, revenue: 38052, aov: 6.1, ab: false,
    conditions: { minCart: 0, customerTag: "", skipSubscribed: true },
  },
  {
    id: "f5", name: "Lip Mask impulse add-on", status: "paused", placement: "cart",
    offerType: "cross-sell", trigger: ["p4", "p7"], offer: "p8", discount: { type: "percent", value: 25 },
    impressions: 5470, accepts: 738, revenue: 9963, aov: 3.4, ab: false,
    conditions: { minCart: 0, customerTag: "", skipSubscribed: false },
  },
  {
    id: "f6", name: "Toner → Barrier Balm (Plus checkout)", status: "draft", placement: "checkout",
    offerType: "cross-sell", trigger: ["p6"], offer: "p7", discount: { type: "percent", value: 10 },
    impressions: 0, accepts: 0, revenue: 0, aov: 0, ab: false,
    conditions: { minCart: 0, customerTag: "", skipSubscribed: true },
  },
];

const PLACEMENT_META = {
  "post-purchase": { label: "Post-purchase", icon: "sparkle", tone: "amoni" },
  "cart": { label: "Cart drawer", icon: "cart", tone: "info" },
  "product": { label: "Product page", icon: "tag", tone: "neutral" },
  "checkout": { label: "Checkout", icon: "lock", tone: "attention" },
};
const OFFERTYPE_META = {
  "upsell": { label: "Upsell", desc: "Trade up to a premium version" },
  "cross-sell": { label: "Cross-sell", desc: "Add a complementary product" },
  "bundle": { label: "Bundle discount", desc: "Buy together and save" },
};

// 30-day daily series (revenue attributed)
const SERIES_30D = [
  820, 910, 760, 1020, 1180, 990, 870, 1240, 1390, 1150, 1080, 1320, 1460, 1280,
  1190, 1410, 1530, 1370, 1290, 1480, 1620, 1550, 1440, 1610, 1720, 1680, 1590, 1750, 1840, 1910,
];
const SERIES_PREV = [
  640, 700, 690, 720, 810, 760, 700, 880, 920, 840, 800, 910, 980, 900,
  860, 950, 1010, 940, 900, 1000, 1080, 1040, 980, 1060, 1120, 1090, 1040, 1130, 1180, 1220,
];

// Funnel-level conversion funnel (for dashboard)
const CONV_STEPS = [
  { label: "Impressions", value: 34870 },
  { label: "Engaged", value: 8120 },
  { label: "Accepts", value: 3586 },
  { label: "Completed", value: 3402 },
];

// AI co-purchase recommendations: A bought-with B
const AI_RECS = [
  { a: "p1", b: "p3", count: 1284, lift: 3.2, conf: 0.71 },
  { a: "p1", b: "p5", count: 1102, lift: 2.8, conf: 0.66 },
  { a: "p2", b: "p10", count: 980, lift: 4.1, conf: 0.78 },
  { a: "p4", b: "p8", count: 612, lift: 1.9, conf: 0.52 },
  { a: "p6", b: "p7", count: 540, lift: 2.4, conf: 0.61 },
  { a: "p5", b: "p3", count: 498, lift: 1.7, conf: 0.49 },
];

// A/B test sample (for funnel f2)
const AB_TEST = {
  funnel: "f2",
  variantA: { label: "20% off refill", offer: "p10", discount: "20% off", impressions: 4570, accepts: 498, rate: 10.9, revenue: 10458 },
  variantB: { label: "Buy 2 get 1 free", offer: "p10", discount: "Bundle", impressions: 4570, accepts: 545, rate: 11.9, revenue: 10830 },
  daysRunning: 12, confidence: 0.93,
};

const BILLING_PLANS = [
  {
    id: "free", name: "Free", price: 0, current: false,
    tagline: "Try post-purchase upsells",
    features: ["1 active upsell funnel", "Post-purchase placement only", "Up to 50 orders / month", "Amoni branding on widget"],
    missing: ["All placements", "Analytics", "A/B testing", "AI recommendations"],
  },
  {
    id: "growth", name: "Growth", price: 14.99, current: true, popular: true,
    tagline: "Scale across every touchpoint",
    features: ["10 active funnels", "All placements: product, cart, post-purchase", "Up to 500 orders / month", "No Amoni branding", "Basic analytics"],
    missing: ["Checkout blocks (Plus)", "AI recommendations", "A/B testing"],
  },
  {
    id: "pro", name: "Pro", price: 29.99, current: false,
    tagline: "Maximum lift for high-volume brands",
    features: ["Unlimited funnels", "All placements + checkout blocks (Plus)", "Unlimited orders", "AI product recommendations", "A/B testing (2 variants)", "Advanced analytics", "Priority support"],
    missing: [],
  },
];

const fmtMoney = (n, dp = 0) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtNum = (n) => Number(n).toLocaleString("en-US");
const acceptRate = (f) => f.impressions ? (f.accepts / f.impressions * 100) : 0;

Object.assign(window, {
  PRODUCTS, productById, FUNNELS, PLACEMENT_META, OFFERTYPE_META,
  SERIES_30D, SERIES_PREV, CONV_STEPS, AI_RECS, AB_TEST, BILLING_PLANS,
  fmtMoney, fmtNum, acceptRate,
});
