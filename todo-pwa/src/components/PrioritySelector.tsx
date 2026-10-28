import { PRIORITIES, type Priority } from "../types";

type Props = { value: Priority; onChange: (p: Priority) => void };

export default function PrioritySelector({ value, onChange }: Props) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Prioridad">
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          className={`seg prio-${p.toLowerCase()}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
