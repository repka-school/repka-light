import { useEffect, useRef, useState } from "react";

const RAIL_QUERY = "(min-width: 1280px)";

/** Where the visible card content ends: the action bar's top while it is stuck over the content, else the scroller's bottom. */
function visibleBottom(visible: DOMRect, action: DOMRect | undefined): number {
  return action && action.top < visible.bottom && action.bottom > visible.top ? Math.min(visible.bottom, action.top) : visible.bottom;
}

/**
 * The scrolling and layout mechanics of the lesson screen, with no lesson
 * rules: whether the numbers sit in a side rail or a dialog, whether the
 * action bar is stuck to the bottom, and where the content scrolls when the
 * card or its verdict changes.
 */
export function useLessonLayout(index: number, verdictKey: string) {
  const content = useRef<HTMLDivElement>(null);
  // A mark under the card: while it is below the visible content, the action bar is stuck.
  const rest = useRef<HTMLDivElement>(null);
  const action = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia?.(RAIL_QUERY).matches ?? false);
  const [numbersOpen, setNumbersOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.(RAIL_QUERY);
    if (!media) return;
    const changed = () => setWide(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (wide) setNumbersOpen(false);
  }, [wide]);

  useEffect(() => {
    const box = content.current;
    const mark = rest.current;
    if (!box || !mark || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const below = !!entry.rootBounds && entry.boundingClientRect.top >= entry.rootBounds.bottom;
        setStuck(!entry.isIntersecting && below);
      },
      { root: box, threshold: 0 },
    );
    observer.observe(mark);
    return () => observer.disconnect();
  }, []);

  // A new card starts at its top, with focus on its heading so it is announced.
  const shown = useRef(index);
  useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    if (content.current) content.current.scrollTop = 0;
    document.getElementById("screen-title")?.focus({ preventScroll: true });
  }, [index]);

  // Once an answer is checked: a verdict that appears off-screen, or behind
  // the stuck action bar, is scrolled to its beginning. After a wrong first
  // try the action waits for a new pick, so focus moves to the first option
  // still open instead of being lost with the disabled button.
  const judged = useRef({ index, verdictKey });
  useEffect(() => {
    const before = judged.current;
    judged.current = { index, verdictKey };
    if (before.index !== index || before.verdictKey === verdictKey) return;
    const box = content.current;
    const verdict = box?.querySelector<HTMLElement>("#task-feedback");
    if (!box || !verdict) return;
    const visible = box.getBoundingClientRect();
    const top = verdict.getBoundingClientRect().top;
    if (top < visible.top || top >= visibleBottom(visible, action.current?.getBoundingClientRect())) box.scrollTop += top - visible.top;
    const focused = document.activeElement;
    if (!focused || focused === document.body || (focused instanceof HTMLButtonElement && focused.disabled)) {
      box.querySelector<HTMLInputElement>(".answer-fieldset input:not(:disabled)")?.focus({ preventScroll: true });
    }
  }, [index, verdictKey]);

  return { content, rest, action, stuck, wide, numbersOpen, setNumbersOpen };
}
