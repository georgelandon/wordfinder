import { matchPath, NavLink, Outlet, useLocation } from "react-router-dom";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function ShellLayout() {
  const location = useLocation();
  const isControllerRoute = Boolean(matchPath("/controller/:roomCode", location.pathname));

  return (
    <div className="relative min-h-screen overflow-hidden bg-grain">
      <div className="noise-overlay absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col safe-pad">
        <header
          className={cn(
            "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
            isControllerRoute ? "mb-4 pt-2 sm:mb-5" : "mb-8 pt-4"
          )}
        >
          <NavLink
            to={routes.landing}
            className="inline-flex items-center gap-3 text-surf transition hover:text-gold"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-ink shadow-glow">
              BP
            </span>
            <span>
              <span className="block font-display text-2xl leading-none">Boggle Party</span>
              <span
                className={cn(
                  "text-sm text-mist/70",
                  isControllerRoute && "hidden sm:block"
                )}
              >
                TV-sized rounds. Phone-sized controls.
              </span>
            </span>
          </NavLink>
          <NavLink
            to={routes.room}
            className={cn(
              "inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-surf transition hover:bg-white/[0.08]",
              isControllerRoute && "self-start px-3 py-1.5 text-xs sm:self-auto sm:px-4 sm:py-2 sm:text-sm"
            )}
          >
            Create Or Join Room
          </NavLink>
        </header>
        <main className={cn("flex-1", isControllerRoute ? "pb-5" : "pb-10")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
