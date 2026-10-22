import { useEffect, useState } from "react";
import { Bell, ClipboardList, Home, LayoutGrid, MessageSquare, Timer, Users, BarChart3, FileSpreadsheet, UserRound, Ellipsis, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { CrewGate } from "@/components/crew-gate";
import { HomeView } from "@/components/home-view";
import { KanbanBoard, MyJobs } from "@/components/kanban";
import { TaskDetail } from "@/components/task-detail";
import { ClockView } from "@/components/clock-view";
import { ChatView } from "@/components/chat-view";
import { ReportsView } from "@/components/reports-view";
import { HoursView } from "@/components/hours-view";
import { PeopleView } from "@/components/people-view";
import { AccountView } from "@/components/account-view";
import { AssignForm } from "@/components/assign-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFieldStore, openShift, openAux, useMe, refreshBoard } from "@/lib/store";
import { enableAlerts, prepareAlerts, refreshAlerts } from "@/lib/push-client";
import { formatDuration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { isAdmin, roleLabel, type TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

const nav: { id: TabId; label: string; icon: typeof LayoutGrid; adminOnly?: boolean }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "board", label: "Job Board", icon: LayoutGrid },
  { id: "mine", label: "My jobs", icon: ClipboardList },
  { id: "clock", label: "Clock", icon: Timer },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { id: "hours", label: "Hours", icon: FileSpreadsheet, adminOnly: true },
  { id: "people", label: "Crew", icon: Users },
  { id: "account", label: "Account", icon: UserRound },
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
  const openChat = useFieldStore((s) => s.openChat);
  const now = useNow();
  const [more, setMore] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [askAlerts, setAskAlerts] = useState(false);

  useEffect(() => {
    void refreshBoard();
    const id = window.setInterval(() => void refreshBoard(), 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!me) return;
    void refreshAlerts();
    void prepareAlerts();
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    if (localStorage.getItem("fieldline-alerts-dismissed") === "1") return;
    setAskAlerts(true);
  }, [me]);

  if (!hydrated) return <main className="min-h-dvh bg-bg" />;
  if (!me) return <CrewGate />;

  const items = nav.filter((n) => !n.adminOnly || isAdmin(me.role));
  const unread = notices.filter((n) => n.employeeId === me.id && !n.read).length;
  const myNotices = notices.filter((n) => n.employeeId === me.id).slice(0, 12);
  const shift = openShift(me.id, entries);
  const aux = openAux(me.id, entries);
  const shiftMs = shift ? now - new Date(shift.startedAt).getTime() : 0;
  const canAssign = isAdmin(me.role);
  const primary = items.filter((n) => n.id === "home" || n.id === "board" || n.id === "clock" || n.id === "chat");
  const extra = items.filter((n) => n.id === "mine" || n.id === "reports" || n.id === "hours" || n.id === "people" || n.id === "account");
  const mobileItems = primary;
  const visibleTab = items.some((n) => n.id === tab) ? tab : "home";

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
                visibleTab === n.id ? "bg-accent text-accent-fg" : "text-muted hover:bg-card hover:text-fg",
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
            {me.trade && me.trade !== roleLabel(me.role) ? `${me.trade} · ` : ""}
            {roleLabel(me.role)}
          </p>
          <button type="button" className="mt-2 text-accent" onClick={() => setUser(null)}>
            Log out
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
                Add Job
              </Button>
            )}
            <button type="button" className="text-xs text-muted md:hidden" onClick={() => setUser(null)}>
              Log out
            </button>
            <div className="relative">
              <button
                type="button"
                className="relative size-11 rounded-lg text-muted hover:text-fg"
                onClick={() => {
                  setNoticesOpen((open) => !open);
                  if (unread > 0) markNoticesRead();
                }}
                aria-label="Notifications"
              >
                <Bell className="mx-auto size-5" />
                {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" />}
              </button>
              {noticesOpen && (
                <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-border bg-card p-2 shadow-lg">
                  {myNotices.length === 0 && <p className="px-2 py-3 text-sm text-subtle">No notifications.</p>}
                  <ul className="max-h-80 space-y-1 overflow-auto">
                    {myNotices.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-2 py-2 text-left hover:bg-bg"
                          onClick={() => {
                            setNoticesOpen(false);
                            if (n.chatId) openChat(n.chatId);
                          }}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="truncate text-xs text-muted">{n.body}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-4 pb-24 md:pb-6">
          {askAlerts && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted">Turn on alerts so a text still reaches this phone when Fieldline is closed.</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    void enableAlerts().then((result) => {
                      if (result === "on" || result === "denied") setAskAlerts(false);
                    });
                  }}
                >
                  Turn on
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    localStorage.setItem("fieldline-alerts-dismissed", "1");
                    setAskAlerts(false);
                  }}
                >
                  Not now
                </Button>
              </div>
            </div>
          )}
          {assignOpen && canAssign && tab !== "home" && (
            <div className="mx-auto mb-5 max-w-lg rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl tracking-wide">Add Job</h2>
                <button type="button" className="text-sm text-muted" onClick={() => setAssignOpen(false)}>
                  Close
                </button>
              </div>
              <AssignForm />
            </div>
          )}
          {visibleTab === "home" && <HomeView />}
          {visibleTab === "board" && <KanbanBoard />}
          {visibleTab === "mine" && <MyJobs />}
          {visibleTab === "clock" && <ClockView />}
          {visibleTab === "chat" && <ChatView />}
          {visibleTab === "reports" && <ReportsView />}
          {visibleTab === "hours" && <HoursView />}
          {visibleTab === "people" && <PeopleView />}
          {visibleTab === "account" && <AccountView />}
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
                visibleTab === n.id && !more ? "text-accent" : "text-subtle",
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
              <Ellipsis className="size-5" />
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
            <button
              type="button"
              className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm text-fg hover:bg-card"
              onClick={() => {
                setMore(false);
                setUser(null);
              }}
            >
              <LogOut className="size-4 text-accent" />
              Log out
            </button>
          </div>
        )}
      </div>

      <TaskDetail />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
