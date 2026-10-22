import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatClock, formatDay, formatDuration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useFieldStore } from "@/lib/store";
import { roleLabel, type Employee, type TimeEntry, type TimeKind } from "@/lib/types";

function kindLabel(kind: TimeKind) {
  if (kind === "shift") return "Shift";
  if (kind === "job") return "Job";
  if (kind === "travel") return "Travel";
  return "Supply";
}

function hoursOf(entry: TimeEntry, now: number) {
  const end = entry.endedAt ? new Date(entry.endedAt).getTime() : now;
  return Math.max(0, end - new Date(entry.startedAt).getTime()) / 3600000;
}

export function HoursView() {
  const now = useNow(15000);
  const employees = useFieldStore((s) => s.employees);
  const tasks = useFieldStore((s) => s.tasks);
  const entries = useFieldStore((s) => s.timeEntries);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "worker">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (role === "admin" && e.role !== "admin") return false;
      if (role === "worker" && e.role === "admin") return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        roleLabel(e.role).toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q)
      );
    });
  }, [employees, query, role]);

  const allowed = new Set(people.map((e) => e.id));
  const slips = entries
    .filter((e) => {
      if (!allowed.has(e.employeeId)) return false;
      const day = dayKey(e.startedAt);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    })
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const [note, setNote] = useState("");

  const download = () => {
    const rows = [
      ["Name", "Email", "Phone", "Role", "Date", "Type", "Job", "Started", "Ended", "Hours"],
      ...slips.map((entry) => {
        const person = employees.find((e) => e.id === entry.employeeId);
        const task = tasks.find((t) => t.id === entry.taskId);
        return [
          person?.name ?? "Former crew",
          person?.email ?? "",
          person?.phone ?? "",
          person ? roleLabel(person.role) : "",
          formatDay(entry.startedAt),
          kindLabel(entry.kind),
          task?.title ?? "",
          formatClock(entry.startedAt),
          entry.endedAt ? formatClock(entry.endedAt) : "Live",
          String(round(hoursOf(entry, now))),
        ];
      }),
    ];
    const body = rows.map((row) => row.map(tsvCell).join("\t")).join("\r\n");
    const href = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + body);
    const popup = window.open("", "_blank");
    if (!popup) {
      setNote("The browser blocked the file window. Allow pop-ups for this preview, then click Download Hours again.");
      return;
    }
    const safe = body.replaceAll("&", "&" + "amp;").replaceAll("<", "&" + "lt;").replaceAll(">", "&" + "gt;");
    popup.document.open();
    popup.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>fieldline-hours.csv</title>
<style>
  body { font-family: sans-serif; margin: 24px; color: #111; }
  a { display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 16px; border-radius: 8px; }
  pre { margin-top: 20px; white-space: pre-wrap; font: 13px ui-monospace, monospace; }
</style>
</head>
<body>
<p>This file is the hours currently on your list.</p>
<p><a id="save" href="${href}" download="fieldline-hours.csv">Download fieldline-hours.csv</a></p>
<pre>${safe}</pre>
</body>
</html>`);
    popup.document.close();
    popup.document.getElementById("save")?.click();
    setNote("Use the Download button in the new window if the file did not save.");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Time slips</h2>
          <p className="text-sm text-muted">Hours worked, by person. Open clocks count up to now.</p>
        </div>
        <div className="flex flex-col items-start gap-1">
          <Button size="sm" variant="secondary" type="button" onClick={download}>
            Download Hours
          </Button>
          {note && <p className="max-w-sm text-left text-xs text-muted">{note}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or role"
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "all" | "admin" | "worker")}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm sm:w-40"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="worker">Field Tech</option>
        </select>
        <div className="flex gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-0 flex-1 bg-transparent text-fg" />
          </label>
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-0 flex-1 bg-transparent text-fg" />
          </label>
        </div>
      </div>

      <ul className="space-y-2">
        {slips.length === 0 && <li className="text-sm text-subtle">No time slips for that search.</li>}
        {slips.map((entry) => (
          <Slip key={entry.id} entry={entry} now={now} employees={employees} tasks={tasks} />
        ))}
      </ul>
    </div>
  );
}

function Slip({
  entry,
  now,
  employees,
  tasks,
}: {
  entry: TimeEntry;
  now: number;
  employees: Employee[];
  tasks: { id: string; title: string }[];
}) {
  const person = employees.find((e) => e.id === entry.employeeId);
  const task = tasks.find((t) => t.id === entry.taskId);
  const ms = hoursOf(entry, now) * 3600000;
  return (
    <li className="rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {person?.name ?? "Former crew"}
            <span className="ml-2 text-sm font-normal text-muted">{person ? roleLabel(person.role) : ""}</span>
          </p>
          <p className="text-sm text-muted">
            {formatDay(entry.startedAt)} · {kindLabel(entry.kind)}
            {task ? ` · ${task.title}` : ""}
          </p>
          <p className="text-xs text-subtle">
            {formatClock(entry.startedAt)} – {entry.endedAt ? formatClock(entry.endedAt) : "Live"}
          </p>
        </div>
        <p className="tabular-nums text-sm text-fg">{formatDuration(ms)}</p>
      </div>
    </li>
  );
}

function round(hours: number) {
  return Math.round(hours * 100) / 100;
}

function dayKey(iso: string) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function tsvCell(value: string) {
  if (/[\t\r\n"]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
