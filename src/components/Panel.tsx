import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends PropsWithChildren {
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function Panel({
  children,
  className,
  title,
  subtitle,
  headerRight
}: PanelProps) {
  return (
    <section
      className={cn(
        "glass-panel rounded-[2rem] border border-white/10 p-5 shadow-glow",
        className
      )}
    >
      {(title || subtitle || headerRight) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="font-display text-xl text-surf sm:text-2xl">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="mt-1 text-sm text-mist/75">{subtitle}</p>
            ) : null}
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </section>
  );
}

