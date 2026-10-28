import { useState, type FormEvent } from "react";
import type { Priority, TaskInput } from "../types";
import { fromLocalInput } from "../utils/tasks";
import PrioritySelector from "./PrioritySelector";

export default function TaskForm({ onAdd }: { onAdd: (input: TaskInput) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Media");
  const [due, setDue] = useState("");
  const [expanded, setExpanded] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd({ title: t, description: description.trim(), priority, dueDate: fromLocalInput(due) });
    setTitle("");
    setDescription("");
    setDue("");
    setPriority("Media");
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-row">
        <input
          className="input composer-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="¿Qué necesitas hacer?"
          aria-label="Título de la tarea"
          maxLength={140}
        />
        <button className="btn primary" disabled={!title.trim()}>Agregar</button>
      </div>

      {expanded && (
        <div className="composer-extra">
          <textarea
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas (opcional)"
            aria-label="Descripción"
            rows={2}
          />
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
          {due && <p className="hint">Si activas las notificaciones, te avisaremos antes de que venza.</p>}
        </div>
      )}
    </form>
  );
}
