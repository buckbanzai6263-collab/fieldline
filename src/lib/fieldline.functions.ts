import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { applyBoard, emptyBoard, redactBoard, type BoardAction, type BoardState } from "@/lib/board-ops";
import { getSql } from "@/lib/db";
import { MASTER_PIN } from "@/lib/seed";

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
  return { version: Number(row.version), state: asState(row.state) };
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
    const master = pinsMatch(MASTER_PIN, pin);
    const employeeId = match?.id ?? (master ? "e_owner" : null);
    if (!employeeId) return null;
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
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const board = await readBoard();
      const applied = applyBoard(board.state, data.action);
      const nextVersion = await writeBoard(board.version, applied.state);
      if (nextVersion != null) {
        return { ...view(applied.state, employeeId, nextVersion), ok: applied.ok, status: applied.status ?? null, id: applied.id ?? null };
      }
    }
    return null;
  });
