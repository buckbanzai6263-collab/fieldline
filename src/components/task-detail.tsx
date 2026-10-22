import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { COLUMNS, type ColumnId } from "@/lib/types";
import { formatClock, formatDay, formatDuration } from "@/lib/format";
import { openAux, openShift, useFieldStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { compressImage } from "@/lib/utils";
import { SUPPORT_AUTHOR_ID, SUPPORT_AUTHOR_NAME } from "@/lib/seed";
import { toast } from "sonner";

export function TaskDetail() {
  const now = useNow();
  const openTaskId = useFieldStore((s) => s.openTaskId);
  const openTask = useFieldStore((s) => s.openTask);
  const task = useFieldStore((s) => s.tasks.find((t) => t.id === s.openTaskId) ?? null);
  const me = useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId));
  const employees = useFieldStore((s) => s.employees);
  const projects = useFieldStore((s) => s.projects);
  const timeEntries = useFieldStore((s) => s.timeEntries);
  const setTaskStatus = useFieldStore((s) => s.setTaskStatus);
  const assignTask = useFieldStore((s) => s.assignTask);
  const addPhoto = useFieldStore((s) => s.addPhoto);
  const addComment = useFieldStore((s) => s.addComment);
  const startJob = useFieldStore((s) => s.startJob);
  const stopOpenAux = useFieldStore((s) => s.stopOpenAux);
  const clockIn = useFieldStore((s) => s.clockIn);
  const openChat = useFieldStore((s) => s.openChat);
  const chats = useFieldStore((s) => s.chats);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!openTaskId || !task || !me) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const shift = openShift(me.id, timeEntries);
  const aux = openAux(me.id, timeEntries);
  const thisJobLive = aux?.kind === "job" && aux.taskId === task.id;
  const canManage = true;
  const elapsed = thisJobLive ? now - new Date(aux.startedAt).getTime() : 0;
  const needsPhoto = task.photos.length === 0;
  const jobChat = chats.find((c) => c.taskId === task.id);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      addPhoto(task.id, { dataUrl, caption: file.name });
      toast.success("Photo attached");
    } catch {
      toast.error("Could not attach photo");
    }
  };

  const onStart = () => {
    if (!shift) {
      clockIn();
      toast.message("Clocked in for the day, then started the job.");
    }
    startJob(task.id);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 md:items-center" onClick={() => openTask(null)}>
      <div
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-xl border border-border bg-surface md:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-xs text-muted">{project?.name}</p>
            <h2 className="font-display text-2xl leading-tight tracking-wide text-fg">{task.title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={() => openTask(null)} aria-label="Close">
            <X className="size-5" />
          </Button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <p className="text-sm leading-relaxed text-muted">{task.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone={task.priority === "urgent" ? "urgent" : task.priority === "high" ? "accent" : "muted"}>
              {task.priority}
            </Badge>
            {task.billable ? <Badge tone="ok">Billable</Badge> : <Badge>Non-billable</Badge>}
            <Badge>{formatDay(task.dueAt)}</Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted">
              Status
              <select
                className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-fg"
                value={task.status}
                onChange={(e) => {
                  const next = e.target.value as ColumnId;
                  if (!setTaskStatus(task.id, next)) {
                    toast.error("Photo required before Done.");
                  }
                }}
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === "done" && needsPhoto}>
                    {c.label}
                    {c.id === "done" && needsPhoto ? " — photo first" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-xs text-muted">
              Crew on this job
              <div className="mt-1 flex flex-wrap gap-2">
                {employees.map((e) => {
                  const on = task.assigneeIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      disabled={!canManage}
                      onClick={() => {
                        const next = on
                          ? task.assigneeIds.filter((id) => id !== e.id)
                          : [...task.assigneeIds, e.id];
                        if (next.length === 0) return;
                        assignTask(task.id, next);
                      }}
                      className={`h-9 rounded-full border px-3 text-xs ${on ? "border-accent bg-accent text-accent-fg" : "border-border text-muted"}`}
                    >
                      {e.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {jobChat && (
            <Button variant="secondary" className="w-full" onClick={() => openChat(jobChat.id)}>
              Open job chat · {jobChat.memberIds.length} people
            </Button>
          )}

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Job timer</p>
                <p className="font-display text-3xl tabular-nums tracking-wide text-fg">
                  {thisJobLive ? formatDuration(elapsed) : "0:00"}
                </p>
              </div>
              {thisJobLive ? (
                <Button variant="secondary" onClick={() => stopOpenAux()}>
                  Stop job
                </Button>
              ) : (
                <Button onClick={onStart}>Start job</Button>
              )}
            </div>
            <p className="mt-2 text-xs text-subtle">
              Does not start when you open the assignment. Tap start when you arrive on site.
              {aux && !thisJobLive ? ` Currently on ${aux.kind}. Starting this job will stop that clock.` : ""}
            </p>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Photos</h3>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                Add photo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </div>
            {task.photos.length === 0 ? (
              <p className="text-sm text-subtle">No photos yet. Need at least one before this job can go to Done.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {task.photos.map((p) => (
                  <figure key={p.id} className="overflow-hidden rounded-md border border-border bg-bg">
                    <img src={p.dataUrl} alt={p.caption} className="aspect-[4/3] w-full object-cover" />
                  </figure>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium">Notes</h3>
            <ul className="space-y-3">
              {task.comments.map((c) => {
                const a =
                  c.authorId === SUPPORT_AUTHOR_ID
                    ? { name: SUPPORT_AUTHOR_NAME, initials: "FS" }
                    : employees.find((e) => e.id === c.authorId);
                return (
                  <li key={c.id} className="flex gap-2">
                    <Avatar initials={a?.initials ?? "?"} />
                    <div>
                      <p className="text-xs text-muted">
                        {a?.name} · {formatClock(c.createdAt)}
                      </p>
                      <p className="text-sm text-fg">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addComment(task.id, note);
                setNote("");
              }}
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note"
                className="h-11 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-fg placeholder:text-subtle"
              />
              <Button type="submit" variant="secondary">
                Send
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
