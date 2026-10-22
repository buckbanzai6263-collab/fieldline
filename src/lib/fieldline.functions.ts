import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { applyBoard, alignJobChats, emptyBoard, redactBoard, type BoardAction, type BoardState } from "@/lib/board-ops";
import { getSql } from "@/lib/db";
import { MASTER_ADMIN_ID, MASTER_ADMIN_PIN, SUPPORT_AUTHOR_NAME } from "@/lib/seed";
import { uid } from "@/lib/utils";

const BOARD_ID = "main";

type Row = { version: number; state: BoardState };

function asState(value: unknown): BoardState {
  if (!value || typeof value !== "object") return emptyBoard();
  const row = value as BoardState;
  return {
    employees: Array.isArray(row.employees) ? row.employees : [],
    projects: Array.isArray(row.projects) ? row.projects : [],
    tasks: Array.isArray(row.tasks) ? row.tasks : [],
    timeEntries: Array.isArray(row.timeEntries) ? row.timeEntries : [],
    chats: Array.isArray(row.chats) ? row.chats : [],
    messages: Array.isArray(row.messages) ? row.messages : [],
    notices: Array.isArray(row.notices) ? row.notices : [],
  };
}

function pinKey(pin: string) {
  return createHash("sha256").update(`fieldline:${pin}`).digest();
}

function pinsMatch(stored: string, attempt: string) {
  const a = pinKey(stored);
  const b = pinKey(attempt);
  return timingSafeEqual(a, b);
}

async function readBoard() {
  const sql = await getSql();
  const rows = await sql<Row>`select version, state from fl_board where id = ${BOARD_ID}`;
  const row = rows[0];
  if (!row) return { version: 1, state: emptyBoard() };
  const version = Number(row.version);
  const state = asState(row.state);
  const aligned = alignJobChats(state);
  if (aligned === state) return { version, state };
  const next = await writeBoard(version, aligned);
  return { version: next ?? version, state: aligned };
}

async function writeBoard(version: number, state: BoardState) {
  const sql = await getSql();
  const rows = await sql<{ version: number }>`
    update fl_board
    set state = ${JSON.stringify(state)}::jsonb, version = version + 1
    where id = ${BOARD_ID} and version = ${version}
    returning version
  `;
  return rows[0] ? Number(rows[0].version) : null;
}

async function sessionEmployee(token: string) {
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<{ employee_id: string }>`select employee_id from fl_session where token = ${token}`;
  return rows[0]?.employee_id ?? null;
}

function view(state: BoardState, employeeId: string, version: number) {
  return { version, employeeId, state: redactBoard(state, employeeId) };
}

export const unlockBoard = createServerFn({ method: "POST" })
  .validator((input: { pin: string }) => input)
  .handler(async ({ data }) => {
    const pin = String(data?.pin ?? "");
    if (!/^\d{4}$/.test(pin)) return null;
    const board = await readBoard();
    const match = board.state.employees.find((e) => e.pin && pinsMatch(e.pin, pin));
    if (match?.status === "pending") return { pending: true as const };
    if (!match) return null;
    const employeeId = match.id;
    const token = randomBytes(24).toString("hex");
    const sql = await getSql();
    await sql`insert into fl_session (token, employee_id) values (${token}, ${employeeId})`;
    return { token, ...view(board.state, employeeId, board.version) };
  });

export const loadBoard = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const employeeId = await sessionEmployee(String(data?.token ?? ""));
    if (!employeeId) return null;
    const board = await readBoard();
    return view(board.state, employeeId, board.version);
  });

