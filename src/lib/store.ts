import { create } from "zustand";
import { applyBoard, emptyBoard, type BoardAction, type BoardState } from "./board-ops";
import { loadBoard, pushBoard, registerAccount, unlockBoard } from "./fieldline.functions";
import type { ColumnId, Photo, Priority, Role, TabId, TimeEntry, TimeKind } from "./types";
import { uid } from "./utils";

export const SESSION_KEY = "fieldline-session";

type FieldState = BoardState & {
  hydrated: boolean;
  live: boolean;
  version: number;
  pending: number;
  currentUserId: string | null;
  tab: TabId;
  openTaskId: string | null;
  openChatId: string | null;
  assignOpen: boolean;
  setHydrated: () => void;
  adopt: (payload: { employeeId: string; state: BoardState; version: number }) => void;
  applyRemote: (payload: { employeeId: string; state: BoardState; version: number }) => void;
  setUser: (id: string | null) => void;
  setTab: (tab: TabId) => void;
  openTask: (id: string | null) => void;
  openChat: (id: string | null) => void;
  setAssignOpen: (open: boolean) => void;
  clockIn: () => void;
  clockOut: () => void;
  clockInEmployee: (employeeId: string) => void;
  clockOutEmployee: (employeeId: string) => void;
  startJob: (taskId: string) => void;
  stopOpenAux: (employeeId?: string) => void;
  startAux: (kind: Exclude<TimeKind, "shift">, taskId?: string, note?: string) => void;
  setTaskStatus: (taskId: string, status: ColumnId) => boolean;
  assignTask: (taskId: string, assigneeIds: string[]) => void;
  addPhoto: (taskId: string, photo: Omit<Photo, "id" | "createdAt">) => void;
  addComment: (taskId: string, body: string) => void;
  createTask: (input: {
    title: string;
    description: string;
    projectId: string;
    assigneeIds: string[];
    dueAt: string;
    priority: Priority;
    billable: boolean;
  }) => string;
  sendMessage: (chatId: string, body: string) => void;
  createChat: (name: string, memberIds: string[], projectId?: string) => string;
  setChatMembers: (chatId: string, memberIds: string[]) => void;
  markNoticesRead: () => void;
  addEmployee: (input: { name: string; trade: string; role: Role; pin: string; phone: string; email: string; address: string }) => Promise<"ok" | "bad" | "taken" | "reserved">;
  removeEmployee: (employeeId: string) => void;
  approveEmployee: (employeeId: string) => void;
  adminUpdateEmployee: (input: {
    employeeId: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    trade: string;
    role: Role;
    pin: string;
  }) => Promise<"ok" | "bad" | "taken">;
  register: (input: {
    name: string;
    phone: string;
    address: string;
    role: "admin" | "worker";
    pin: string;
  }) => Promise<"ok" | "pending" | "bad" | "taken">;
  updateProfile: (input: { name: string; phone: string; email: string; address: string; pin: string }) => Promise<"ok" | "bad" | "taken">;
  addProject: (name: string) => string;
  unlock: (pin: string) => Promise<"ok" | "bad" | "pending">;
};

const blank = emptyBoard();

let queue: Promise<void> = Promise.resolve();

function slice(s: FieldState): BoardState {
  return {
    employees: s.employees,
    projects: s.projects,
    tasks: s.tasks,
    timeEntries: s.timeEntries,
    chats: s.chats,
    messages: s.messages,
    notices: s.notices,
  };
}

