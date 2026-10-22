import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Priority } from "@/lib/types";
import { useFieldStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AssignForm({ onDone, submitLabel = "Open Job" }: { onDone?: () => void; submitLabel?: string }) {
  const employees = useFieldStore((s) => s.employees);
  const projects = useFieldStore((s) => s.projects);
  const createTask = useFieldStore((s) => s.createTask);
  const addProject = useFieldStore((s) => s.addProject);
  const openTask = useFieldStore((s) => s.openTask);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [site, setSite] = useState(projects[0]?.name ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("normal");

  const toggle = (id: string) => {
    setAssigneeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !site.trim() || assigneeIds.length === 0) return;
        const due = new Date();
        due.setDate(due.getDate() + 1);
        due.setHours(17, 0, 0, 0);
        const projectId = addProject(site.trim());
        const id = createTask({
          title: title.trim(),
          description,
          projectId,
          assigneeIds,
          dueAt: due.toISOString(),
          priority,
          billable: true,
        });
        onDone?.();
        openTask(id);
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Job title"
        className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What to do, what to photo"
        className="min-h-20 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
      />
      <input
        value={site}
        onChange={(e) => setSite(e.target.value)}
        placeholder="Site or property"
        className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
        list="fieldline-sites"
      />
      <datalist id="fieldline-sites">
        {projects.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      <div>
        <p className="mb-2 text-xs text-muted">Assign to (tap more than one)</p>
        <div className="flex flex-wrap gap-2">
          {employees.map((e) => {
            const on = assigneeIds.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggle(e.id)}
                className={cn(
                  "h-10 rounded-full border px-3 text-sm",
                  on ? "border-accent bg-accent text-accent-fg" : "border-border text-muted",
                )}
              >
                {e.name}
              </button>
            );
          })}
        </div>
      </div>
      <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm">
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
      <Button type="submit" className="w-full" disabled={!title.trim() || !site.trim() || assigneeIds.length === 0}>
        {submitLabel}
      </Button>
    </form>
  );
}
