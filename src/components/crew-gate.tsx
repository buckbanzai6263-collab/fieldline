import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFieldStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function CrewGate() {
  const unlock = useFieldStore((s) => s.unlock);
  const register = useFieldStore((s) => s.register);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<"bad" | "pending" | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"worker" | "admin">("worker");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const push = (d: string) => {
    if (busy) return;
    if (d === "del") {
      setPin((p) => p.slice(0, -1));
      setError(null);
      return;
    }
    if (!d || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === 4) {
      setBusy(true);
      void unlock(next).then((result) => {
        if (result === "ok") return;
        setError(result === "pending" ? "pending" : "bad");
        setTimeout(() => {
          setPin("");
          setBusy(false);
          if (result !== "pending") setError(null);
        }, result === "pending" ? 2400 : 600);
      });
    }
  };

  if (creating) {
    return (
      <main className="relative z-20 mx-auto flex min-h-dvh max-w-sm flex-col px-5 py-10">
        <p className="font-display text-sm tracking-[0.28em] text-accent">LEGACY PROTECTED SERVICES</p>
        <h1 className="mt-3 font-display text-4xl leading-none tracking-tight text-fg">Create account</h1>
        <p className="mt-3 text-sm text-muted">
          Field Tech accounts can sign in right away. Admin accounts wait until they are approved.
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (code !== confirm) {
              setNote("The codes don’t match.");
              return;
            }
            setSaving(true);
            void register({ name, phone, address, role, pin: code }).then((result) => {
              setSaving(false);
              if (result === "taken") {
                setNote("That name or code is already in use.");
                return;
              }
              if (result === "bad") {
                setNote("Need a name and a 4-digit code.");
                return;
              }
              setCreating(false);
              setName("");
              setAddress("");
              setPhone("");
              setCode("");
              setConfirm("");
              setRole("worker");
              setNote("");
              setError(result === "pending" ? "pending" : null);
              if (result === "ok") setPin("");
            });
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="Phone"
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "worker" | "admin")}
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="worker">Field Tech</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="4-digit code"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm tabular-nums"
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="Confirm code"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm tabular-nums"
            />
          </div>
          {note && <p className="text-sm text-danger">{note}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving" : "Create account"}
          </Button>
          <button type="button" className="h-11 w-full text-sm text-muted" onClick={() => setCreating(false)}>
            Back to sign in
          </button>
        </form>
      </main>
    );
  }

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
              error === "bad" && "border-danger bg-danger",
            )}
          />
        ))}
      </div>
      {error === "bad" && <p className="mt-3 text-center text-sm text-danger">Wrong code</p>}
      {error === "pending" && (
        <p className="mt-3 text-center text-sm text-accent">Waiting for an admin to approve this account.</p>
      )}

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
      <button type="button" className="mt-6 text-sm text-accent" onClick={() => setCreating(true)}>
        Create account
      </button>
    </main>
  );
}
