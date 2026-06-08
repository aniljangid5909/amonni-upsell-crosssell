import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export async function createFunnelDiscount(
  admin: AdminApiContext,
  funnelId: string,
  offerProductId: string,
  discountType: string,
  discountValue: number
): Promise<{ code: string; ruleId: string }> {
  if (discountType === "none" || discountValue <= 0) return { code: "", ruleId: "" };

  try {
    const valueType = discountType === "percent" ? "percentage" : "fixed_amount";
    const code = `AMONI-${funnelId.slice(-8).toUpperCase()}`;

    const ruleRes = await admin.rest.post({
      path: "price_rules",
      data: {
        price_rule: {
          title: code,
          target_type: "line_item",
          target_selection: "entitled",
          allocation_method: "each",
          value_type: valueType,
          value: `-${discountValue}`,
          customer_selection: "all",
          entitled_product_ids: [parseInt(offerProductId, 10)],
          starts_at: new Date().toISOString(),
        },
      },
    });

    const ruleBody = await ruleRes.json() as any;
    const ruleId = String(ruleBody?.price_rule?.id ?? "");
    if (!ruleId) return { code: "", ruleId: "" };

    await admin.rest.post({
      path: `price_rules/${ruleId}/discount_codes`,
      data: { discount_code: { code } },
    });

    return { code, ruleId };
  } catch (e) {
    console.error("createFunnelDiscount failed:", e);
    return { code: "", ruleId: "" };
  }
}

export async function deleteFunnelDiscount(
  admin: AdminApiContext,
  ruleId: string
): Promise<void> {
  if (!ruleId) return;
  try {
    await admin.rest.delete({ path: `price_rules/${ruleId}` });
  } catch {}
}
