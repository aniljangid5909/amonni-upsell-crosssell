import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // This route handles all /auth/* paths.
  // authenticate.admin() will either complete the OAuth callback (storing the session)
  // and redirect to the embedded app, or throw a 302 redirect to start OAuth.
  // We don't need the exit-iframe pattern here because:
  // - OAuth callback (/auth/callback) runs in the top window (not iframe)
  // - The library redirects back to Shopify Admin after callback completes
  await authenticate.admin(request);
  return null;
};
