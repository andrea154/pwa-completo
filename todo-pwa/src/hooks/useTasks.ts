// Toda la lógica de datos del Dashboard vive aquí; los componentes solo dibujan.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { applyOutbox, cacheTasks, getCachedTasks, getOutbox, queueCreate, queueDelete, queueUpdate } from "../offline/db";
import { syncNow } from "../offline/sync";
import type { Task, TaskInput, TaskPatch } from "../types";
import { isDone, isOverdue, newId, normalizeTask } from "../utils/tasks.js";
import { useOnline } from "./useOnline";

type Badging = { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const online = useOnline();

  /** Trae del servidor y le aplica encima los cambios que siguen en la outbox */
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<{ items: unknown[] }>("/tasks");
      const server = (data.items ?? []).map(normalizeTask);
      setTasks(applyOutbox(server, await getOutbox()));
    } catch {
      /* sin red: nos quedamos con lo que hay */
    }
  }, []);

  const syncAndRefresh = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await syncNow();
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  // Arranque: 1) cache local al instante  2) sincronizar  3) datos frescos
  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await getCachedTasks();
      if (alive && cached.length) setTasks(cached.map(normalizeTask));
      await syncAndRefresh();
      if (alive) setLoading(false);
    })();

    const onOnline = () => void syncAndRefresh();
    const onVisible = () => document.visibilityState === "visible" && void syncAndRefresh();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncAndRefresh]);

  // Cada cambio en la lista se guarda en IndexedDB (para abrir la app sin red)
  useEffect(() => {
    if (!loading) void cacheTasks(tasks);
  }, [tasks, loading]);

  // Badge en el ícono de la app instalada con el número de tareas activas
  useEffect(() => {
    const nav = navigator as Navigator & Badging;
    const active = tasks.filter((t) => !isDone(t)).length;
    if (active) nav.setAppBadge?.(active).catch(() => undefined);
    else nav.clearAppBadge?.().catch(() => undefined);
  }, [tasks]);

  // ---------- Acciones: actualizan la UI al instante (optimistic UI) y encolan ----------
  const add = useCallback(
    async (input: TaskInput) => {
      const id = newId();
      const task: Task = {
        ...input, _id: id, clienteId: id, status: "Pendiente",
        createdAt: new Date().toISOString(), pending: true,
      };
      setTasks((prev) => [task, ...prev]);
      await queueCreate(task);
      void syncAndRefresh();
    },
    [syncAndRefresh]
  );

  const update = useCallback(
    async (id: string, patch: TaskPatch) => {
      setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, ...patch, pending: true } : t)));
      await queueUpdate(id, patch);
      void syncAndRefresh();
    },
    [syncAndRefresh]
  );

  const remove = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      await queueDelete(id);
      void syncAndRefresh();
    },
    [syncAndRefresh]
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const total = tasks.length;
    const done = tasks.filter(isDone).length;
    return {
      total,
      done,
      active: total - done,
      overdue: tasks.filter((t) => isOverdue(t, now)).length,
      unsynced: tasks.filter((t) => t.pending).length,
      progress: total ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  return { tasks, stats, loading, syncing, online, add, update, remove };
}