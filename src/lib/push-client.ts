import { pushPublicKey, savePushSubscription } from "@/lib/push.functions";
import { SESSION_KEY } from "@/lib/store";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let installPrompt: InstallPrompt | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPrompt;
  });
}

function keyBytes(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function alertsSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function needsHomeScreen() {
  return (isIos() || isAndroid()) && !isStandalone();
}

export async function prepareAlerts() {
  if (!alertsSupported()) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // The phone can still add Fieldline from the browser menu.
  }
}

export async function installHomeScreen() {
  await prepareAlerts();
  if (!installPrompt) return false;
  await installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  installPrompt = null;
  return choice.outcome === "accepted";
}

export async function enableAlerts() {
  try {
    if (!alertsSupported()) return "unsupported" as const;
    if (needsHomeScreen()) return "install" as const;
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) return "signed-out" as const;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied" as const;
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const keys = await pushPublicKey({ data: { token } });
    if (!keys?.publicKey) return "bad" as const;
    const current = await registration.pushManager.getSubscription();
    const subscription =
      current ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(keys.publicKey),
      }));
    const json = subscription.toJSON();
    const saved = await savePushSubscription({
      data: {
        token,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      },
    });
    return saved.ok ? ("on" as const) : ("bad" as const);
  } catch {
    return "bad" as const;
  }
}

export async function refreshAlerts() {
  if (!alertsSupported() || Notification.permission !== "granted" || needsHomeScreen()) return;
  try {
    await enableAlerts();
  } catch {
    // A closed-app alert can be turned on again from Account.
  }
}
