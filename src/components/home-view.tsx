import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignForm } from "@/components/assign-form";
import { formatDuration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { isOnTask } from "@/lib/types";
import { openAux, openShift, useFieldStore, useMe } from "@/lib/store";

export function HomeView() {
  const me = useMe();
  const tasks = useFieldStore((s) => s.tasks);
  const entries = useFieldStore((s) => s.timeEntries);
  const employees = useFieldStore((s) => s.employees);
  const setTab = useFieldStore((s) => s.setTab);
  const openTask = useFieldStore((s) => s.openTask);
  const assignOpen = useFieldStore((s) => s.assignOpen);
  const setAssignOpen = useFieldStore((s) => s.setAssignOpen);
  const clockIn = useFieldStore((s) => s.clockIn);
  const now = useNow();
  if (!me) return null;

  const mine = tasks.filter((t) => isOnTask(t, me.id) && t.status !== "done");
  const shift = openShift(me.id, entries);
  const aux = openAux(me.id, entries);
  const canAssign = true;
  const onClock = employees.filter((e) => openShift(e.id, entries));
  const urgent = tasks.filter((t) => t.priority === "urgent" && t.status !== "done");

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <p className="text-sm text-muted">{me.trade}</p>
        <h2 className="font-display text-3xl tracking-wide">Hey {me.name.split(" ")[0]}</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted">Day clock</p>
        <p className="font-display text-4xl tabular-nums">
          {shift ? formatDuration(now - new Date(shift.startedAt).getTime()) : "Off the clock"}
        </p>
        {aux && (
          <p className="mt-1 text-sm text-accent">
            Live {aux.kind}
            {aux.taskId ? ` · ${tasks.find((t) => t.id === aux.taskId)?.title}` : ""}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {!shift && (
            <Button onClick={clockIn} className="flex-1">
              Clock in
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={() => setTab("clock")}>
            Time
          </Button>
        </div>
      </div>

      {canAssign && assignOpen && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl tracking-wide">Assign task</h3>
            <button type="button" className="text-sm text-muted" onClick={() => setAssignOpen(false)}>
              Close
            </button>
          </div>
          <AssignForm onDone={() => setAssignOpen(false)} />
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-xl tracking-wide">My jobs</h3>
          <button type="button" className="text-sm text-accent" onClick={() => setTab("mine")}>
            All
          </button>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-subtle">No jobs yet. Assign one when you’re ready.</p>
        ) : (
          <ul className="space-y-2">
            {mine.slice(0, 4).map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openTask(t.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="text-xs text-muted">
                      {t.status.replace("_", " ")}
                      {t.assigneeIds.length > 1 ? ` · ${t.assigneeIds.length} on job` : ""}
                    </span>
                  </span>
                  {t.priority === "urgent" && <Badge tone="urgent">urgent</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAssign && (
        <>
          <section>
            <h3 className="mb-2 font-display text-xl tracking-wide">On the clock</h3>
            <p className="text-sm text-muted">
              {onClock.length === 0 ? "Nobody clocked in." : onClock.map((e) => e.name.split(" ")[0]).join(", ")}
            </p>
          </section>
          {urgent.length > 0 && (
            <section>
              <h3 className="mb-2 font-display text-xl tracking-wide">Urgent</h3>
              <ul className="space-y-2">
                {urgent.map((t) => (
                  <li key={t.id}>
                    <button type="button" className="text-sm text-accent" onClick={() => openTask(t.id)}>
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
