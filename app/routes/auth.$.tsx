import type { LoaderFunctionArgs } from "@remix-run/node";
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
  return null;
};
