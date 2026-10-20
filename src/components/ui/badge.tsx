import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  children,
}: {
  className?: string;
  tone?: "muted" | "accent" | "ok" | "danger" | "urgent";
  children: React.ReactNode;
}) {
  const tones = {
    muted: "bg-surface text-muted border-border",
    accent: "bg-accent/15 text-accent border-accent/30",
    ok: "bg-ok/15 text-ok border-ok/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    urgent: "bg-accent text-accent-fg border-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
