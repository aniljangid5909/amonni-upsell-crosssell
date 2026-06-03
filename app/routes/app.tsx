import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
  } catch (error) {
    if (error instanceof Response && error.status === 302) {
      const location = error.headers.get("Location") ?? "";
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
    throw error;
  }
  return json({ apiKey: process.env.SHOPIFY_API_KEY ?? "" });
};

export default function AppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider i18n={enTranslations}>
      <ui-nav-menu>
        <a href="/app" rel="home">Funnels</a>
        <a href="/app/funnels/new">Create funnel</a>
        <a href="/app/storefront-preview">Storefront preview</a>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}
