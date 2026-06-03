import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Link } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";

function exitIframeResponse(location: string) {
  return new Response(
    `<!DOCTYPE html><html><head><script>
      var url = ${JSON.stringify(location)};
      if (window.top && window.top !== window) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    </script></head><body>Redirecting...</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 302) {
        const location = error.headers.get("Location") ?? "";
        return exitIframeResponse(location);
      }
      throw error;
    }
    throw error;
  }
  return json({ apiKey: process.env.SHOPIFY_API_KEY ?? "" });
};

export default function AppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider i18n={enTranslations}>
      <ui-nav-menu>
        <Link to="/app/funnels" rel="home">Funnels</Link>
        <Link to="/app/funnels/new">Create funnel</Link>
        <Link to="/app/storefront-preview">Storefront preview</Link>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}
