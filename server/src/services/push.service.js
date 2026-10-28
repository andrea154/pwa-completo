// services/push.service.js — envío de notificaciones con el protocolo Web Push
import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let configured = null;

/** true si hay llaves VAPID configuradas. Configura web-push la primera vez. */
export function pushEnabled() {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  if (configured) {
    // Apple rechaza subjects falsos: usa un mailto: real o la URL de tu sitio.
    webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
  return configured;
}

/**
 * Envía `payload` a todos los dispositivos del usuario.
 * payload: { title, body, url?, tag? }  → lo recibe el evento "push" del service worker.
 */
export async function sendToUser(userId, payload) {
  const result = { sent: 0, removed: 0, failed: 0 };
  if (!pushEnabled()) return result;

  const subs = await PushSubscription.find({ user: userId });
  const body = JSON.stringify(payload);

  const outcomes = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 })
    )
  );

  const dead = [];
  outcomes.forEach((o, i) => {
    if (o.status === "fulfilled") return void result.sent++;
    const code = o.reason?.statusCode;
    // 404/410 = la suscripción ya no existe (el usuario la revocó o desinstaló la app)
    if (code === 404 || code === 410) dead.push(subs[i]._id);
    else {
      result.failed++;
      console.error("web-push error:", code, o.reason?.body || o.reason?.message);
    }
  });

  if (dead.length) {
    await PushSubscription.deleteMany({ _id: { $in: dead } });
    result.removed = dead.length;
  }
  return result;
}