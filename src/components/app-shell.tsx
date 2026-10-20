import { useEffect, useState } from "react";
import { Bell, ClipboardList, Home, LayoutGrid, MessageSquare, Timer, Users, BarChart3 } from "lucide-react";
import { Toaster } from "sonner";
import { CrewGate } from "@/components/crew-gate";
import { HomeView } from "@/components/home-view";
import { KanbanBoard, MyJobs } from "@/components/kanban";
import { TaskDetail } from "@/components/task-detail";
import { ClockView } from "@/components/clock-view";
import { ChatView } from "@/components/chat-view";
import { ReportsView } from "@/components/reports-view";
import { PeopleView } from "@/components/people-view";
import { AssignForm } from "@/components/assign-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFieldStore, openShift, openAux, useMe, refreshBoard } from "@/lib/store";
import { formatDuration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const nav: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "mine", label: "Jobs", icon: ClipboardList },
  { id: "clock", label: "Clock", icon: Timer },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "people", label: "Crew", icon: Users },
];

export function AppShell() {
  const me = useMe();
  const tab = useFieldStore((s) => s.tab);
  const setTab = useFieldStore((s) => s.setTab);
  const setUser = useFieldStore((s) => s.setUser);
  const hydrated = useFieldStore((s) => s.hydrated);
  const live = useFieldStore((s) => s.live);
  const notices = useFieldStore((s) => s.notices);
  const markNoticesRead = useFieldStore((s) => s.markNoticesRead);
  const entries = useFieldStore((s) => s.timeEntries);
  const assignOpen = useFieldStore((s) => s.assignOpen);
  const setAssignOpen = useFieldStore((s) => s.setAssignOpen);
  const now = useNow();
  const [more, setMore] = useState(false);

  useEffect(() => {
    void refreshBoard();
    const id = window.setInterval(() => void refreshBoard(), 4000);
    return () => window.clearInterval(id);
  }, []);

  if (!hydrated) return <main className="min-h-dvh bg-bg" />;
  if (!me) return <CrewGate />;

  const items = nav;
  const unread = notices.filter((n) => n.employeeId === me.id && !n.read).length;
  const shift = openShift(me.id, entries);
  const aux = openAux(me.id, entries);
  const shiftMs = shift ? now - new Date(shift.startedAt).getTime() : 0;
  const canAssign = true;
  const primary = items.filter((n) => n.id === "home" || n.id === "board" || n.id === "clock" || n.id === "chat");
  const extra = items.filter((n) => n.id === "mine" || n.id === "reports" || n.id === "people");
  const mobileItems = primary;

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="px-5 py-5">
          <p className="text-[10px] tracking-[0.28em] text-accent">LPS</p>
          <p className="font-display text-3xl leading-none tracking-wide">FIELDLINE</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setTab(n.id)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm",
                tab === n.id ? "bg-accent text-accent-fg" : "text-muted hover:bg-card hover:text-fg",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-4 text-xs text-muted">
          <p className="font-medium text-fg">{me.name}</p>
          <p>
            {me.trade} · {me.role}
          </p>
          <button type="button" className="mt-2 text-accent" onClick={() => setUser(null)}>
            Lock
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="md:hidden">
            <p className="font-display text-2xl leading-none tracking-wide">FIELDLINE</p>
            <p className="text-xs text-accent">{live ? "Live" : "Reconnecting"}</p>
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-muted">Prevent. Protect. Perform.</p>
            <p className="text-xs text-accent">{live ? "Live" : "Reconnecting"}</p>
          </div>
          <div className="flex items-center gap-2">
            {shift && (
              <Badge tone="accent" className="tabular-nums">
                {formatDuration(shiftMs)}
                {aux ? ` · ${aux.kind}` : ""}
              </Badge>
            )}
            {canAssign && (
              <Button size="sm" onClick={() => setAssignOpen(!assignOpen)}>
                Assign task
              </Button>
            )}
            <button type="button" className="text-xs text-muted md:hidden" onClick={() => setUser(null)}>
              Lock
            </button>
            <button
              type="button"
              className="relative size-11 rounded-lg text-muted hover:text-fg"
              onClick={markNoticesRead}
              aria-label="Notifications"
            >
              <Bell className="mx-auto size-5" />
              {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-4 pb-24 md:pb-6">
          {assignOpen && canAssign && tab !== "home" && (
            <div className="mx-auto mb-5 max-w-lg rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl tracking-wide">Assign task</h2>
                <button type="button" className="text-sm text-muted" onClick={() => setAssignOpen(false)}>
                  Close
                </button>
              </div>
              <AssignForm />
            </div>
          )}
          {tab === "home" && <HomeView />}
          {tab === "board" && <KanbanBoard />}
          {tab === "mine" && <MyJobs />}
          {tab === "clock" && <ClockView />}
          {tab === "chat" && <ChatView />}
          {tab === "reports" && <ReportsView />}
          {tab === "people" && <PeopleView />}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
          {mobileItems.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setMore(false);
                setTab(n.id);
              }}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                tab === n.id && !more ? "text-accent" : "text-subtle",
              )}
            >
              <n.icon className="size-5" />
              {n.label}
            </button>
          ))}
          {extra.length > 0 && (
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]", more ? "text-accent" : "text-subtle")}
            >
              <Users className="size-5" />
              More
            </button>
          )}
        </nav>

        {more && extra.length > 0 && (
          <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-surface p-3 md:hidden">
            {extra.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setTab(n.id);
                  setMore(false);
                }}
                className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm text-fg hover:bg-card"
              >
                <n.icon className="size-4 text-accent" />
                {n.label}
              </button>
            ))}
            <button type="button" className="flex h-12 w-full items-center px-3 text-sm text-muted" onClick={() => setUser(null)}>
              Lock
            </button>
          </div>
        )}
      </div>

      <TaskDetail />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