export const useFieldStore = create<FieldState>()((set, get) => {
  const commit = (action: BoardAction) => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    const applied = applyBoard(slice(get()), action);
    set({ ...applied.state, pending: get().pending + 1, live: true });
    if (!token || !applied.ok) {
      set({ pending: Math.max(0, get().pending - 1) });
      return Promise.resolve(applied);
    }
    const run = queue.then(async () => {
      try {
        const res = await pushBoard({ data: { token, action } });
        if (res) {
          set((s) => ({
            ...(s.pending <= 1 ? res.state : {}),
            version: res.version,
            live: true,
            pending: Math.max(0, s.pending - 1),
          }));
        } else {
          set((s) => ({ live: false, pending: Math.max(0, s.pending - 1) }));
        }
        return res;
      } catch {
        set({ live: false, pending: Math.max(0, get().pending - 1) });
        return null;
      }
    });
    queue = run.then(() => undefined);
    return run;
  };

  return {
    hydrated: false,
    live: false,
    version: 0,
    pending: 0,
    currentUserId: null,
    tab: "home",
    openTaskId: null,
    openChatId: null,
    assignOpen: false,
    ...blank,
    setHydrated: () => set({ hydrated: true }),
    adopt: (payload) =>
      set({
        ...payload.state,
        version: payload.version,
        currentUserId: payload.employeeId,
        hydrated: true,
        live: true,
        tab: "home",
        openTaskId: null,
        openChatId: null,
        assignOpen: false,
      }),
    applyRemote: (payload) => {
      if (get().pending > 0) return;
      if (payload.version === get().version) return;
      set({ ...payload.state, version: payload.version, live: true, hydrated: true });
    },
    setUser: (id) => {
      if (!id && typeof localStorage !== "undefined") localStorage.removeItem(SESSION_KEY);
      set({ currentUserId: id, tab: "home", openTaskId: null, openChatId: null, assignOpen: false });
    },
    setTab: (tab) => set({ tab, openTaskId: null, openChatId: tab === "chat" ? get().openChatId : null }),
    openTask: (id) => set({ openTaskId: id }),
    openChat: (id) => set({ openChatId: id, tab: "chat", openTaskId: null }),
    setAssignOpen: (open) => set({ assignOpen: open }),
    clockIn: () => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "clockIn", employeeId: me });
    },
    clockOut: () => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "clockOut", employeeId: me });
    },
    clockInEmployee: (employeeId) => {
      void commit({ type: "clockIn", employeeId });
    },
    clockOutEmployee: (employeeId) => {
      void commit({ type: "clockOut", employeeId });
    },
    stopOpenAux: (employeeId) => {
      const me = employeeId ?? get().currentUserId;
      if (!me) return;
      void commit({ type: "stopAux", employeeId: me });
    },
    startJob: (taskId) => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "startJob", employeeId: me, taskId });
    },
    startAux: (kind, taskId, note) => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "startAux", employeeId: me, kind, taskId, note });
    },
    setTaskStatus: (taskId, status) => {
      const applied = applyBoard(slice(get()), { type: "setStatus", taskId, status });
      if (!applied.ok) return false;
      void commit({ type: "setStatus", taskId, status });
      return true;
    },
    assignTask: (taskId, assigneeIds) => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "assign", taskId, assigneeIds, actorId: me });
    },
    addPhoto: (taskId, photo) => {
      void commit({ type: "photo", taskId, dataUrl: photo.dataUrl, caption: photo.caption });
    },
    addComment: (taskId, body) => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "comment", taskId, authorId: me, body });
    },
    createTask: (input) => {
      const me = get().currentUserId;
      const id = uid("t");
      if (!me) return id;
      void commit({ type: "createTask", id, actorId: me, ...input });
      return id;
    },
    sendMessage: (chatId, body) => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "message", chatId, authorId: me, body });
    },
    createChat: (name, memberIds, projectId) => {
      const me = get().currentUserId;
      const id = uid("ch");
      if (!me) return id;
      void commit({ type: "createChat", id, actorId: me, name, memberIds, projectId });
      return id;
    },
    setChatMembers: (chatId, memberIds) => {
      void commit({ type: "setChatMembers", chatId, memberIds });
    },
    markNoticesRead: () => {
      const me = get().currentUserId;
      if (!me) return;
      void commit({ type: "markRead", employeeId: me });
    },
    addEmployee: async (input) => {
      const id = uid("e");
      const local = applyBoard(slice(get()), { type: "addEmployee", id, ...input });
      if (!local.ok) return local.status ?? "bad";
      const res = await commit({ type: "addEmployee", id, ...input });
      if (res && "status" in res && res.status) return res.status;
      return "ok";
    },
    removeEmployee: (employeeId) => {
      void commit({ type: "removeEmployee", employeeId });
    },
    approveEmployee: (employeeId) => {
      void commit({ type: "approveEmployee", employeeId });
    },
    adminUpdateEmployee: async (input) => {
      const action = { type: "adminUpdateEmployee" as const, ...input };
      const local = applyBoard(slice(get()), action);
      if (!local.ok) return local.status === "taken" ? "taken" : "bad";
      const res = await commit(action);
      if (res && "status" in res && res.status === "taken") return "taken";
      if (res && "ok" in res && res.ok === false) return "bad";
      return "ok";
    },
    register: async (input) => {
      const res = await registerAccount({ data: input });
      if (!res?.ok) return res?.status === "taken" ? "taken" : "bad";
      return res.status === "pending" ? "pending" : "ok";
    },
    updateProfile: async (input) => {
      const employeeId = get().currentUserId;
      if (!employeeId) return "bad";
      const action = { type: "updateProfile" as const, employeeId, ...input };
      const local = applyBoard(slice(get()), action);
      if (!local.ok) return local.status === "taken" ? "taken" : "bad";
      const res = await commit(action);
      if (res && "status" in res && res.status === "taken") return "taken";
      if (res && "ok" in res && res.ok === false) return "bad";
      return "ok";
    },
    addProject: (name) => {
      const existing = get().projects.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) return existing.id;
      const id = uid("p");
      void commit({ type: "addProject", id, name });
      return id;
    },
    unlock: async (pin) => {
      const res = await unlockBoard({ data: { pin } });
      if (!res) return "bad";
      if ("pending" in res && res.pending) return "pending";
      localStorage.setItem(SESSION_KEY, res.token);
      get().adopt(res);
      return "ok";
    },
  };
});

export function useMe() {
  return useFieldStore((s) => s.employees.find((e) => e.id === s.currentUserId) ?? null);
}

export function openShift(employeeId: string, entries: TimeEntry[]) {
  return entries.find((e) => e.employeeId === employeeId && e.kind === "shift" && !e.endedAt) ?? null;
}

export function openAux(employeeId: string, entries: TimeEntry[]) {
  return entries.find((e) => e.employeeId === employeeId && e.kind !== "shift" && !e.endedAt) ?? null;
}

export async function refreshBoard() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    useFieldStore.getState().setHydrated();
    return;
  }
  try {
    const res = await loadBoard({ data: { token } });
    if (!res) {
      localStorage.removeItem(SESSION_KEY);
      useFieldStore.setState({ currentUserId: null, hydrated: true, live: false });
      return;
    }
    const s = useFieldStore.getState();
    if (!s.currentUserId) s.adopt(res);
    else s.applyRemote(res);
  } catch {
    useFieldStore.setState({ hydrated: true, live: false });
  }
}
