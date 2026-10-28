import { useInstallPrompt } from "../installPrompt";
import ConnectionPill from "./ConnectionPill";
import NotificationsButton from "./NotificationsButton";
import { IconDownload, IconLogout } from "./icons";

type Props = { online: boolean; syncing: boolean; unsynced: number; onLogout: () => void };

export default function AppHeader({ online, syncing, unsynced, onLogout }: Props) {
  const { canInstall, install } = useInstallPrompt();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Mis tareas</h1>
        <ConnectionPill online={online} syncing={syncing} unsynced={unsynced} />
      </div>
      <div className="topbar-actions">
        {canInstall && (
          <button className="btn install" onClick={install}>
            <IconDownload /> <span>Instalar</span>
          </button>
        )}
        <NotificationsButton />
        <button className="icon-btn" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
