// IndexedDB: cache de tareas + "outbox" (cola de cambios pendientes de enviar)
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Task, TaskPatch } from "../types";
import { isLocalId } from "../utils/tasks.ts";

/**
 * Operaciones pendientes. Regla clave del diseño:
 *  - create: tareas nacidas offline (se identifican por clienteId).
 *    Si editas una tarea que aún no existe en el servidor, el cambio se
 *    FUSIONA en su create; si la borras, simplemente se quita el create.
 *  - update / delete: solo para tareas que ya tienen id del servidor.
 * `rev` cambia cada vez que la operación se modifica: así sync.ts sabe si
 * alguien la editó mientras se estaba enviando.
 */
export type OutboxOp =
  | { id: string; op: "create"; clienteId: string; data: Task; ts: number; rev: number }
  | { id: string; op: "update"; serverId: string; data: TaskPatch; ts: number; rev: number }
  | { id: string; op: "delete"; serverId: string; ts: number; rev: number };

interface TodoDB extends DBSchema {
  tasks: { key: string; value: Task };
  outbox: { key: string; value: OutboxOp };
  meta: { key: string; value: { key: string; value: string } };
}

let dbp: Promise<IDBPDatabase<TodoDB>> | undefined;
export function db() {
  dbp ??= openDB<TodoDB>("todo-pwa", 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore("tasks", { keyPath: "_id" });
        d.createObjectStore("meta", { keyPath: "key" });
      }
      // v2: el formato de la outbox cambió; se recrea limpia
      if (d.objectStoreNames.contains("outbox")) d.deleteObjectStore("outbox");
      d.createObjectStore("outbox", { keyPath: "id" });
    },
  });
  return dbp;
}

// ---------- Cache de tareas ----------
export async function cacheTasks(list: Task[]) {
  const tx = (await db()).transaction("tasks", "readwrite");
  await tx.store.clear();
  await Promise.all(list.map((t) => tx.store.put(t)));
  await tx.done;
}
export async function getCachedTasks() {
  return (await db()).getAll("tasks");
}

// ---------- Mapeo clienteId → serverId ----------
export async function setMapping(clienteId: string, serverId: string) {
  await (await db()).put("meta", { key: `map:${clienteId}`, value: serverId });
}
export async function getMapping(clienteId: string) {
  return (await (await db()).get("meta", `map:${clienteId}`))?.value;
}

// ---------- Outbox ----------
export async function getOutbox() {
  return ((await (await db()).getAll("outbox")) ?? []).sort((a, b) => a.ts - b.ts);
}

export async function queueCreate(task: Task) {
  await (await db()).put("outbox", {
    id: `create:${task._id}`, op: "create", clienteId: task._id, data: task, ts: Date.now(), rev: 1,
  });
}

export async function queueUpdate(id: string, patch: TaskPatch) {
  const d = await db();
  let serverId = id;

  if (isLocalId(id)) {
    const create = await d.get("outbox", `create:${id}`);
    if (create?.op === "create") {
      // La tarea aún no existe en el servidor: fusionamos el cambio en su create
      await d.put("outbox", { ...create, data: { ...create.data, ...patch }, rev: create.rev + 1 });
      return;
    }
    // Ya se sincronizó mientras la pantalla tenía el id local
    const mapped = await getMapping(id);
    if (!mapped) return;
    serverId = mapped;
  }

  // Varias ediciones offline de la misma tarea se FUSIONAN (antes se pisaban)
  const key = `update:${serverId}`;
  const prev = await d.get("outbox", key);
  await d.put("outbox", {
    id: key,
    op: "update",
    serverId,
    data: { ...(prev?.op === "update" ? prev.data : {}), ...patch },
    ts: prev?.ts ?? Date.now(),
    rev: (prev?.rev ?? 0) + 1,
  });
}

export async function queueDelete(id: string) {
  const d = await db();
  if (isLocalId(id)) {
    const hadCreate = await d.get("outbox", `create:${id}`);
    await d.delete("outbox", `create:${id}`);
    if (hadCreate) return; // nunca llegó al servidor: no hay nada que borrar allá
    const mapped = await getMapping(id);
    if (!mapped) return;
    id = mapped;
  }
  await d.delete("outbox", `update:${id}`); // ya no tiene caso actualizarla
  await d.put("outbox", { id: `delete:${id}`, op: "delete", serverId: id, ts: Date.now(), rev: 1 });
}

/** Quita la operación SOLO si nadie la modificó mientras se enviaba */
export async function removeOp(op: OutboxOp) {
  const tx = (await db()).transaction("outbox", "readwrite");
  const current = await tx.store.get(op.id);
  if (current && current.rev === op.rev) await tx.store.delete(op.id);
  await tx.done;
}

/**
 * Aplica los cambios pendientes sobre la lista del servidor.
 * Así, aunque recargues la página antes de sincronizar, ves tus cambios.
 */
export function applyOutbox(server: Task[], ops: OutboxOp[]): Task[] {
  const byId = new Map(server.map((t) => [t._id, t]));
  const serverClienteIds = new Set(server.map((t) => t.clienteId).filter(Boolean));
  const created: Task[] = [];

  for (const op of ops) {
    if (op.op === "update") {
      const t = byId.get(op.serverId);
      if (t) byId.set(op.serverId, { ...t, ...op.data, pending: true });
    } else if (op.op === "delete") {
      byId.delete(op.serverId);
    } else if (!serverClienteIds.has(op.clienteId)) {
      created.push({ ...op.data, pending: true });
    }
  }
  return [...created.reverse(), ...byId.values()];
}

// ---------- Sesión ----------
/** Borra todo lo local (al cerrar sesión, o si inicia sesión otra persona) */
export async function clearLocalData() {
  const tx = (await db()).transaction(["tasks", "outbox", "meta"], "readwrite");
  await Promise.all([tx.objectStore("tasks").clear(), tx.objectStore("outbox").clear(), tx.objectStore("meta").clear()]);
  await tx.done;
}

/** Si el usuario que inicia sesión es distinto al dueño de los datos locales, se limpian */
export async function ensureLocalOwner(userId: string) {
  const d = await db();
  const owner = (await d.get("meta", "owner"))?.value;
  if (owner && owner !== userId) await clearLocalData();
  await d.put("meta", { key: "owner", value: userId });
}