import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AssignForm } from "@/components/assign-form";
import { OWNER_ID } from "@/lib/seed";
import { isOnTask, type Role } from "@/lib/types";
import { openShift, useFieldStore } from "@/lib/store";

export function PeopleView() {
  const employees = useFieldStore((s) => s.employees);
  const tasks = useFieldStore((s) => s.tasks);
  const entries = useFieldStore((s) => s.timeEntries);
  const addEmployee = useFieldStore((s) => s.addEmployee);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [trade, setTrade] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Crew</h2>
          <p className="text-sm text-muted">Add people and give each one a 4-digit code.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
            Add person
          </Button>
          <Button size="sm" onClick={() => setOpen((v) => !v)}>
            Assign task
          </Button>
        </div>
      </div>
      {adding && (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void addEmployee({ name, trade, role, pin }).then((result) => {
              if (result === "taken") {
                setNote("That code is already in use.");
                return;
              }
              if (result === "bad") {
                setNote("Need a name and a 4-digit code that isn’t the master.");
                return;
              }
              setName("");
              setTrade("");
              setPin("");
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
            <option value="worker">Field</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="4-digit code"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm tabular-nums"
          />
          {note && <p className="text-sm text-danger">{note}</p>}
          <Button type="submit" className="w-full">
            Save person
          </Button>
        </form>
      )}
      {open && (
        <div className="rounded-xl border border-border bg-card p-4">
          <AssignForm onDone={() => setOpen(false)} />
        </div>
      )}
      <ul className="space-y-2">
        {employees.map((e) => {
          const on = !!openShift(e.id, entries);
          const openJobs = tasks.filter((t) => isOnTask(t, e.id) && t.status !== "done").length;
          const master = e.id === OWNER_ID;
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
              <Avatar initials={e.initials} className="size-11 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-muted">
                  {e.trade} · {master ? "master" : e.role}
                  {!master && <span className="tabular-nums"> · {e.pin}</span>}
                </p>
              </div>
              <div className="text-right">
                <Badge tone={on ? "ok" : "muted"}>{on ? "On clock" : "Off"}</Badge>
                <p className="mt-1 text-xs text-subtle">{openJobs} open</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
