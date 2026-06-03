import type { LoaderFunctionArgs, HeadersFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { addDocumentResponseHeaders } from "./shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const headers = addDocumentResponseHeaders(request, new Headers());
  return json(
    { apiKey: process.env.SHOPIFY_API_KEY ?? "" },
    { headers }
  );
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  return loaderHeaders;
};

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}: ${error.data}`
    : error instanceof Error
    ? `${error.name}: ${error.message}\n${error.stack}`
    : String(error);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Error</title>
      </head>
      <body style={{ fontFamily: "monospace", padding: "20px" }}>
        <h2>Debug Error</h2>
        <pre style={{ background: "#fee", padding: "16px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {message}
        </pre>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
