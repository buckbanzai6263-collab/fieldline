import { useState } from "react";
import { useFieldStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function CrewGate() {
  const unlock = useFieldStore((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const push = (d: string) => {
    if (busy) return;
    if (d === "del") {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (!d || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setBusy(true);
      void unlock(next).then((ok) => {
        if (!ok) {
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
            setBusy(false);
          }, 600);
        }
      });
    }
  };

  return (
    <main className="relative z-20 mx-auto flex min-h-dvh max-w-sm flex-col px-5 py-10">
      <p className="font-display text-sm tracking-[0.28em] text-accent">LEGACY PROTECTED SERVICES</p>
      <h1 className="mt-3 font-display text-6xl leading-none tracking-tight text-fg">FIELDLINE</h1>
      <p className="mt-3 text-muted">Enter your 4-digit code. This board is live for the whole crew.</p>

      <div className="mt-8 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "size-4 rounded-full border",
              pin.length > i ? "border-accent bg-accent" : "border-border",
              error && "border-danger bg-danger",
            )}
          />
        ))}
      </div>
      {error && <p className="mt-3 text-center text-sm text-danger">Wrong code</p>}

      <div className="relative z-20 mt-8 grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={`pad-${i}`} />
          ) : (
            <button
              key={`pad-${i}`}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                push(k);
              }}
              className="flex h-16 touch-manipulation items-center justify-center rounded-xl border border-border bg-card font-display text-2xl tracking-wide text-fg select-none hover:border-accent active:bg-accent active:text-accent-fg"
              aria-label={k === "del" ? "Delete" : k}
            >
              {k === "del" ? "⌫" : k}
            </button>
          ),
        )}
      </div>
    </main>
  );
}
