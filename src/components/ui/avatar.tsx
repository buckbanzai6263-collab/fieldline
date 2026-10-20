import { cn } from "@/lib/utils";

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-fg ring-1 ring-border",
        className,
      )}
    >
      {initials}
    </span>
  );
}
