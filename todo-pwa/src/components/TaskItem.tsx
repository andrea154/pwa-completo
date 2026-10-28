import { memo, useState, type KeyboardEvent } from "react";
import { STATUSES, type Priority, type Status, type Task, type TaskPatch } from "../types";
import { dueAbsolute, dueRelative, fromLocalInput, isDone, isOverdue, statusSlug, toLocalInput } from "../utils/tasks";
import PrioritySelector from "./PrioritySelector";
import { IconCheck, IconClock, IconPencil, IconTrash } from "./icons";

type Props = {
  task: Task;
  onUpdate: (id: string, patch: TaskPatch) => void;
  onRemove: (id: string) => void;
};

// memo: si la tarea no cambió, React no vuelve a dibujar este renglón
function TaskItem({ task, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(toLocalInput(task.dueDate));

  const done = isDone(task);
  const overdue = isOverdue(task);

  function startEdit() {
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setDue(toLocalInput(task.dueDate));
    setEditing(true);
  }

  function save() {
    const t = title.trim();
    if (!t) return;
    onUpdate(task._id, { title: t, description: description.trim(), priority, dueDate: fromLocalInput(due) });
    setEditing(false);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") setEditing(false);
    if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      save();
    }
  }

  const classes = ["task", `prio-${task.priority.toLowerCase()}`, done && "is-done", overdue && "is-overdue"]
    .filter(Boolean).join(" ");

  return (
    <li className={classes}>
      <button
        className="check"
        onClick={() => onUpdate(task._id, { status: done ? "Pendiente" : "Completada" })}
        aria-label={done ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
        aria-pressed={done}
      >
        <IconCheck />
      </button>

      <div className="task-body">
        {editing ? (
          <div className="task-edit" onKeyDown={onKey}>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título" maxLength={140} autoFocus />
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Descripción" placeholder="Notas" rows={2} />
            <div className="composer-meta">
              <label className="field">
                <span>Vence</span>
                <input type="datetime-local" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
              </label>
              <div className="field">
                <span>Prioridad</span>
                <PrioritySelector value={priority} onChange={setPriority} />
              </div>
            </div>
            <div className="task-edit-actions">
              <button className="btn ghost" onClick={() => setEditing(false)}>Cancelar</button>
              <button className="btn primary" onClick={save} disabled={!title.trim()}>Guardar</button>
            </div>
          </div>
        ) : (
          <>
            <p className="task-title" onDoubleClick={startEdit}>{task.title}</p>
            {task.description && <p className="task-desc">{task.description}</p>}
            <div className="task-meta">
              <select
                className={`status status-${statusSlug(task.status)}`}
                value={task.status}
                onChange={(e) => onUpdate(task._id, { status: e.target.value as Status })}
                aria-label="Estado"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="prio-tag">{task.priority}</span>
              {task.dueDate && (
                <span className={`due ${overdue ? "due-overdue" : ""}`} title={dueAbsolute(task.dueDate)}>
                  <IconClock width={14} height={14} />
                  {overdue ? `Venció ${dueRelative(task.dueDate)}` : `Vence ${dueRelative(task.dueDate)}`}
                </span>
              )}
              {task.pending && <span className="unsynced" title="Este cambio aún no llega al servidor">Sin sincronizar</span>}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="task-actions">
          <button className="icon-btn" onClick={startEdit} aria-label={`Editar "${task.title}"`} title="Editar"><IconPencil /></button>
          <button className="icon-btn danger" onClick={() => onRemove(task._id)} aria-label={`Eliminar "${task.title}"`} title="Eliminar"><IconTrash /></button>
        </div>
      )}
    </li>
  );
}

export default memo(TaskItem);
