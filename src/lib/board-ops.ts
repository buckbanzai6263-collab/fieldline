import { MASTER_PIN, OWNER_ID } from "./seed";
import type { ChatMessage, ChatRoom, ColumnId, Comment, Employee, Notice, Photo, Priority, Project, Role, Task, TimeEntry, TimeKind } from "./types";
import { uid } from "./utils";

export type BoardState = {
  employees: Employee[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  chats: ChatRoom[];
  messages: ChatMessage[];
  notices: Notice[];
};

export type BoardAction =
  | { type: "clockIn"; employeeId: string }
  | { type: "clockOut"; employeeId: string }
  | { type: "stopAux"; employeeId: string }
  | { type: "startJob"; employeeId: string; taskId: string }
  | { type: "startAux"; employeeId: string; kind: Exclude<TimeKind, "shift">; taskId?: string; note?: string }
  | { type: "setStatus"; taskId: string; status: ColumnId }
  | { type: "assign"; taskId: string; assigneeIds: string[]; actorId: string }
  | { type: "photo"; taskId: string; dataUrl: string; caption: string }
  | { type: "comment"; taskId: string; authorId: string; body: string }
  | {
      type: "createTask";
      id: string;
      actorId: string;
      title: string;
      description: string;
      projectId: string;
      assigneeIds: string[];
      dueAt: string;
      priority: Priority;
      billable: boolean;
    }
  | { type: "message"; chatId: string; authorId: string; body: string }
  | { type: "createChat"; id: string; actorId: string; name: string; memberIds: string[]; projectId?: string }
  | { type: "setChatMembers"; chatId: string; memberIds: string[] }
  | { type: "addEmployee"; id: string; name: string; trade: string; role: Role; pin: string }
  | { type: "addProject"; id: string; name: string }
  | { type: "markRead"; employeeId: string };

export type ApplyResult = { state: BoardState; ok: boolean; status?: "ok" | "bad" | "taken"; id?: string };

export function emptyBoard(): BoardState {
  return {
    employees: [
      {
        id: OWNER_ID,
        name: "Owner",
        role: "admin",
        trade: "Master",
        initials: "OW",
        phone: "",
        pin: MASTER_PIN,
      },
    ],
    projects: [],
    tasks: [],
    timeEntries: [],
    chats: [],
    messages: [],
    notices: [],
  };
}

function stopOpen(entries: TimeEntry[], employeeId: string, kinds?: TimeKind[]) {
  const now = new Date().toISOString();
  return entries.map((e) => {
    if (e.employeeId !== employeeId || e.endedAt) return e;
    if (kinds && !kinds.includes(e.kind)) return e;
    return { ...e, endedAt: now };
  });
}

function jobChatName(task: Task, sites: Project[]) {
  const site = sites.find((p) => p.id === task.projectId);
  const short = task.title.split("—")[0].split("·")[0].trim();
  return site ? `${short} · ${site.name}` : short;
}

function syncJobChat(state: BoardState, task: Task, createdBy: string): BoardState {
  const members = Array.from(new Set([...task.assigneeIds, createdBy]));
  const existing = state.chats.find((c) => c.taskId === task.id);
  if (existing) {
    const extras = existing.memberIds.filter((id) => !members.includes(id));
    return {
      ...state,
      chats: state.chats.map((c) =>
        c.id === existing.id ? { ...c, memberIds: Array.from(new Set([...members, ...extras])) } : c,
      ),
    };
  }
  const id = uid("ch");
  const room: ChatRoom = {
    id,
    name: jobChatName(task, state.projects),
    memberIds: members,
    createdBy,
    projectId: task.projectId,
    taskId: task.id,
  };
  const intro: ChatMessage = {
    id: uid("m"),
    chatId: id,
    authorId: createdBy,
    body: `Job chat opened. This room is the crew on “${task.title}”.`,
    createdAt: new Date().toISOString(),
  };
  return { ...state, chats: [room, ...state.chats], messages: [...state.messages, intro] };
}

export function applyBoard(state: BoardState, action: BoardAction): ApplyResult {
  switch (action.type) {
    case "clockIn": {
      const open = state.timeEntries.find((e) => e.employeeId === action.employeeId && e.kind === "shift" && !e.endedAt);
      if (open) return { state, ok: true };
      return {
        ok: true,
        state: {
          ...state,
          timeEntries: [
            ...state.timeEntries,
            { id: uid("te"), employeeId: action.employeeId, kind: "shift", startedAt: new Date().toISOString() },
          ],
        },
      };
    }
    case "clockOut":
      return { ok: true, state: { ...state, timeEntries: stopOpen(state.timeEntries, action.employeeId) } };
    case "stopAux":
      return {
        ok: true,
        state: { ...state, timeEntries: stopOpen(state.timeEntries, action.employeeId, ["job", "travel", "supply"]) },
      };
    case "startJob": {
      const shift = state.timeEntries.find((e) => e.employeeId === action.employeeId && e.kind === "shift" && !e.endedAt);
      if (!shift) return { state, ok: false };
      return {
        ok: true,
        state: {
          ...state,
          timeEntries: [
            ...stopOpen(state.timeEntries, action.employeeId, ["job", "travel", "supply"]),
            { id: uid("te"), employeeId: action.employeeId, kind: "job", taskId: action.taskId, startedAt: new Date().toISOString() },
          ],
          tasks: state.tasks.map((t) => (t.id === action.taskId && t.status === "todo" ? { ...t, status: "in_progress" } : t)),
        },
      };
    }
    case "startAux": {
      const shift = state.timeEntries.find((e) => e.employeeId === action.employeeId && e.kind === "shift" && !e.endedAt);
      if (!shift) return { state, ok: false };
      return {
        ok: true,
        state: {
          ...state,
          timeEntries: [
            ...stopOpen(state.timeEntries, action.employeeId, ["job", "travel", "supply"]),
            {
              id: uid("te"),
              employeeId: action.employeeId,
              kind: action.kind,
              taskId: action.taskId,
              note: action.note,
              startedAt: new Date().toISOString(),
            },
          ],
        },
      };
    }
    case "setStatus": {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return { state, ok: false };
      if (action.status === "done" && task.photos.length === 0) return { state, ok: false };
      return {
        ok: true,
        state: { ...state, tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, status: action.status } : t)) },
      };
    }
    case "assign": {
      const task = state.tasks.find((t) => t.id === action.taskId);
      if (!task) return { state, ok: false };
      const ids = Array.from(new Set(action.assigneeIds));
      const added = ids.filter((id) => !task.assigneeIds.includes(id));
      const nextTask = { ...task, assigneeIds: ids };
      const synced = syncJobChat({ ...state, tasks: state.tasks.map((t) => (t.id === task.id ? nextTask : t)) }, nextTask, action.actorId);
      return {
        ok: true,
        state: {
          ...synced,
          notices: [
            ...added.map((employeeId) => ({
              id: uid("n"),
              employeeId,
              title: `Assigned · ${task.title}`,
              body: "Open Fieldline and start the job when you arrive.",
              read: false,
              createdAt: new Date().toISOString(),
            })),
            ...state.notices,
          ],
        },
      };
    }
    case "photo": {
      const next: Photo = { id: uid("ph"), dataUrl: action.dataUrl, caption: action.caption, createdAt: new Date().toISOString() };
      return {
        ok: true,
        state: {
          ...state,
          tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, photos: [next, ...t.photos] } : t)),
        },
      };
    }
    case "comment": {
      if (!action.body.trim()) return { state, ok: false };
      const comment: Comment = {
        id: uid("c"),
        authorId: action.authorId,
        body: action.body.trim(),
        createdAt: new Date().toISOString(),
      };
      return {
        ok: true,
        state: {
          ...state,
          tasks: state.tasks.map((t) => (t.id === action.taskId ? { ...t, comments: [...t.comments, comment] } : t)),
        },
      };
    }
    case "createTask": {
      const assigneeIds = Array.from(new Set(action.assigneeIds));
      const task: Task = {
        id: action.id,
        title: action.title,
        description: action.description,
        projectId: action.projectId,
        assigneeIds,
        dueAt: action.dueAt,
        priority: action.priority,
        billable: action.billable,
        status: "todo",
        photos: [],
        comments: [],
      };
      const synced = syncJobChat({ ...state, tasks: [task, ...state.tasks] }, task, action.actorId);
      return {
        ok: true,
        id: action.id,
        state: {
          ...synced,
          notices: [
            ...assigneeIds.map((employeeId) => ({
              id: uid("n"),
              employeeId,
              title: `Assigned · ${action.title}`,
              body: "New job on your board. Job chat is open.",
              read: false,
              createdAt: new Date().toISOString(),
            })),
            ...state.notices,
          ],
        },
      };
    }
    case "message": {
      if (!action.body.trim()) return { state, ok: false };
      return {
        ok: true,
        state: {
          ...state,
          messages: [
            ...state.messages,
            { id: uid("m"), chatId: action.chatId, authorId: action.authorId, body: action.body.trim(), createdAt: new Date().toISOString() },
          ],
        },
      };
    }
    case "createChat": {
      const room: ChatRoom = {
        id: action.id,
        name: action.name,
        memberIds: Array.from(new Set([action.actorId, ...action.memberIds])),
        createdBy: action.actorId,
        projectId: action.projectId,
      };
      return { ok: true, id: action.id, state: { ...state, chats: [...state.chats, room] } };
    }
    case "setChatMembers":
      return {
        ok: true,
        state: {
          ...state,
          chats: state.chats.map((c) => (c.id === action.chatId ? { ...c, memberIds: action.memberIds } : c)),
        },
      };
    case "addEmployee": {
      const pin = action.pin.trim();
      const name = action.name.trim();
      if (!name || !/^\d{4}$/.test(pin) || pin === MASTER_PIN) return { state, ok: false, status: "bad" };
      if (state.employees.some((e) => e.pin === pin)) return { state, ok: false, status: "taken" };
      const initials = name
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const emp: Employee = {
        id: action.id,
        name,
        role: action.role,
        trade: action.trade.trim() || "Field",
        initials: initials || "??",
        phone: "",
        pin,
      };
      return { ok: true, status: "ok", id: action.id, state: { ...state, employees: [...state.employees, emp] } };
    }
    case "addProject": {
      const trimmed = action.name.trim();
      const existing = state.projects.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return { state, ok: true, id: existing.id };
      const project: Project = { id: action.id, name: trimmed, site: trimmed, client: "", urgent: false };
      return { ok: true, id: action.id, state: { ...state, projects: [...state.projects, project] } };
    }
    case "markRead":
      return {
        ok: true,
        state: {
          ...state,
          notices: state.notices.map((n) => (n.employeeId === action.employeeId ? { ...n, read: true } : n)),
        },
      };
    default:
      return { state, ok: false };
  }
}

export function redactBoard(state: BoardState, viewerId: string | null): BoardState {
  const viewer = state.employees.find((e) => e.id === viewerId);
  const showPins = viewer?.role === "admin";
  if (showPins) return state;
  return {
    ...state,
    employees: state.employees.map((e) => ({ ...e, pin: "" })),
  };
}
