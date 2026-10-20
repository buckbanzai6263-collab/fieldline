import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatHours, startOfWeek } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useFieldStore } from "@/lib/store";
import type { TimeKind } from "@/lib/types";

export function ReportsView() {
  const now = useNow(15000);
  const employees = useFieldStore((s) => s.employees);
  const tasks = useFieldStore((s) => s.tasks);
  const entries = useFieldStore((s) => s.timeEntries);
  const week = startOfWeek();

  const duration = (kind: TimeKind, employeeId?: string, billable?: boolean) =>
    entries
      .filter((e) => {
        if (e.kind !== kind) return false;
        if (employeeId && e.employeeId !== employeeId) return false;
        if (new Date(e.startedAt) < week) return false;
        if (billable) {
          const task = tasks.find((t) => t.id === e.taskId);
          if (!task?.billable) return false;
        }
        return true;
      })
      .reduce((acc, e) => acc + ((e.endedAt ? new Date(e.endedAt).getTime() : now) - new Date(e.startedAt).getTime()), 0);

  const payroll = duration("shift");
  const job = duration("job");
  const billable = duration("job", undefined, true);
  const util = payroll > 0 ? Math.round((job / payroll) * 100) : 0;

  const byPerson = employees
    .filter((e) => e.role !== "admin")
    .map((e) => ({
      name: e.initials,
      full: e.name,
      job: +(duration("job", e.id) / 3600000).toFixed(1),
      travel: +(duration("travel", e.id) / 3600000).toFixed(1),
      supply: +(duration("supply", e.id) / 3600000).toFixed(1),
      shift: duration("shift", e.id),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide">Billing & productivity</h2>
        <p className="text-sm text-muted">This week. Payroll is the day clock. Job time is what you can invoice.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Payroll", formatHours(payroll)],
          ["Job time", formatHours(job)],
          ["Billable", formatHours(billable)],
          ["Utilization", `${util}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted">{k}</p>
            <p className="font-display text-3xl tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byPerson}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--color-subtle)" fontSize={12} />
            <YAxis stroke="var(--color-subtle)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-fg)",
              }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
            />
            <Bar dataKey="job" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="travel" fill="var(--color-subtle)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="supply" fill="var(--color-muted)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Crew</th>
              <th className="px-3 py-2 font-medium">Payroll</th>
              <th className="px-3 py-2 font-medium">Job</th>
              <th className="px-3 py-2 font-medium">Travel</th>
              <th className="px-3 py-2 font-medium">Supply</th>
            </tr>
          </thead>
          <tbody>
            {byPerson.map((row) => (
              <tr key={row.name} className="border-t border-border">
                <td className="px-3 py-2">{row.full}</td>
                <td className="px-3 py-2 tabular-nums">{formatHours(row.shift)}</td>
                <td className="px-3 py-2 tabular-nums">{row.job}h</td>
                <td className="px-3 py-2 tabular-nums">{row.travel}h</td>
                <td className="px-3 py-2 tabular-nums">{row.supply}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
