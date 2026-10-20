export type Role = "admin" | "supervisor" | "worker";

export type Employee = {
  id: string;
  name: string;
  role: Role;
  trade: string;
  initials: string;
  phone: string;
  pin: string;
};

export type Project = {
  id: string;
  name: string;
  site: string;
  client: string;
  urgent: boolean;
};

export type ColumnId = "todo" | "in_progress" | "blocked" | "done";

export type Priority = "low" | "normal" | "high" | "urgent";

export type Photo = {
  id: string;
  dataUrl: string;
  caption: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeIds: string[];
  status: ColumnId;
  dueAt: string;
  photos: Photo[];
  comments: Comment[];
  billable: boolean;
  priority: Priority;
};

export type TimeKind = "shift" | "job" | "travel" | "supply";

export type TimeEntry = {
  id: string;
  employeeId: string;
  kind: TimeKind;
  taskId?: string;
  startedAt: string;
  endedAt?: string;
  note?: string;
};

export type ChatRoom = {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  projectId?: string;
  taskId?: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Notice = {
  id: string;
  employeeId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type TabId = "home" | "board" | "mine" | "clock" | "chat" | "reports" | "people";

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

export const OPEN_PERMISSIONS = true;

export function isOnTask(task: Task, employeeId: string | null | undefined) {
  if (!employeeId) return false;
  return task.assigneeIds.includes(employeeId);
}
