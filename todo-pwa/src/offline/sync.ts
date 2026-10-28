// Envía la outbox al servidor. Patrón "outbox": la UI NUNCA llama a la API
// para modificar datos; solo encola, y este módulo se encarga de enviar.
import axios from "axios";
import { api } from "../api";
import { getOutbox, removeOp, setMapping } from "./db";

let running: Promise<boolean> | null = null;
let again = false;

/**
 * Sincroniza. Si ya hay una sincronización en curso, no lanza otra en paralelo:
 * marca que hay que repetir al terminar (por si se encolaron cambios nuevos).
 * Devuelve true si la outbox quedó vacía.
 */
export function syncNow(): Promise<boolean> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      let ok = true;
      do {
        again = false;
        ok = await runOnce();
      } while (again && ok && navigator.onLine);
      return ok;
    } finally {
      running = null;
    }
  })();
  return running;
}

/** 4xx (menos 401/408/429) = el servidor rechazó la operación: reintentarla no sirve */
function isPermanent(e: unknown) {
  if (!axios.isAxiosError(e) || !e.response) return false;
  const s = e.response.status;
  return s >= 400 && s < 500 && ![401, 408, 429].includes(s);
}

async function runOnce(): Promise<boolean> {
  if (!navigator.onLine) return false;
  const ops = await getOutbox();
  if (!ops.length) return true;

  try {
    // 1) Todas las tareas nuevas en un solo request (idempotente por clienteId)
    const creates = ops.filter((o) => o.op === "create");
    if (creates.length) {
      const { data } = await api.post<{ mapping: { clienteId: string; serverId: string }[] }>(
        "/tasks/bulksync",
        { tasks: creates.map((o) => ({ ...o.data, clienteId: o.clienteId })) }
      );
      for (const m of data.mapping ?? []) await setMapping(m.clienteId, m.serverId);
      for (const o of creates) await removeOp(o);
    }

    // 2) Updates y deletes, en orden. Cada una se quita SOLO si salió bien.
    for (const o of ops) {
      if (o.op === "create") continue;
      try {
        if (o.op === "update") await api.put(`/tasks/${o.serverId}`, o.data);
        else await api.delete(`/tasks/${o.serverId}`);
        await removeOp(o);
      } catch (e) {
        if (isPermanent(e)) await removeOp(o); // p. ej. 404: ya no existe, se descarta
        else throw e; // red caída o 5xx: paramos y se reintenta después
      }
    }
    return (await getOutbox()).length === 0;
  } catch {
    return false;
  }
}