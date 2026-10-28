import type { Filter } from "../types";

const COPY: Record<Filter, { title: string; text: string }> = {
  all: { title: "Tu lista está vacía", text: "Escribe arriba lo que necesitas hacer y presiona Agregar." },
  active: { title: "No tienes tareas activas", text: "Todo lo que agregues aparecerá aquí hasta que lo completes." },
  overdue: { title: "Nada vencido", text: "Ninguna tarea pasó su fecha límite." },
  completed: { title: "Aún no completas tareas", text: "Toca el círculo de una tarea para marcarla como hecha." },
};

export default function EmptyState({ filter, searching }: { filter: Filter; searching: boolean }) {
  const { title, text } = searching
    ? { title: "Sin resultados", text: "Prueba con otra palabra o cambia el filtro." }
    : COPY[filter];
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p className="empty-text">{text}</p>
    </div>
  );
}
