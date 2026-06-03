import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../shopify.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  return new Response(null, { status: 204, headers: CORS });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const body = await request.json();
  const { funnelId, shop, eventType, orderId, revenue } = body;

  if (!funnelId || !shop || !eventType) {
    return json({ error: "Missing required fields" }, { status: 400, headers: CORS });
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

  return json({ ok: true }, { headers: CORS });
};
