import type { Filter, Sort } from "../types";
import { IconSearch } from "./icons";

type Props = {
  search: string; onSearch: (s: string) => void;
  filter: Filter; onFilter: (f: Filter) => void;
  sort: Sort; onSort: (s: Sort) => void;
  counts: Record<Filter, number>;
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "overdue", label: "Vencidas" },
  { id: "completed", label: "Hechas" },
];

export default function Toolbar({ search, onSearch, filter, onFilter, sort, onSort, counts }: Props) {
  return (
    <div className="toolbar">
      <label className="search">
        <IconSearch />
        <input
          type="search" value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar" aria-label="Buscar tareas"
        />
      </label>

      <div className="toolbar-row">
        <div className="chips" role="tablist" aria-label="Filtrar tareas">
          {FILTERS.map((f) => (
            <button
              key={f.id} type="button" role="tab" aria-selected={filter === f.id}
              className="chip" onClick={() => onFilter(f.id)}
            >
              {f.label} <span className="chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <select className="sort" value={sort} onChange={(e) => onSort(e.target.value as Sort)} aria-label="Ordenar">
          <option value="recent">Más recientes</option>
          <option value="due">Por vencimiento</option>
          <option value="priority">Por prioridad</option>
        </select>
      </div>
    </div>
  );
}
