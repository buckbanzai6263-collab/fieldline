import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatClock } from "@/lib/format";
import { SUPPORT_AUTHOR_ID, SUPPORT_AUTHOR_NAME } from "@/lib/seed";
import { isAdmin } from "@/lib/types";
import { useFieldStore } from "@/lib/store";

function authorOf(id: string, employees: { id: string; name: string; initials: string }[]) {
  if (id === SUPPORT_AUTHOR_ID) return { name: SUPPORT_AUTHOR_NAME, initials: "FS" };
  return employees.find((e) => e.id === id);
}

export function ChatView() {
  const me = useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId));
  const employees = useFieldStore((s) => s.employees);
  const chats = useFieldStore((s) => s.chats);
  const messages = useFieldStore((s) => s.messages);
  const openChatId = useFieldStore((s) => s.openChatId);
  const openChat = useFieldStore((s) => s.openChat);
  const sendMessage = useFieldStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");

  const admin = isAdmin(me?.role);
  const mine = useMemo(
    () => chats.filter((c) => c.taskId && (admin || c.memberIds.includes(me?.id ?? ""))),
    [admin, chats, me?.id],
  );
  const room = mine.find((c) => c.id === openChatId) ?? null;
  const thread = messages.filter((m) => m.chatId === openChatId);

  if (!me) return null;

  if (room) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div>
            <button type="button" className="text-xs text-accent" onClick={() => openChat(null)}>
              All chats
            </button>
            <h2 className="font-display text-2xl tracking-wide">{room.name}</h2>
            <p className="text-xs text-muted">
              {admin ? "Assigned crew can text. Admins can read and reply." : "Only the people assigned to this job."}
            </p>
          </div>
        </header>
        <ul className="flex-1 space-y-3 overflow-y-auto">
          {thread.map((m) => {
            const a = authorOf(m.authorId, employees);
            const mineMsg = m.authorId === me.id;
            return (
              <li key={m.id} className={`flex gap-2 ${mineMsg ? "justify-end" : ""}`}>
                {!mineMsg && a && <Avatar initials={a.initials} />}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${mineMsg ? "bg-accent text-accent-fg" : "bg-card text-fg"}`}>
                  {!mineMsg && a && <p className="text-[11px] opacity-80">{a.name}</p>}
                  <p className="text-sm">{m.body}</p>
                  <p className={`text-[10px] ${mineMsg ? "text-accent-fg/70" : "text-subtle"}`}>{formatClock(m.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(room.id, draft);
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message"
            className="h-11 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-wide">Chats</h2>
          <p className="text-sm text-muted">
            {admin
              ? "Every job text is here. You can open one and reply."
              : "Each job has its own text. Only the people assigned to that job can see it."}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {mine.length === 0 && (
          <li className="text-sm text-subtle">
            {admin ? "No job texts yet." : "No job texts yet. You’ll see one here when you’re assigned to a job."}
          </li>
        )}
        {mine.map((c) => {
          const last = [...messages].reverse().find((m) => m.chatId === c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openChat(c.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-accent/50"
              >
                <span>
                  <span className="block font-medium">
                    {c.name}
                    {c.taskId ? <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">Job</span> : null}
                  </span>
                  <span className="block truncate text-sm text-muted">{last?.body ?? "No messages yet"}</span>
                </span>
                <span className="text-xs text-subtle">{c.memberIds.length}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
