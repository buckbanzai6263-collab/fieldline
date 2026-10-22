import { MASTER_ADMIN_ID, MASTER_ADMIN_NAME, MASTER_ADMIN_PIN, OWNER_ID, SUPPORT_AUTHOR_ID, SUPPORT_AUTHOR_NAME } from "./seed";
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
  | { type: "addEmployee"; id: string; name: string; trade: string; role: Role; pin: string; phone?: string; email?: string; address?: string }
  | { type: "register"; id: string; name: string; phone: string; address: string; role: "admin" | "worker"; pin: string }
  | { type: "approveEmployee"; employeeId: string }
  | { type: "removeEmployee"; employeeId: string }
  | {
      type: "adminUpdateEmployee";
      employeeId: string;
      name: string;
      phone: string;
      email: string;
      address: string;
      trade: string;
      role: Role;
      pin: string;
    }
  | { type: "updateProfile"; employeeId: string; name: string; phone: string; email: string; address: string; pin: string }
  | { type: "addProject"; id: string; name: string }
  | { type: "markRead"; employeeId: string };

export type ApplyResult = { state: BoardState; ok: boolean; status?: "ok" | "bad" | "taken" | "reserved"; id?: string };

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
        address: "",
        pin: "",
        status: "active",
      },
      {
        id: MASTER_ADMIN_ID,
        name: MASTER_ADMIN_NAME,
        role: "admin",
        trade: "Master",
        initials: "VN",
        phone: "",
        address: "",
        pin: MASTER_ADMIN_PIN,
        status: "active",
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
  const members = Array.from(new Set(task.assigneeIds));
  const existing = state.chats.find((c) => c.taskId === task.id);
  if (existing) {
    return {
      ...state,
      chats: state.chats.map((c) =>
        c.id === existing.id ? { ...c, name: jobChatName(task, state.projects), memberIds: members } : c,
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
    authorId: members[0] ?? createdBy,
    body: `Job chat opened. Only the people assigned to “${task.title}” are in this text.`,
    createdAt: new Date().toISOString(),
  };
  return { ...state, chats: [room, ...state.chats], messages: [...state.messages, intro] };
}

export function alignJobChats(state: BoardState): BoardState {
  let changed = false;
  const chats = state.chats.map((chat) => {
    if (!chat.taskId) return chat;
    const task = state.tasks.find((t) => t.id === chat.taskId);
    if (!task) return chat;
    const members = Array.from(new Set(task.assigneeIds));
    const same = members.length === chat.memberIds.length && members.every((id) => chat.memberIds.includes(id));
    if (same && chat.name === jobChatName(task, state.projects)) return chat;
    changed = true;
    return { ...chat, name: jobChatName(task, state.projects), memberIds: members };
  });
  return changed ? { ...state, chats } : state;
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
      if (task.assigneeIds.includes(MASTER_ADMIN_ID) && !ids.includes(MASTER_ADMIN_ID)) ids.push(MASTER_ADMIN_ID);
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
      const body = action.body.trim();
      const chat = state.chats.find((c) => c.id === action.chatId);
      const author = state.employees.find((e) => e.id === action.authorId);
      const authorIsAdmin = author?.role === "admin" || action.authorId === MASTER_ADMIN_ID;
      if (!chat || (!chat.memberIds.includes(action.authorId) && !authorIsAdmin)) return { state, ok: false };
      const recipients = Array.from(
        new Set([
          ...chat.memberIds,
          ...state.employees.filter((e) => e.role === "admin" || e.id === MASTER_ADMIN_ID).map((e) => e.id),
        ]),
      ).filter((id) => id !== action.authorId);
      return {
        ok: true,
        state: {
          ...state,
          messages: [
            ...state.messages,
            { id: uid("m"), chatId: action.chatId, authorId: action.authorId, body, createdAt: new Date().toISOString() },
          ],
          notices: [
            ...recipients.map((employeeId) => ({
              id: uid("n"),
              employeeId,
              chatId: action.chatId,
              title: author?.id === MASTER_ADMIN_ID ? `${SUPPORT_AUTHOR_NAME} · ${chat?.name ?? "Chat"}` : `${author?.name ?? "Crew"} · ${chat?.name ?? "Chat"}`,
              body: body.slice(0, 160),
              read: false,
              createdAt: new Date().toISOString(),
            })),
            ...state.notices,
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
          chats: state.chats.map((c) => {
            if (c.id !== action.chatId) return c;
            if (c.taskId) {
              const task = state.tasks.find((t) => t.id === c.taskId);
              return { ...c, memberIds: task ? Array.from(new Set(task.assigneeIds)) : c.memberIds };
            }
            const memberIds = Array.from(new Set(action.memberIds));
            if (c.memberIds.includes(MASTER_ADMIN_ID) && !memberIds.includes(MASTER_ADMIN_ID)) memberIds.push(MASTER_ADMIN_ID);
            return { ...c, memberIds };
          }),
        },
      };
    case "addEmployee": {
      const pin = action.pin.trim();
      const name = action.name.trim();
      if (!name || !/^\d{4}$/.test(pin)) return { state, ok: false, status: "bad" };
      if (pin === MASTER_ADMIN_PIN) return { state, ok: false, status: "reserved" };
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
        phone: (action.phone ?? "").trim().slice(0, 32),
        email: (action.email ?? "").trim().slice(0, 80),
        address: (action.address ?? "").trim().slice(0, 160),
        pin,
        status: "active",
      };
      return { ok: true, status: "ok", id: action.id, state: { ...state, employees: [...state.employees, emp] } };
    }
    case "register": {
      const pin = action.pin.trim();
      const name = action.name.trim();
      const role = action.role === "admin" ? "admin" : "worker";
      if (!name || !/^\d{4}$/.test(pin) || pin === MASTER_ADMIN_PIN) {
        return { state, ok: false, status: "bad" };
      }
      if (state.employees.some((e) => e.pin === pin || e.name.toLowerCase() === name.toLowerCase())) {
        return { state, ok: false, status: "taken" };
      }
      const initials = name
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const emp: Employee = {
        id: action.id,
        name,
        role,
        trade: role === "admin" ? "Admin" : "Field Tech",
        initials: initials || "??",
        phone: action.phone.trim().slice(0, 32),
        address: action.address.trim().slice(0, 160),
        pin,
        status: role === "admin" ? "pending" : "active",
      };
      return { ok: true, status: "ok", id: action.id, state: { ...state, employees: [...state.employees, emp] } };
    }
    case "approveEmployee": {
      const target = state.employees.find((e) => e.id === action.employeeId);
      if (!target || target.status !== "pending") return { state, ok: false, status: "bad" };
      return {
        ok: true,
        status: "ok",
        state: {
          ...state,
          employees: state.employees.map((e) => (e.id === target.id ? { ...e, status: "active" } : e)),
        },
      };
    }
    case "removeEmployee": {
      if (action.employeeId === MASTER_ADMIN_ID) return { state, ok: false, status: "bad" };
      if (!state.employees.some((e) => e.id === action.employeeId)) return { state, ok: false, status: "bad" };
      return {
        ok: true,
        status: "ok",
        state: {
          ...state,
          employees: state.employees.filter((e) => e.id !== action.employeeId),
          tasks: state.tasks.map((t) => ({
            ...t,
            assigneeIds: t.assigneeIds.filter((id) => id !== action.employeeId),
          })),
          chats: state.chats.map((c) => ({
            ...c,
            memberIds: c.memberIds.filter((id) => id !== action.employeeId),
          })),
          notices: state.notices.filter((n) => n.employeeId !== action.employeeId),
        },
      };
    }
    case "adminUpdateEmployee": {
      const name = action.name.trim();
      const phone = action.phone.trim().slice(0, 32);
      const email = action.email.trim().slice(0, 80);
      const address = action.address.trim().slice(0, 160);
      const trade = action.trade.trim().slice(0, 40);
      const pin = action.pin.trim();
      const current = state.employees.find((e) => e.id === action.employeeId);
      if (!current || !name) return { state, ok: false, status: "bad" };
      const role = current.id === MASTER_ADMIN_ID ? "admin" : action.role === "admin" ? "admin" : "worker";
      if (pin && !/^\d{4}$/.test(pin)) return { state, ok: false, status: "bad" };
      if (pin === MASTER_ADMIN_PIN && current.id !== MASTER_ADMIN_ID) return { state, ok: false, status: "bad" };
      if (pin && state.employees.some((e) => e.id !== current.id && e.pin === pin)) {
        return { state, ok: false, status: "taken" };
      }
      if (state.employees.some((e) => e.id !== current.id && e.name.toLowerCase() === name.toLowerCase())) {
        return { state, ok: false, status: "taken" };
      }
      const initials = name
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return {
        ok: true,
        status: "ok",
        state: {
          ...state,
          employees: state.employees.map((e) =>
            e.id === current.id
              ? {
                  ...e,
                  name,
                  phone,
                  email,
                  address,
                  trade: trade || e.trade,
                  role,
                  initials: initials || e.initials,
                  pin: pin || e.pin,
                }
              : e,
          ),
        },
      };
    }
    case "updateProfile": {
      const name = action.name.trim();
      const phone = action.phone.trim().slice(0, 32);
      const email = action.email.trim().slice(0, 80);
      const address = action.address.trim().slice(0, 160);
      const pin = action.pin.trim();
      const current = state.employees.find((e) => e.id === action.employeeId);
      if (!current || !name) return { state, ok: false, status: "bad" };
      if (pin && (!/^\d{4}$/.test(pin) || (pin === MASTER_ADMIN_PIN && current.id !== MASTER_ADMIN_ID))) {
        return { state, ok: false, status: "bad" };
      }
      if (pin && state.employees.some((e) => e.id !== current.id && e.pin === pin)) {
        return { state, ok: false, status: "taken" };
      }
      const initials = name
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return {
        ok: true,
        status: "ok",
        state: {
          ...state,
          employees: state.employees.map((e) =>
            e.id === current.id
              ? { ...e, name, phone, email, address, initials: initials || e.initials, pin: pin || e.pin }
              : e,
          ),
        },
      };
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
  const hideMaster = viewerId !== MASTER_ADMIN_ID;
  const viewerIsAdmin = viewer?.role === "admin" || viewerId === MASTER_ADMIN_ID;
  let hidden: BoardState = hideMaster
    ? {
        ...state,
        employees: state.employees.filter((e) => e.id !== MASTER_ADMIN_ID),
        tasks: state.tasks.map((t) => ({
          ...t,
          assigneeIds: t.assigneeIds.filter((id) => id !== MASTER_ADMIN_ID),
          comments: t.comments.map((c) => (c.authorId === MASTER_ADMIN_ID ? { ...c, authorId: SUPPORT_AUTHOR_ID } : c)),
        })),
        chats: state.chats.map((c) => ({
          ...c,
          memberIds: c.memberIds.filter((id) => id !== MASTER_ADMIN_ID),
          createdBy: c.createdBy === MASTER_ADMIN_ID ? "" : c.createdBy,
        })),
        messages: state.messages.map((m) => (m.authorId === MASTER_ADMIN_ID ? { ...m, authorId: SUPPORT_AUTHOR_ID } : m)),
        timeEntries: state.timeEntries.filter((e) => e.employeeId !== MASTER_ADMIN_ID),
        notices: state.notices
          .filter((n) => n.employeeId !== MASTER_ADMIN_ID)
          .map((n) => ({ ...n, title: n.title.replaceAll(MASTER_ADMIN_NAME, "Office") })),
      }
    : state;
  if (!viewerIsAdmin) {
    const allowed = new Set(hidden.chats.filter((c) => c.taskId && c.memberIds.includes(viewerId ?? "")).map((c) => c.id));
    hidden = {
      ...hidden,
      chats: hidden.chats.filter((c) => allowed.has(c.id)),
      messages: hidden.messages.filter((m) => allowed.has(m.chatId)),
    };
  }
  if (viewerIsAdmin) return hidden;
  return {
    ...hidden,
    employees: hidden.employees.map((e) => ({ ...e, pin: "" })),
  };
}
