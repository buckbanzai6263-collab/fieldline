import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatClock } from "@/lib/format";
import { useFieldStore } from "@/lib/store";

export function ChatView() {
  const me = useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId));
  const employees = useFieldStore((s) => s.employees);
  const chats = useFieldStore((s) => s.chats);
  const messages = useFieldStore((s) => s.messages);
  const openChatId = useFieldStore((s) => s.openChatId);
  const openChat = useFieldStore((s) => s.openChat);
  const sendMessage = useFieldStore((s) => s.sendMessage);
  const createChat = useFieldStore((s) => s.createChat);
  const setChatMembers = useFieldStore((s) => s.setChatMembers);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [invite, setInvite] = useState<string[]>([]);

  const mine = useMemo(() => chats, [chats]);
  const room = chats.find((c) => c.id === openChatId);
  const thread = messages.filter((m) => m.chatId === openChatId);
  const canAdmin = true;

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
            <p className="text-xs text-muted">{room.memberIds.length} people · invite only</p>
          </div>
        </header>
        {canAdmin && (
          <div className="mb-3 flex flex-wrap gap-2">
            {employees.map((e) => {
              const on = room.memberIds.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    const next = on ? room.memberIds.filter((id) => id !== e.id || id === me.id) : [...room.memberIds, e.id];
                    setChatMembers(room.id, next);
                  }}
                  className={`rounded-full border px-2 py-1 text-xs ${on ? "border-accent text-accent" : "border-border text-muted"}`}
                >
                  {e.initials}
                </button>
              );
            })}
          </div>
        )}
        <ul className="flex-1 space-y-3 overflow-y-auto">
          {thread.map((m) => {
            const a = employees.find((e) => e.id === m.authorId);
            const mineMsg = m.authorId === me.id;
            return (
              <li key={m.id} className={`flex gap-2 ${mineMsg ? "justify-end" : ""}`}>
                {!mineMsg && <Avatar initials={a?.initials ?? "?"} />}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${mineMsg ? "bg-accent text-accent-fg" : "bg-card text-fg"}`}>
                  {!mineMsg && <p className="text-[11px] opacity-80">{a?.name}</p>}
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
            Assign a crew and a job chat opens. Everything is open for this demo.
          </p>
        </div>
        {canAdmin && (
          <Button variant="secondary" size="sm" onClick={() => setCreating((v) => !v)}>
            New room
          </Button>
        )}
      </div>
      {creating && canAdmin && (
        <form
          className="space-y-3 rounded-xl border border-border bg-card p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            const id = createChat(newName.trim(), invite);
            setCreating(false);
            setNewName("");
            setInvite([]);
            openChat(id);
          }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Room name"
            className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {employees
              .filter((e) => e.id !== me.id)
              .map((e) => {
                const on = invite.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setInvite((ids) => (on ? ids.filter((i) => i !== e.id) : [...ids, e.id]))}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "border-accent text-accent" : "border-border text-muted"}`}
                  >
                    {e.name}
                  </button>
                );
              })}
          </div>
          <Button type="submit">Create</Button>
        </form>
      )}
      <ul className="space-y-2">
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
