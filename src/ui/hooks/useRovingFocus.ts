import { useRef, useState, type KeyboardEvent } from "react";

// One tab stop for a group of buttons; the arrow keys, Home and End move focus inside it.

export function useRovingFocus<T extends HTMLElement = HTMLElement>(count: number, current: number) {
  const ref = useRef<T>(null);

  const [held, setHeld] = useState({ current, active: current });
  const active = held.current === current ? held.active : current;

  const move = (index: number) => {
    const next = Math.max(0, Math.min(count - 1, index));
    setHeld({ current, active: next });
    ref.current?.querySelector<HTMLElement>(`[data-roving-index="${next}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<T>) => {
    const at = Number((event.target as HTMLElement).dataset.rovingIndex);
    if (Number.isNaN(at)) return;
    const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: count - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    move(to);
  };

  const item = (index: number) => ({
    "data-roving-index": index,
    tabIndex: index === active ? 0 : -1,
    onFocus: () => {
      if (index !== active) setHeld({ current, active: index });
    },
  });

  return { ref, onKeyDown, item };
}
