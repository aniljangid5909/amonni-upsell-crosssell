import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This runs in the TOP window (not iframe) to complete OAuth.
  // authenticate.admin() will:
  // 1. Start OAuth if no session (redirects to accounts.shopify.com)
  // 2. Complete OAuth callback (stores session in DB, redirects to app)
  await authenticate.admin(request);
  return null;
};
