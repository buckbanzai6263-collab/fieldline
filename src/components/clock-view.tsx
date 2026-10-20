import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatHours, isSameDay } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { openAux, openShift, useFieldStore } from "@/lib/store";
import type { TimeKind } from "@/lib/types";

function elapsed(start: string, end: number) {
  return end - new Date(start).getTime();
}

export function ClockView() {
  const now = useNow();
  const me = useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId));
  const entries = useFieldStore((s) => s.timeEntries);
  const tasks = useFieldStore((s) => s.tasks);
  const clockIn = useFieldStore((s) => s.clockIn);
  const clockOut = useFieldStore((s) => s.clockOut);
  const startAux = useFieldStore((s) => s.startAux);
  const stopOpenAux = useFieldStore((s) => s.stopOpenAux);
  const openTask = useFieldStore((s) => s.openTask);
  if (!me) return null;

  const mine = entries.filter((e) => e.employeeId === me.id);
  const shift = openShift(me.id, mine);
  const aux = openAux(me.id, mine);
  const today = mine.filter((e) => isSameDay(new Date(e.startedAt), new Date()));

  const sumKind = (kind: TimeKind) =>
    today
      .filter((e) => e.kind === kind)
      .reduce((acc, e) => acc + ((e.endedAt ? new Date(e.endedAt).getTime() : now) - new Date(e.startedAt).getTime()), 0);

  const payroll = sumKind("shift");
  const job = sumKind("job");
  const travel = sumKind("travel");
  const supply = sumKind("supply");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs tracking-widest text-muted">TODAY</p>
        <p className="font-display text-5xl tabular-nums tracking-wide text-fg">{formatDuration(payroll)}</p>
        <p className="mt-1 text-sm text-muted">Payroll clock {shift ? "running" : "stopped"}</p>
        <div className="mt-4 flex gap-2">
          {shift ? (
            <Button variant="secondary" className="flex-1" onClick={clockOut}>
              Clock out
            </Button>
          ) : (
            <Button className="flex-1" onClick={clockIn}>
              Clock in
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Job", job],
          ["Travel", travel],
          ["Supply", supply],
        ].map(([label, ms]) => (
          <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="font-display text-2xl tabular-nums">{formatHours(Number(ms))}</p>
          </div>
        ))}
      </div>

      {shift && (
        <div className="flex flex-wrap gap-2">
          {aux?.kind === "travel" ? (
            <Button variant="secondary" onClick={() => stopOpenAux()}>
              End travel
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => startAux("travel", undefined, "En route")}>
              Start travel
            </Button>
          )}
          {aux?.kind === "supply" ? (
            <Button variant="secondary" onClick={() => stopOpenAux()}>
              End supply run
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => startAux("supply", undefined, "Home Depot / yard")}>
              Start supply run
            </Button>
          )}
          {aux?.kind === "job" && (
            <Button variant="secondary" onClick={() => stopOpenAux()}>
              Stop job
            </Button>
          )}
        </div>
      )}

      {aux && (
        <p className="text-sm text-accent">
          Live: {aux.kind}
          {aux.taskId ? ` · ${tasks.find((t) => t.id === aux.taskId)?.title}` : ""} ·{" "}
          {formatDuration(elapsed(aux.startedAt, now))}
        </p>
      )}

      <section>
        <h2 className="mb-2 font-display text-xl tracking-wide">Entries</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {today.length === 0 && <li className="px-4 py-6 text-sm text-subtle">Clock in to start the day.</li>}
          {[...today].reverse().map((e) => {
            const task = tasks.find((t) => t.id === e.taskId);
            const ms = (e.endedAt ? new Date(e.endedAt).getTime() : now) - new Date(e.startedAt).getTime();
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">
                    {e.kind === "job" ? task?.title ?? "Job" : e.kind}
                    {!e.endedAt && (
                      <Badge tone="accent" className="ml-2">
                        live
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-subtle">{e.note}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-sm text-muted">{formatDuration(ms)}</span>
                  {e.taskId && (
                    <button type="button" className="text-xs text-accent" onClick={() => openTask(e.taskId!)}>
                      Open
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
