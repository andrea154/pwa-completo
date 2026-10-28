export type Status = "Pendiente" | "En Progreso" | "Completada";
export type Priority = "Baja" | "Media" | "Alta";

export const STATUSES: Status[] = ["Pendiente", "En Progreso", "Completada"];
export const PRIORITIES: Priority[] = ["Alta", "Media", "Baja"];

export type Task = {
  _id: string; // id de Mongo, o clienteId mientras no se sincroniza
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string | null; // ISO
  clienteId?: string;
  createdAt?: string;
  pending?: boolean; // tiene cambios que aún no llegan al servidor
};

/** Campos que el usuario puede editar */
export type TaskPatch = Partial<Pick<Task, "title" | "description" | "status" | "priority" | "dueDate">>;
export type TaskInput = Pick<Task, "title" | "description" | "priority" | "dueDate">;

export type Filter = "all" | "active" | "completed" | "overdue";
export type Sort = "recent" | "due" | "priority";