import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await request.json();
  const { funnelId, shop, eventType, orderId, revenue } = body;

  if (!funnelId || !shop || !eventType) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  await prisma.funnelEvent.create({
    data: {
      funnelId,
      shop,
      eventType,
      orderId: orderId || null,
      revenue: revenue || null,
    },
  });

  return json({ ok: true });
};
