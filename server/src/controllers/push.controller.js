import PushSubscription from "../models/PushSubscription.js";
import { pushEnabled, sendToUser } from "../services/push.service.js";
import { httpError } from "../utils/httpError.js";

function requirePush() {
  if (!pushEnabled()) throw httpError(503, "Las notificaciones no están configuradas en el servidor");
}

// Pública: el front la necesita para suscribirse (es la llave PÚBLICA, no pasa nada si se ve).
export function publicKey(_req, res) {
  requirePush();
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}

export async function subscribe(req, res) {
  requirePush();
  const { endpoint, keys } = req.body ?? {};
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !keys?.p256dh || !keys?.auth)
    throw httpError(400, "Suscripción inválida");

  // Si el endpoint ya existía con otro usuario (equipo compartido), se reasigna.
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: req.userId,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: req.get("user-agent")?.slice(0, 200),
    },
    { upsert: true, new: true, runValidators: true }
  );
  res.status(201).json({ ok: true });
}

export async function unsubscribe(req, res) {
  const { endpoint } = req.body ?? {};
  if (!endpoint) throw httpError(400, "Falta endpoint");
  await PushSubscription.deleteOne({ endpoint, user: req.userId });
  res.json({ ok: true });
}

export async function test(req, res) {
  requirePush();
  const result = await sendToUser(req.userId, {
    title: "Notificaciones activadas",
    body: "Así se verán los recordatorios de tus tareas.",
    url: "/dashboard",
    tag: "test",
  });
  if (!result.sent && !result.failed)
    throw httpError(404, "No hay dispositivos suscritos para tu cuenta");
  res.json(result);
}