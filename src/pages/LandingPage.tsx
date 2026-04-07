import { Link } from "react-router-dom";
import { Panel } from "@/components/Panel";
import { routes } from "@/lib/routes";

export function LandingPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <Panel
        className="relative overflow-hidden p-8 md:p-12"
        title="Turn your TV into a party-sized word hunt."
        subtitle="Boggle Party keeps the shared board on the big screen while every phone becomes a fast, touch-first controller."
      >
        <div className="absolute inset-0 bg-grain opacity-40" />
        <div className="relative space-y-8">
          <div className="max-w-3xl space-y-4">
            <p className="text-lg leading-8 text-mist/80">
              Static frontend on GitHub Pages, Supabase for auth, realtime, scoring, and room logic,
              and a layout tuned for living-room casting, mirroring, and AirPlay setups.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={routes.room}
              className="rounded-2xl bg-gold px-5 py-3 font-semibold text-ink"
            >
              Start Or Join A Room
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Big-Screen Display",
                copy: "Room QR code, player states, timer, board, and round-by-round standings."
              },
              {
                title: "Phone Controllers",
                copy: "Touch-first letter tracing, host controls, reconnect-safe identity, and word banking."
              },
              {
                title: "Supabase Trusted Scoring",
                copy: "Server-side dictionary and path validation with host failover and cumulative standings."
              }
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"
              >
                <p className="font-display text-2xl text-surf">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-mist/70">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="Flow" subtitle="Built for living-room sessions with repeated rounds.">
        <div className="space-y-3">
          {[
            "Create or join a room from any browser.",
            "Open the TV display route on a laptop or cast it to the big screen.",
            "Phones scan the QR code to join as controllers.",
            "The first joined player becomes host automatically.",
            "Host starts each round from their phone.",
            "Supabase scores the round and publishes the summary.",
            "Host starts the next round after results are ready."
          ].map((step, index) => (
            <div
              key={step}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/15 font-semibold text-coral">
                {index + 1}
              </div>
              <p className="pt-1 text-mist/80">{step}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
