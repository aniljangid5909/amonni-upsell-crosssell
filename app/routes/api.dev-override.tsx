import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";

// Public endpoint — no Shopify auth required
// Only active when DISABLE_DEV_OVERRIDE !== "true"
export const action = async ({ request }: ActionFunctionArgs) => {
  if (process.env.DISABLE_DEV_OVERRIDE === "true") {
    return json({ ok: false, error: "Disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) || {};
  const { shop, plan } = body as { shop: string; plan: string };

  if (!shop || !["starter", "growth", "pro"].includes(plan)) {
    return json({ ok: false, error: "Invalid params" }, { status: 400 });
  }

  try {
    await prisma.session.upsert({
      where: { id: `__dev_plan_${shop}` },
      create: { id: `__dev_plan_${shop}`, shop, state: plan, isOnline: false },
      update: { state: plan },
    });
    return json({ ok: true, plan });
  } catch (err: any) {
    return json({ ok: false, error: err.message }, { status: 500 });
  }
};

export const loader = () => json({ ok: false }, { status: 405 });
