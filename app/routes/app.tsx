import type { LoaderFunctionArgs, ShouldRevalidateFunction } from "@remix-run/node";
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

// Don't re-run authenticate.admin on every child navigation — only on initial load
export const shouldRevalidate: ShouldRevalidateFunction = () => false;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  let shop = url.searchParams.get("shop") ?? "";
  const host = url.searchParams.get("host") ?? "";

  try {
    const { session } = await authenticate.admin(request);
    shop = session.shop;
  } catch (error) {
    if (error instanceof Response && error.status === 302) {
      return exitIframe(error.headers.get("Location") ?? "/");
    }
    const authUrl = `${process.env.SHOPIFY_APP_URL || ""}/auth?shop=${encodeURIComponent(shop)}`;
    return exitIframe(authUrl);
  }

  return json({ apiKey: process.env.SHOPIFY_API_KEY ?? "", shop, host });
};

export default function AppLayout() {
  const { shop, host } = useLoaderData<typeof loader>();
  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);
  const qs = params.toString() ? `?${params.toString()}` : "";

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
