import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { pushPublicKey as readPushPublicKey, saveSubscription } from "@/lib/push.server";

async function sessionEmployee(token: string) {
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<{ employee_id: string }>`select employee_id from fl_session where token = ${token}`;
  return rows[0]?.employee_id ?? null;
}

export const pushPublicKey = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const employeeId = await sessionEmployee(String(data?.token ?? ""));
    if (!employeeId) return null;
    return { publicKey: await readPushPublicKey() };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .validator((input: { token: string; endpoint: string; p256dh: string; auth: string }) => input)
  .handler(async ({ data }) => {
    const employeeId = await sessionEmployee(String(data?.token ?? ""));
    if (!employeeId) return { ok: false as const };
    const ok = await saveSubscription(employeeId, {
      endpoint: String(data.endpoint ?? ""),
      keys: { p256dh: String(data.p256dh ?? ""), auth: String(data.auth ?? "") },
    });
    return { ok };
  });

