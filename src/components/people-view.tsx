import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AssignForm } from "@/components/assign-form";
import { isAdmin, isMasterAdmin, isOnTask, roleLabel, type Employee, type Role } from "@/lib/types";
import { openShift, useFieldStore } from "@/lib/store";

export function PeopleView() {
  const employees = useFieldStore((s) => s.employees);
  const me = useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId));
  const masterAdmin = isMasterAdmin(me?.id);
  const admin = isAdmin(me?.role) || masterAdmin;
  const tasks = useFieldStore((s) => s.tasks);
  const entries = useFieldStore((s) => s.timeEntries);
  const addEmployee = useFieldStore((s) => s.addEmployee);
  const removeEmployee = useFieldStore((s) => s.removeEmployee);
  const approveEmployee = useFieldStore((s) => s.approveEmployee);
  const clockIn = useFieldStore((s) => s.clockInEmployee);
  const clockOut = useFieldStore((s) => s.clockOutEmployee);
  const adminUpdateEmployee = useFieldStore((s) => s.adminUpdateEmployee);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [trade, setTrade] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Crew</h2>
          <p className="text-sm text-muted">
            {admin ? "Edit anyone’s name, address, phone, role, or sign-in code." : "Who’s on the crew."}
          </p>
        </div>
        {admin && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
            Add
          </Button>
          <Button size="sm" onClick={() => setOpen((v) => !v)}>
            Add Job
          </Button>
        </div>
        )}
      </div>
      {adding && (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setNote("Need a name.");
              return;
            }
            if (!/^\d{4}$/.test(pin)) {
              setNote("The code must be 4 digits.");
              return;
            }
            if (pin !== confirmPin) {
              setNote("The codes don’t match.");
              return;
            }
            void addEmployee({ name, address, phone, email, trade, role, pin }).then((result) => {
              if (result === "taken") {
                setNote("That code is already in use.");
                return;
              }
              if (result === "reserved") {
                setNote("2369 is the master code. Pick a different code.");
                return;
              }
              if (result === "bad") {
                setNote("Need a name and a 4-digit code.");
                return;
              }
              setName("");
              setAddress("");
              setPhone("");
              setEmail("");
              setTrade("");
              setPin("");
              setConfirmPin("");
              setRole("worker");
              setNote("");
              setAdding(false);
            });
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="Phone"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            placeholder="Email"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          />
          <input
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            placeholder="Trade — HVAC, plumbing, lead"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          >
            <option value="worker">Field Tech</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="4-digit code"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
            />
            <input
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="Confirm code"
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
            />
          </div>
          {note && <p className="text-sm text-danger">{note}</p>}
          <Button type="submit" className="w-full">
            Add
          </Button>
        </form>
      )}
      {open && (
        <div className="rounded-xl border border-border bg-card p-4">
          <AssignForm onDone={() => setOpen(false)} />
        </div>
      )}
      {editId && (
        <EditAccount
          key={editId}
          employee={employees.find((e) => e.id === editId) ?? null}
          onClose={() => setEditId(null)}
          onSave={adminUpdateEmployee}
        />
      )}
      <ul className="space-y-2">
        {employees
          .filter((e) => masterAdmin || !isMasterAdmin(e.id))
          .map((e) => {
          const on = !!openShift(e.id, entries);
          const openJobs = tasks.filter((t) => isOnTask(t, e.id) && t.status !== "done").length;
          const pending = e.status === "pending";
          const protectedAdmin = isMasterAdmin(e.id);
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
              <Avatar initials={e.initials} className="size-11 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-muted">
                  {e.trade || "Field"} · {roleLabel(e.role)}
                  {pending ? " · waiting for approval" : ""}
                  {admin && !protectedAdmin && e.pin ? <span className="tabular-nums"> · {e.pin}</span> : null}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {admin ? (
                  on ? (
                    <button
                      type="button"
                      onClick={() => clockOut(e.id)}
                      className="inline-flex items-center rounded-full border border-ok/30 bg-ok/15 px-2 py-0.5 text-xs font-medium tracking-wide text-ok"
                    >
                      Clock Out
                    </button>
                  ) : (
                    <button type="button" onClick={() => clockIn(e.id)} className="text-xs text-muted">
                      Clock In
                    </button>
                  )
                ) : (
                  <Badge tone={on ? "ok" : "muted"}>{on ? "On clock" : "Off"}</Badge>
                )}
                <p className="text-xs text-subtle">
                  {openJobs} {openJobs === 1 ? "Job Open" : "Jobs Open"}
                </p>
                {admin && (
                  <button type="button" className="text-xs text-accent" onClick={() => setEditId(e.id)}>
                    Edit account
                  </button>
                )}
                {masterAdmin && pending && (
                  <button type="button" className="text-xs text-accent" onClick={() => approveEmployee(e.id)}>
                    Approve
                  </button>
                )}
                {admin && !protectedAdmin && e.id !== me?.id &&
                  (confirmId === e.id ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-danger"
                      onClick={() => {
                        removeEmployee(e.id);
                        setConfirmId(null);
                      }}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button type="button" className="text-xs text-danger" onClick={() => setConfirmId(e.id)}>
                      Delete
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EditAccount({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSave: (input: {
    employeeId: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    trade: string;
    role: Role;
    pin: string;
  }) => Promise<"ok" | "bad" | "taken">;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [trade, setTrade] = useState(employee?.trade ?? "");
  const [role, setRole] = useState<Role>(employee?.role === "admin" ? "admin" : "worker");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const lockedRole = isMasterAdmin(employee?.id);

  if (!employee) return null;

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if ((pin || confirm) && (pin !== confirm || !/^\d{4}$/.test(pin))) {
          setNote("To change the code, enter the same 4 digits in both fields. Leave both blank to keep the current code.");
          return;
        }
        setSaving(true);
        void onSave({ employeeId: employee.id, name, phone, email, address, trade, role, pin }).then((result) => {
          setSaving(false);
          if (result === "taken") {
            setNote("That name or code is already in use.");
            return;
          }
          if (result === "bad") {
            setNote("Need a name. A new code must be 4 digits.");
            return;
          }
          onClose();
        });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl tracking-wide">Edit {employee.name}</h3>
        <button type="button" className="text-sm text-muted" onClick={onClose}>
          Close
        </button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" />
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Phone" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="Email" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" />
      <input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="Trade" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm" />
      {lockedRole ? (
        <p className="text-sm text-muted">Master admin. This role stays Admin.</p>
      ) : (
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm">
          <option value="worker">Field Tech</option>
          <option value="admin">Admin</option>
        </select>
      )}
      <div className="flex gap-2">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="New code, or leave blank"
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
        />
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="Confirm new code"
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
        />
      </div>
      <p className="text-xs text-muted">Leave both code fields blank to keep the current sign-in code.</p>
      {note && <p className="text-sm text-danger">{note}</p>}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving" : "Save account"}
      </Button>
    </form>
  );
}
