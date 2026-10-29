// controllers/task.controller.js
// En Express 5 los errores de funciones async llegan solos al manejador de errores,
// por eso no hace falta try/catch en cada función.
import mongoose from "mongoose";
import Task, { STATUS, PRIORITY } from "../models/Task.js";
import { httpError } from "../utils/httpError.js";

/** Toma del body SOLO los campos editables y los valida. Ignora el resto. */
function pickPatch(body = {}) {
  const patch = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) throw httpError(400, "El título no puede estar vacío");
    patch.title = title;
  }
  if (body.description !== undefined) patch.description = String(body.description ?? "").trim();

  if (body.status !== undefined) {
    if (!STATUS.includes(body.status)) throw httpError(400, "Estado inválido");
    patch.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITY.includes(body.priority)) throw httpError(400, "Prioridad inválida");
    patch.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === "") patch.dueDate = null;
    else {
      const d = new Date(body.dueDate);
      if (Number.isNaN(d.getTime())) throw httpError(400, "Fecha de vencimiento inválida");
      patch.dueDate = d;
    }
  }
  return patch;
}

function assertObjectId(id) {
  // Un id local (UUID) provocaba un CastError → 500. Ahora es un 400 claro.
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Id de tarea inválido");
}

const sameDate = (a, b) => (a ? a.getTime() : null) === (b ? b.getTime() : null);

export async function list(req, res) {
  const items = await Task.find({ user: req.userId, deleted: false })
    .sort({ createdAt: -1 })
    .select("-remindedAt -__v");
  res.json({ items });
}

export async function create(req, res) {
  const patch = pickPatch(req.body);
  if (!patch.title) throw httpError(400, "El título es requerido");

  const clienteId = typeof req.body.clienteId === "string" ? req.body.clienteId.trim() : "";

  // Idempotente: si el mismo clienteId llega dos veces (reintento), no se duplica.
  const task = clienteId
    ? await Task.findOneAndUpdate(
        { user: req.userId, clienteId },
        { $setOnInsert: { ...patch, user: req.userId, clienteId } },
        { upsert: true, new: true, runValidators: true }
      )
    : await Task.create({ ...patch, user: req.userId });

  res.status(201).json({ task });
}

export async function update(req, res) {
  assertObjectId(req.params.id);
  const patch = pickPatch(req.body);

  const task = await Task.findOne({ _id: req.params.id, user: req.userId, deleted: false });
  if (!task) throw httpError(404, "Tarea no encontrada");

  // Si cambió la fecha de vencimiento, el recordatorio debe volver a enviarse.
  if ("dueDate" in patch && !sameDate(task.dueDate, patch.dueDate)) task.remindedAt = null;

  task.set(patch);
  await task.save(); // save() sí ejecuta validaciones (enum, required, maxlength)
  res.json({ task });
}

export async function remove(req, res) {
  assertObjectId(req.params.id);
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId, deleted: false },
    { deleted: true },
    { new: true }
  );
  if (!task) throw httpError(404, "Tarea no encontrada");
  res.json({ ok: true });
}

/**
 * SINCRONIZACIÓN OFFLINE: crea o actualiza por clienteId y devuelve el mapeo
 * clienteId → serverId. Es idempotente: mandarlo dos veces no duplica nada.
 */
export async function bulksync(req, res) {
  const { tasks = [] } = req.body ?? {};
  if (!Array.isArray(tasks)) throw httpError(400, "tasks debe ser un arreglo");
  if (tasks.length > 200) throw httpError(400, "Máximo 200 tareas por sincronización");

  const ops = [];
  const clienteIds = [];
  let skipped = 0;

  for (const raw of tasks) {
    try {
      const clienteId = typeof raw?.clienteId === "string" ? raw.clienteId.trim() : "";
      const patch = pickPatch(raw);
      if (!clienteId || !patch.title) { skipped++; continue; }

      // Solo $set de los campos que llegaron; los demás conservan su valor
      // (antes se sobrescribían description y status con valores por defecto).
      ops.push({
        updateOne: {
          filter: { user: req.userId, clienteId },
          update: { $set: patch, $setOnInsert: { user: req.userId, clienteId, deleted: false } },
          upsert: true,
        },
      });
      clienteIds.push(clienteId);
    } catch {
      skipped++; // una tarea inválida no tumba toda la sincronización
    }
  }

  if (ops.length) await Task.bulkWrite(ops, { ordered: false });

  const docs = await Task.find({ user: req.userId, clienteId: { $in: clienteIds } }).select("_id clienteId");
  const mapping = docs.map((d) => ({ clienteId: d.clienteId, serverId: String(d._id) }));
  res.json({ mapping, skipped });
}