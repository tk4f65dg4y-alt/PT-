import { api } from "./api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushStatus(): Promise<"unsupported" | "denied" | "subscribed" | "available"> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sub = await reg?.pushManager.getSubscription().catch(() => null);
  return sub ? "subscribed" : "available";
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("Push notifications aren't supported on this device/browser");
  const { key, enabled } = await api.get("/push/vapid-public-key");
  if (!enabled || !key) throw new Error("Push notifications aren't configured yet");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted");

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  const json = sub.toJSON();
  await api.post("/push/subscribe", {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
  });
}
