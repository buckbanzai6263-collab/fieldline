import type { ChatMessage, ChatRoom, Employee, Notice, Project, Task, TimeEntry } from "./types";

export const OWNER_ID = "e_owner";
export const MASTER_ADMIN_ID = "e_vince";
export const MASTER_ADMIN_PIN = "2369";
export const MASTER_ADMIN_NAME = "VinceNorris";
export const SUPPORT_AUTHOR_ID = "support";
export const SUPPORT_AUTHOR_NAME = "Fieldline Support";

export const employees: Employee[] = [
  {
    id: OWNER_ID,
    name: "Owner",
    role: "admin",
    trade: "Master",
    initials: "OW",
    phone: "",
    pin: "",
  },
];

export const projects: Project[] = [];
export const tasks: Task[] = [];
export const timeEntries: TimeEntry[] = [];
export const chats: ChatRoom[] = [];
export const messages: ChatMessage[] = [];
export const notices: Notice[] = [];
