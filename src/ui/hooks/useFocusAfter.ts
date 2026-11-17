import { useEffect, useRef, useState } from "react";

// Returns a function that focuses the first of the given ids to exist, after the next render.

export function useFocusAfter({ preventScroll = false }: { preventScroll?: boolean } = {}) {
  const pending = useRef<string[] | null>(null);
  const [, ask] = useState(0);

  useEffect(() => {
    const ids = pending.current;
    if (!ids) return;
    const target = ids.map((id) => document.getElementById(id)).find(Boolean);
    if (target) {
      pending.current = null;
      target.focus({ preventScroll });
    }
  });
  return (...next: string[]) => {
    pending.current = next;
    ask((n) => n + 1);
  };
}
