import { Outlet, NavLink } from "react-router-dom";
import { routes } from "@/lib/routes";

export function ShellLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-grain">
      <div className="noise-overlay absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col safe-pad">
        <header className="mb-8 flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <NavLink
            to={routes.landing}
            className="inline-flex items-center gap-3 text-surf transition hover:text-gold"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-ink shadow-glow">
              BP
            </span>
            <span>
              <span className="block font-display text-2xl leading-none">Boggle Party</span>
              <span className="text-sm text-mist/70">
                TV-sized rounds. Phone-sized controls.
              </span>
            </span>
          </NavLink>
          <NavLink
            to={routes.room}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-surf transition hover:bg-white/[0.08]"
          >
            Create Or Join Room
          </NavLink>
        </header>
        <main className="flex-1 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
