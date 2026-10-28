// Suscripción a notificaciones push (Web Push + VAPID)
import { api } from "./api";

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** En iPhone/iPad las notificaciones solo existen si la PWA está instalada (iOS 16.4+). */
export function needsIosInstall() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** navigator.serviceWorker.ready nunca se resuelve si no hay SW: le ponemos límite */
async function swReady(ms = 8000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("El service worker no está activo. Recarga la página.")), ms)
    ),
  ]);
}

export async function getSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function subscribePush() {
  const permission = await Notification.requestPermission();
  if (permission === "denied")
    throw new Error("Bloqueaste las notificaciones. Actívalas en la configuración del sitio.");
  if (permission !== "granted") throw new Error("No se concedió el permiso de notificaciones");

  const reg = await swReady();
  const { data } = await api.get<{ publicKey: string }>("/push/public-key");

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true, // obligatorio: cada push debe mostrar una notificación
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }));

  await api.post("/push/subscribe", sub.toJSON());
  return sub;
}

export async function unsubscribePush() {
  const sub = await getSubscription();
  if (!sub) return;
  try {
    await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe(); // aunque falle la red, este dispositivo deja de recibir
  }
}

export async function sendTestPush() {
  await api.post("/push/test");
}