import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  url.pathname = "/app/funnels";
  return redirect(url.toString());
};

export default function Index() {
  return null;
}
