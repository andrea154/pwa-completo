// Mini sistema de avisos: toast("Guardado") desde cualquier parte, <Toaster/> los dibuja.
export type ToastKind = "info" | "success" | "error";
export type ToastItem = { id: number; message: string; kind: ToastKind };

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let seq = 0;

export function toast(message: string, kind: ToastKind = "info") {
  const item = { id: ++seq, message, kind };
  listeners.forEach((l) => l(item));
}

export function onToast(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}