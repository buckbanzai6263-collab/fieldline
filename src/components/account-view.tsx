import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { enableAlerts } from "@/lib/push-client";
import { roleLabel } from "@/lib/types";
import { useFieldStore, useMe } from "@/lib/store";

export function AccountView() {
  const me = useMe();
  const updateProfile = useFieldStore((s) => s.updateProfile);
  const [name, setName] = useState(me?.name ?? "");
  const [address, setAddress] = useState(me?.address ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertNote, setAlertNote] = useState("");

  if (!me) return null;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h2 className="font-display text-2xl tracking-wide">Account</h2>
        <p className="text-sm text-muted">
          {roleLabel(me.role)} · only you can change this
        </p>
      </div>
      <form
        className="space-y-3 rounded-xl border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin && pin !== confirm) {
            setNote("The new codes don’t match.");
            return;
          }
          setSaving(true);
          void updateProfile({ name, phone, email, address, pin }).then((result) => {
            setSaving(false);
            if (result === "taken") {
              setNote("That code is already in use.");
              return;
            }
            if (result === "bad") {
              setNote("Need a name. A new code must be 4 digits.");
              return;
            }
            setPin("");
            setConfirm("");
            setNote("Saved.");
          });
        }}
      >
        <label className="block text-xs text-muted">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          />
        </label>
        <label className="block text-xs text-muted">
          Address
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          />
        </label>
        <label className="block text-xs text-muted">
          Phone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          />
        </label>
        <label className="block text-xs text-muted">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg"
          />
        </label>
        <div className="border-t border-border pt-3">
          <p className="text-sm font-medium">Reset sign-in code</p>
          <p className="mb-2 text-xs text-muted">Leave blank to keep your current 4-digit code.</p>
          <div className="flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="New 4-digit code"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="Confirm code"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
            />
          </div>
        </div>
        {note && <p className={note === "Saved." ? "text-sm text-accent" : "text-sm text-danger"}>{note}</p>}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving" : "Save account"}
        </Button>
      </form>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="font-display text-xl tracking-wide">Add to Home Screen & Receive Alerts</h3>
        <p className="text-sm text-muted">
          Get a notice when someone texts you, even if Fieldline is closed. On iPhone or Android, add Fieldline to your home screen first, then open it from that icon.
        </p>
        <Link to="/setup/iphone" className="block text-sm text-accent">
          How to set up iPhone
        </Link>
        <Link to="/setup/android" className="block text-sm text-accent">
          How to set up Android
        </Link>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void enableAlerts().then((result) => {
              if (result === "on") setAlertNote("Alerts are on for this phone.");
              else if (result === "install") setAlertNote("Add Fieldline to your home screen, open it from the icon, then turn alerts on.");
              else if (result === "denied") setAlertNote("Alerts are blocked. Allow notifications for Fieldline in your phone settings.");
              else setAlertNote("Alerts didn’t turn on. Open Fieldline from your home screen and try again.");
            });
          }}
        >
          Turn on alerts
        </Button>
        {alertNote && <p className="text-sm text-muted">{alertNote}</p>}
      </section>
    </div>
  );
}
