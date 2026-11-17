import { useEffect, useRef } from "react";

// Moves focus to the screen heading whenever `key` changes, so a screen change is announced.

export function useFocusHeading(key: unknown, options: { selector?: string; skipFirst?: boolean; preventScroll?: boolean } = {}) {
  const { selector = "#screen-title", skipFirst = false, preventScroll = true } = options;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (skipFirst) return;
    }
    document.querySelector<HTMLElement>(selector)?.focus({ preventScroll });
  }, [key, selector, skipFirst, preventScroll]);
}
