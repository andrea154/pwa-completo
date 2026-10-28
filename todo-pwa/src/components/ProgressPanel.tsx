type Props = { stats: { total: number; done: number; active: number; overdue: number; progress: number } };

/** El elemento protagonista: un trazo de marcatexto que avanza con tus tareas */
export default function ProgressPanel({ stats }: Props) {
  const { total, done, active, overdue, progress } = stats;
  const message =
    total === 0 ? "Empieza agregando tu primera tarea"
    : progress === 100 ? "Terminaste todo. Buen trabajo."
    : `${done} de ${total} completadas`;

  return (
    <section className="progress" aria-label="Progreso">
      <div className="progress-head">
        <span className="progress-pct">{progress}%</span>
        <span className="progress-msg">{message}</span>
      </div>
      <div
        className="progress-track" role="progressbar"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-facts">
        <span>{active} {active === 1 ? "activa" : "activas"}</span>
        {overdue > 0 && <span className="fact-overdue">{overdue} {overdue === 1 ? "vencida" : "vencidas"}</span>}
      </div>
    </section>
  );
}
