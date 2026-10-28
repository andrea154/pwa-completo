import { useMemo, useState } from "react";
import { logout } from "../auth";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import ProgressPanel from "../components/ProgressPanel";
import TaskForm from "../components/TaskForm";
import TaskItem from "../components/TaskItem";
import Toolbar from "../components/Toolbar";
import { useTasks } from "../hooks/useTasks";
import type { Filter, Sort } from "../types";
import { filterTasks, sortTasks } from "../utils/tasks";

export default function Dashboard() {
  const { tasks, stats, loading, syncing, online, add, update, remove } = useTasks();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const visible = useMemo(
    () => sortTasks(filterTasks(tasks, search, filter), sort),
    [tasks, search, filter, sort]
  );

  const counts = useMemo(
    () => ({ all: stats.total, active: stats.active, completed: stats.done, overdue: stats.overdue }),
    [stats]
  );

  function handleLogout() {
    if (stats.unsynced && !confirm(`Tienes ${stats.unsynced} cambio(s) sin sincronizar. Si sales, se perderán. ¿Salir de todos modos?`))
      return;
    void logout();
  }

  return (
    <div className="wrap">
      <AppHeader online={online} syncing={syncing} unsynced={stats.unsynced} onLogout={handleLogout} />

      <main>
        <ProgressPanel stats={stats} />
        <TaskForm onAdd={add} />
        <Toolbar
          search={search} onSearch={setSearch}
          filter={filter} onFilter={setFilter}
          sort={sort} onSort={setSort}
          counts={counts}
        />

        {loading && tasks.length === 0 ? (
          <ul className="list" aria-busy="true">
            {[0, 1, 2].map((i) => <li key={i} className="task skeleton" />)}
          </ul>
        ) : visible.length === 0 ? (
          <EmptyState filter={filter} searching={!!search.trim()} />
        ) : (
          <ul className="list">
            {visible.map((t) => (
              <TaskItem key={t._id} task={t} onUpdate={update} onRemove={remove} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}