import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Link } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? "";

  try {
    await authenticate.admin(request);
  } catch (error) {
    // If auth throws a redirect, we need to break out of the Shopify iframe
    // so the OAuth can complete in the top-level window
    if (error instanceof Response && error.status === 302) {
      const location = error.headers.get("Location") ?? "";
      return new Response(
        `<!DOCTYPE html><html><head>
          <script>
            var url = ${JSON.stringify(location)};
            if (window.top && window.top !== window) {
              window.top.location.href = url;
            } else {
              window.location.href = url;
            }
          </script>
        </head><body>Redirecting...</body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    }
    throw error;
  }

  return json({ apiKey: process.env.SHOPIFY_API_KEY ?? "", shop });
};

export default function AppLayout() {
  const { shop } = useLoaderData<typeof loader>();
  const qs = shop ? `?shop=${encodeURIComponent(shop)}` : "";

  return (
    <AppProvider i18n={enTranslations}>
      <ui-nav-menu>
        <Link to={`/app/funnels${qs}`} rel="home">Funnels</Link>
        <Link to={`/app/funnels/new${qs}`}>Create funnel</Link>
        <Link to={`/app/storefront-preview${qs}`}>Storefront preview</Link>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}
