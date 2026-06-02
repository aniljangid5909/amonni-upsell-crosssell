import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY ?? "" });
};

export default function AppLayout() {
  return (
    <AppProvider i18n={enTranslations}>
      <NavMenu>
        <a href="/app" rel="home">Funnels</a>
        <a href="/app/funnels/new">Create funnel</a>
        <a href="/app/storefront-preview">Storefront preview</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}
