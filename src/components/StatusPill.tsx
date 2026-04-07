import { cn, titleCaseStatus } from "@/lib/utils";

const toneMap: Record<string, string> = {
  lobby: "bg-teal/15 text-teal ring-teal/35",
  countdown: "bg-gold/15 text-gold ring-gold/35",
  active: "bg-coral/20 text-coral ring-coral/35",
  scoring: "bg-mist/15 text-mist ring-mist/25",
  results: "bg-mint/15 text-mint ring-mint/30",
  ended: "bg-white/10 text-white/70 ring-white/15",
  expired: "bg-white/10 text-white/70 ring-white/15",
  valid: "bg-mint/15 text-mint ring-mint/25",
  duplicate_global: "bg-gold/15 text-gold ring-gold/25",
  duplicate_self: "bg-gold/15 text-gold ring-gold/25",
  invalid_dictionary: "bg-coral/15 text-coral ring-coral/25",
  invalid_path: "bg-coral/15 text-coral ring-coral/25",
  too_short: "bg-coral/15 text-coral ring-coral/25"
};

export function StatusPill({
  status,
  label,
  className
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1",
        toneMap[status] ?? "bg-white/10 text-white ring-white/15",
        className
      )}
    >
      {label ?? titleCaseStatus(status)}
    </span>
  );
}

