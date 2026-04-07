import { Link } from "react-router-dom";
import { Panel } from "@/components/Panel";
import { routes } from "@/lib/routes";

export function NotFoundPage() {
  return (
    <Panel title="Page not found" subtitle="The route you opened does not exist in this party pack.">
      <Link to={routes.landing} className="rounded-2xl bg-gold px-4 py-3 font-semibold text-ink">
        Return Home
      </Link>
    </Panel>
  );
}
