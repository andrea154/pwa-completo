// controllers/cron.controller.js
// Lo llama un cron externo (GitHub Actions) cada ~15 min.
// Busca tareas que vencen pronto (o ya vencieron) y aún no se recordaron
import Task from "../models/task.js";
import { pushEnabled, sendToUser } from "../services/push.service.js";

const WINDOW_MIN = Number(process.env.REMINDER_WINDOW_MIN || 60);
const TZ = process.env.APP_TIMEZONE || "America/Mexico_City";

export async function reminders(req, res) {
  const secret = process.env.CRON_SECRET;
  // Sin secreto configurado, el endpoint queda cerrado (nunca abierto por error).
  if (!secret || req.get("authorization") !== `Bearer ${secret}`)
    return res.status(401).json({ message: "No autorizado" });
  if (!pushEnabled())
    return res.status(503).json({ message: "Push no configurado" });

  const now = new Date();
  const limit = new Date(now.getTime() + WINDOW_MIN * 60_000);

  const tasks = await Task.find({
    deleted: false,
    status: { $ne: "Completada" },
    remindedAt: null,
    dueDate: { $ne: null, $lte: limit },
  })
    .sort({ dueDate: 1 })
    .limit(500);

  // Agrupar por usuario: una sola notificación aunque tenga varias tareas
  const byUser = new Map();
  for (const t of tasks) {
    const key = String(t.user);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(t);
  }

    const fmt = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
  const totals = { notified: 0, failed: 0, removed: 0, usersWithoutDevices: 0 };

  for (const [userId, list] of byUser) {
    let payload;
    if (list.length === 1) {
      const [t] = list;
      const overdue = t.dueDate < now;
      payload = {
        title: overdue ? "Tarea vencida" : "Tarea por vencer",
        body: `${t.title} — ${overdue ? "venció" : "vence"} el ${fmt.format(t.dueDate)}`,
        url: "/dashboard",
        tag: `task-${t._id}`,
      };
    } else {
      payload = {
        title: `Tienes ${list.length} tareas por vencer`,
        body: list.slice(0, 3).map((t) => `• ${t.title}`).join("\n") + (list.length > 3 ? "\n…" : ""),
        url: "/dashboard",
        tag: "reminders",
      };
    }

    const r = await sendToUser(userId, payload);
    totals.notified += r.sent;
    totals.failed += r.failed;
    totals.removed += r.removed;
    if (!r.sent && !r.failed && !r.removed) totals.usersWithoutDevices++;
  }

  // Marcar como recordadas (aunque el usuario no tenga dispositivos) para no repetir.
  if (tasks.length)
    await Task.updateMany({ _id: { $in: tasks.map((t) => t._id) } }, { $set: { remindedAt: now } });

  res.json({ checked: tasks.length, users: byUser.size, ...totals });
}