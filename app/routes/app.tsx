import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Link } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";

function exitIframe(url: string) {
  return new Response(
    `<!DOCTYPE html><html><head>
      <script>
        var u = ${JSON.stringify(url)};
        if (window.top && window.top !== window) { window.top.location.href = u; }
        else { window.location.href = u; }
      </script>
    </head><body>Redirecting...</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") ?? "";

  try {
    const { session } = await authenticate.admin(request);
    shop = session.shop; // always use session shop, not just URL param
  } catch (error) {
    if (error instanceof Response && error.status === 302) {
      return exitIframe(error.headers.get("Location") ?? "/");
    }
    const authUrl = `${process.env.SHOPIFY_APP_URL || ""}/auth?shop=${encodeURIComponent(shop)}`;
    return exitIframe(authUrl);
  }

  return json({ apiKey: process.env.SHOPIFY_API_KEY ?? "", shop });
};

export default function AppLayout() {
  const { shop } = useLoaderData<typeof loader>();
  const qs = shop ? `?shop=${encodeURIComponent(shop)}` : "";

  return (
    <AppProvider i18n={enTranslations}>
      <ui-nav-menu>
        <a href={`/app/funnels${qs}`} rel="home">Funnels</a>
        <a href={`/app/funnels/new${qs}`}>Create funnel</a>
        <a href={`/app/storefront-preview${qs}`}>Storefront preview</a>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}
