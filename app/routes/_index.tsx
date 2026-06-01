import { redirect } from "@remix-run/node";

export const loader = async () => {
  return redirect("/app/storefront-preview");
};

export default function Index() {
  return null;
}
