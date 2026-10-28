import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../api";
import { getSubscription, needsIosInstall, pushSupported, sendTestPush, subscribePush, unsubscribePush } from "../push";
import { toast } from "../toast";
import { IconBell } from "./icons";

type State = "checking" | "unsupported" | "ios" | "off" | "on";

export default function NotificationsButton() {
  const [state, setState] = useState<State>("checking");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (needsIosInstall()) return setState("ios");
    if (!pushSupported()) return setState("unsupported");
    getSubscription().then((s) => setState(s ? "on" : "off"));
  }, []);

  // Cerrar el panel al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast(errorMessage(e, "No se pudo completar la acción"), "error");
    } finally {
      setBusy(false);
    }
  }

  const enable = () =>
    run(async () => {
      await subscribePush();
      setState("on");
      toast("Notificaciones activadas", "success");
    });
  const disable = () =>
    run(async () => {
      await unsubscribePush();
      setState("off");
      toast("Notificaciones desactivadas");
    });
  const test = () =>
    run(async () => {
      await sendTestPush();
      toast("Notificación de prueba enviada", "success");
    });

  if (state === "checking" || state === "unsupported") return null;

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        className={`icon-btn ${state === "on" ? "is-on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        aria-expanded={open}
        title="Notificaciones"
      >
        <IconBell />
        {state === "on" && <span className="icon-btn-dot" />}
      </button>

      {open && (
        <div className="popover" role="dialog" aria-label="Notificaciones">
          {state === "ios" && (
            <p>
              En iPhone, primero instala la app: toca <strong>Compartir</strong> y luego{" "}
              <strong>Agregar a inicio</strong>. Ábrela desde ahí para activar los recordatorios.
            </p>
          )}
          {state === "off" && (
            <>
              <p>Recibe un aviso cuando una tarea esté por vencer, aunque tengas la app cerrada.</p>
              <button className="btn primary block" onClick={enable} disabled={busy}>
                {busy ? "Activando…" : "Activar recordatorios"}
              </button>
            </>
          )}
          {state === "on" && (
            <>
              <p>Los recordatorios están activos en este dispositivo.</p>
              <div className="popover-actions">
                <button className="btn" onClick={test} disabled={busy}>Enviar prueba</button>
                <button className="btn ghost" onClick={disable} disabled={busy}>Desactivar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
