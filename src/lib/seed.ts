import type { ChatMessage, ChatRoom, Employee, Notice, Project, Task, TimeEntry } from "./types";

export const MASTER_PIN = "6263";
export const OWNER_ID = "e_owner";

export const employees: Employee[] = [
  {
    id: OWNER_ID,
    name: "Owner",
    role: "admin",
    trade: "Master",
    initials: "OW",
    phone: "",
    pin: MASTER_PIN,
  },
];

export const projects: Project[] = [];
export const tasks: Task[] = [];
export const timeEntries: TimeEntry[] = [];
export const chats: ChatRoom[] = [];
export const messages: ChatMessage[] = [];
export const notices: Notice[] = [];
