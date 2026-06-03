import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Link } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
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
