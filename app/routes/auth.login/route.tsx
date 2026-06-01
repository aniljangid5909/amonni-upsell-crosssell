import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = { shop: "" };
  return json({ errors });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const data = await request.formData();
  const shop = String(data.get("shop"));
  if (!shop) return json({ errors: { shop: "Please enter a shop domain" } });
  return login(request);
};

export default function Auth() {
  const { errors } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const shopError = (actionData as any)?.errors?.shop || errors.shop;

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 400, width: "100%", padding: 32 }}>
        <h1 style={{ marginBottom: 24 }}>Amoni Upsell</h1>
        <Form method="post">
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Shop domain</label>
            <input name="shop" type="text" placeholder="your-store.myshopify.com"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14 }} />
            {shopError && <p style={{ color: "red", marginTop: 4, fontSize: 13 }}>{shopError}</p>}
          </div>
          <button type="submit" style={{ width: "100%", padding: "12px", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Install app
          </button>
        </Form>
      </div>
    </div>
  );
}