export const pushBoard = createServerFn({ method: "POST" })
  .validator((input: { token: string; action: BoardAction }) => input)
  .handler(async ({ data }) => {
    const employeeId = await sessionEmployee(String(data?.token ?? ""));
    if (!employeeId || !data?.action) return null;
    const action =
      data.action.type === "updateProfile" ? { ...data.action, employeeId } : data.action;
    if (action.type === "register") return null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const board = await readBoard();
      const actor = board.state.employees.find((e) => e.id === employeeId);
      const actorIsAdmin = actor?.role === "admin" || actor?.id === MASTER_ADMIN_ID;
      const denied =
        (action.type === "addEmployee" && !actorIsAdmin) ||
        (action.type === "adminUpdateEmployee" && !actorIsAdmin) ||
        (action.type === "removeEmployee" &&
          (!actorIsAdmin || action.employeeId === MASTER_ADMIN_ID || action.employeeId === employeeId)) ||
        ((action.type === "clockIn" || action.type === "clockOut") && action.employeeId !== employeeId && !actorIsAdmin) ||
        (action.type === "approveEmployee" && employeeId !== MASTER_ADMIN_ID);
      if (denied) {
        return { ...view(board.state, employeeId, board.version), ok: false, status: "bad" as const, id: null };
      }
      const previousPin = board.state.employees.find((e) => e.id === (action.type === "adminUpdateEmployee" ? action.employeeId : ""))?.pin;
      const applied = applyBoard(board.state, action);
      const nextVersion = await writeBoard(board.version, applied.state);
      if (nextVersion != null) {
        if (applied.ok && action.type === "removeEmployee") {
          const sql = await getSql();
          await sql`delete from fl_session where employee_id = ${action.employeeId}`;
          await sql`delete from fl_push where employee_id = ${action.employeeId}`;
        }
        if (applied.ok && action.type === "message") {
          const chat = applied.state.chats.find((c) => c.id === action.chatId);
          const author = applied.state.employees.find((e) => e.id === employeeId);
          const recipients = Array.from(
            new Set([
              ...(chat?.memberIds ?? []),
              ...applied.state.employees.filter((e) => e.role === "admin" || e.id === MASTER_ADMIN_ID).map((e) => e.id),
            ]),
          ).filter((id) => id !== employeeId);
          const { notifyEmployees } = await import("@/lib/push.server");
          void notifyEmployees(recipients, {
            title: author?.id === MASTER_ADMIN_ID ? `${SUPPORT_AUTHOR_NAME} · ${chat?.name ?? "Chat"}` : `${author?.name ?? "Crew"} · ${chat?.name ?? "Chat"}`,
            body: action.body.trim().slice(0, 160),
          }).catch(() => undefined);
        }
        if (
          applied.ok &&
          action.type === "adminUpdateEmployee" &&
          action.pin.trim() &&
          previousPin &&
          action.pin.trim() !== previousPin
        ) {
          const sql = await getSql();
          await sql`delete from fl_session where employee_id = ${action.employeeId} and token <> ${String(data.token ?? "")}`;
        }
        return { ...view(applied.state, employeeId, nextVersion), ok: applied.ok, status: applied.status ?? null, id: applied.id ?? null };
      }
    }
    return null;
  });

export const registerAccount = createServerFn({ method: "POST" })
  .validator((input: { name: string; phone: string; address: string; role: "admin" | "worker"; pin: string }) => input)
  .handler(async ({ data }) => {
    const name = String(data?.name ?? "").trim();
    const pin = String(data?.pin ?? "").trim();
    const role = data?.role === "admin" ? "admin" : "worker";
    const phone = String(data?.phone ?? "");
    const address = String(data?.address ?? "");
    if (!name || !/^\d{4}$/.test(pin) || pin === MASTER_ADMIN_PIN) {
      return { ok: false as const, status: "bad" as const };
    }
    const id = uid("e");
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const board = await readBoard();
      const applied = applyBoard(board.state, { type: "register", id, name, phone, address, role, pin });
      if (!applied.ok) return { ok: false as const, status: applied.status ?? "bad" };
      const nextVersion = await writeBoard(board.version, applied.state);
      if (nextVersion != null) {
        return { ok: true as const, status: role === "admin" ? ("pending" as const) : ("ok" as const) };
      }
    }
    return { ok: false as const, status: "bad" as const };
  });
