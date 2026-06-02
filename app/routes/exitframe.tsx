import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirectUri") || "/";
  return json({ redirectUri });
};

export default function ExitFrame() {
  const { redirectUri } = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.top && window.top !== window) {
                window.top.location.href = ${JSON.stringify(redirectUri)};
              } else {
                window.location.href = ${JSON.stringify(redirectUri)};
              }
            `,
          }}
        />
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  );
}
