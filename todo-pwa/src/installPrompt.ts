// Captura el evento beforeinstallprompt lo antes posible (se importa en main.tsx).
// Si lo escucháramos dentro del Dashboard, podría dispararse en el login y perderse.
import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // evita el mini-banner de Chrome; usamos nuestro botón
  deferred = e as BeforeInstallPromptEvent;
  emit();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  emit();
});

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => deferred !== null
  );

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null; // el evento solo se puede usar una vez
    emit();
  }

  return { canInstall, install };
}