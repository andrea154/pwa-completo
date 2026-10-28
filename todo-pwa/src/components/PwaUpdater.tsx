// Avisa cuando hay una versión nueva de la app (service worker en espera)
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "../toast";

export default function PwaUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Revisa si hay versión nueva cada hora (útil si la app queda abierta todo el día)
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast("Lista para usarse sin conexión", "success");
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh) return null;

  return (
    <div className="update-bar" role="alert">
      <span>Hay una versión nueva de la app.</span>
      <div className="update-actions">
        <button className="btn ghost" onClick={() => setNeedRefresh(false)}>Después</button>
        <button className="btn primary" onClick={() => updateServiceWorker(true)}>Actualizar</button>
      </div>
    </div>
  );
}
