import { useEffect, useState } from "react";
import { onToast, type ToastItem } from "../toast";

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(
    () =>
      onToast((t) => {
        setItems((prev) => [...prev, t]);
        setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3500);
      }),
    []
  );

  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}
