import webpush from "web-push";
import { getSql } from "@/lib/db";

type Keys = { publicKey: string; privateKey: string };
type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };

let ready: Promise<Keys> | null = null;

async function vapid(): Promise<Keys> {
  ready ??= (async () => {
    const sql = await getSql();
    const existing = await sql<{ public_key: string; private_key: string }>`select public_key, private_key from fl_vapid where id = 'main'`;
    const row = existing[0];
    const keys = row
      ? { publicKey: row.public_key, privateKey: row.private_key }
      : webpush.generateVAPIDKeys();
    if (!row) {
      await sql`insert into fl_vapid (id, public_key, private_key) values ('main', ${keys.publicKey}, ${keys.privateKey}) on conflict (id) do nothing`;
    }
    webpush.setVapidDetails("mailto:alerts@fieldline.local", keys.publicKey, keys.privateKey);
    return keys;
  })();
  return ready;
}

export async function pushPublicKey() {
  const keys = await vapid();
  return keys.publicKey;
}

export async function saveSubscription(employeeId: string, subscription: Subscription) {
  if (!employeeId || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) return false;
  const sql = await getSql();
  await sql`
    insert into fl_push (endpoint, employee_id, p256dh, auth)
    values (${subscription.endpoint}, ${employeeId}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
    on conflict (endpoint) do update set employee_id = excluded.employee_id, p256dh = excluded.p256dh, auth = excluded.auth
  `;
  return true;
}

export async function notifyEmployees(employeeIds: string[], payload: { title: string; body: string }) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  if (ids.length === 0) return;
  await vapid();
  const sql = await getSql();
  const rows = await sql<{ employee_id: string; endpoint: string; p256dh: string; auth: string }>`
    select employee_id, endpoint, p256dh, auth from fl_push
  `;
  const targets = rows.filter((row) => ids.includes(row.employee_id));
  await Promise.all(
    targets.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await sql`delete from fl_push where endpoint = ${row.endpoint}`;
        }
      }
    }),
  );
}
