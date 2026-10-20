import type { DragEvent } from "react";
import { Camera, Clock3, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { COLUMNS, isOnTask, type ColumnId, type Priority, type Task } from "@/lib/types";
import { formatDay } from "@/lib/format";
import { useFieldStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const priorityTone: Record<Priority, "muted" | "accent" | "danger" | "urgent"> = {
  low: "muted",
  normal: "muted",
  high: "accent",
  urgent: "urgent",
};

function TaskCard({ task, compact }: { task: Task; compact?: boolean }) {
  const employees = useFieldStore((s) => s.employees);
  const projects = useFieldStore((s) => s.projects);
  const openTask = useFieldStore((s) => s.openTask);
  const timeEntries = useFieldStore((s) => s.timeEntries);
  const emps = employees.filter((e) => isOnTask(task, e.id));
  const project = projects.find((p) => p.id === task.projectId);
  const running = timeEntries.some((e) => e.taskId === task.id && e.kind === "job" && !e.endedAt);

  return (
    <button
      type="button"
      onClick={() => openTask(task.id)}
      className={cn(
        "w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-accent/60",
        task.priority === "urgent" && "border-l-2 border-l-accent",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug text-fg">{task.title}</p>
        {task.priority !== "normal" && task.priority !== "low" && (
          <Badge tone={priorityTone[task.priority]}>{task.priority}</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        {project?.name}
        {project?.urgent ? " · urgent site" : ""}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-subtle">
        {emps.slice(0, 3).map((emp) => (
          <Avatar key={emp.id} initials={emp.initials} className="size-6 text-[10px]" />
        ))}
        {emps.length > 3 && <span>+{emps.length - 3}</span>}
        <span>{formatDay(task.dueAt)}</span>
        {task.photos.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <Camera className="size-3.5" />
            {task.photos.length}
          </span>
        )}
        {task.comments.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            {task.comments.length}
          </span>
        )}
        {running && (
          <span className="inline-flex items-center gap-1 text-accent">
            <Clock3 className="size-3.5" />
            live
          </span>
        )}
      </div>
      {!compact && task.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted">{task.description}</p>
      )}
    </button>
  );
}

export function KanbanBoard({ mineOnly }: { mineOnly?: boolean }) {
  const me = useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId));
  const tasks = useFieldStore((s) => s.tasks);
  const setTaskStatus = useFieldStore((s) => s.setTaskStatus);
  const visible = mineOnly && me ? tasks.filter((t) => isOnTask(t, me.id)) : tasks;

  const onDrop = (status: ColumnId, e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task");
    if (!id) return;
    if (!setTaskStatus(id, status) && status === "done") {
      toast.error("Photo required before Done.");
    }
  };

  return (
    <div className="snap-board flex gap-3 overflow-x-auto pb-24 md:grid md:grid-cols-4 md:overflow-visible md:pb-4">
      {COLUMNS.map((col) => {
        const list = visible.filter((t) => t.status === col.id);
        return (
          <section
            key={col.id}
            className="snap-col flex w-[min(85vw,22rem)] shrink-0 flex-col md:w-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(col.id, e)}
          >
            <header className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-xl tracking-wide text-fg">{col.label}</h2>
              <span className="tabular-nums text-sm text-subtle">{list.length}</span>
            </header>
            <div className="flex flex-col gap-2">
              {list.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-subtle">
                  Nothing here
                </p>
              )}
              {list.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/task", task.id)}
                >
                  <TaskCard task={task} compact={mineOnly} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function MyJobs() {
  const meId = useFieldStore((s) => s.currentUserId);
  const allTasks = useFieldStore((s) => s.tasks);
  const tasks = allTasks.filter((t) => isOnTask(t, meId) && t.status !== "done");
  const done = allTasks.filter((t) => isOnTask(t, meId) && t.status === "done");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide">My jobs</h2>
        <p className="text-sm text-muted">Open a job to start the timer when you arrive. Opening it does not start time.</p>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-sm text-subtle">No open jobs on you.</p>}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
      {done.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Closed</h3>
          <div className="space-y-2 opacity-70">
            {done.map((t) => (
              <TaskCard key={t.id} task={t} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
