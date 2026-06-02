import { redirect } from "@remix-run/node";

export const loader = async () => {
  return redirect("/app/funnels");
};

export default function AppIndex() {
  return null;
}
