export interface Product {
  id: string;
  name: string;
  variant: string;
  price: number;
  tone: string;
}

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Radiance Vitamin C Serum", variant: "30ml", price: 48, tone: "#f0c9a8" },
  { id: "p2", name: "Gentle Gel Cleanser", variant: "150ml", price: 24, tone: "#cfe3d6" },
  { id: "p3", name: "Daily Mineral SPF 40", variant: "50ml", price: 32, tone: "#f6e0a6" },
  { id: "p4", name: "Overnight Repair Cream", variant: "50ml", price: 54, tone: "#e7d4f0" },
  { id: "p5", name: "Hydra-Plump Hyaluronic", variant: "30ml", price: 42, tone: "#bfe0ef" },
  { id: "p7", name: "Ceramide Barrier Balm", variant: "30ml", price: 38, tone: "#f0dcc4" },
];

// Convenience references
export const PP_OFFER = PRODUCTS[2];   // Daily Mineral SPF 40
export const PP_TRIGGER = PRODUCTS[0]; // Radiance Vitamin C Serum
export const PP_DISC = { type: "percent" as const, value: 15 };

export const CART_OFFER = PRODUCTS[4]; // Hydra-Plump Hyaluronic
export const CART_DISC = { type: "percent" as const, value: 20 };

export const CHECKOUT_OFFER = PRODUCTS[5]; // Ceramide Barrier Balm
export const CHECKOUT_DISC = { type: "percent" as const, value: 10 };

export const BUNDLE_TRIGGER = PRODUCTS[0];  // Vitamin C Serum
export const BUNDLE_CROSSSELLS = [PRODUCTS[2], PRODUCTS[4]]; // SPF 40, Hyaluronic
