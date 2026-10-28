type Props = { online: boolean; syncing: boolean; unsynced: number };

export default function ConnectionPill({ online, syncing, unsynced }: Props) {
  let state = "ok";
  let text = "Al día";
  if (!online) {
    state = "offline";
    text = unsynced ? `Sin conexión, ${unsynced} por enviar` : "Sin conexión";
  } else if (syncing) {
    state = "syncing";
    text = "Sincronizando…";
  } else if (unsynced) {
    state = "pending";
    text = `${unsynced} por enviar`;
  }

  return (
    <span className={`conn conn-${state}`} role="status" aria-live="polite">
      <span className="conn-dot" />
      {text}
    </span>
  );
}
