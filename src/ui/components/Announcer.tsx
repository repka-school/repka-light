// One polite live region per page; announce() clears it first so a repeated message is read again.
export const ANNOUNCER_ID = "announcer";

export function Announcer({ id = ANNOUNCER_ID }: { id?: string }) {
  return <div id={id} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />;
}

export function announce(text: string, id = ANNOUNCER_ID) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = "";
  window.setTimeout(() => {
    el.textContent = text;
  }, 50);
}
