// Runs `measure` now and again whenever a target resizes or a web font finishes loading; returns the cleanup.
export function remeasure(measure: () => void, targets: Element[]): () => void {
  let live = true;
  const again = () => {
    if (live) measure();
  };
  measure();
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  void fonts?.ready.then(again);
  fonts?.addEventListener?.("loadingdone", again);
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(again);
  targets.forEach((target) => observer?.observe(target));
  return () => {
    live = false;
    fonts?.removeEventListener?.("loadingdone", again);
    observer?.disconnect();
  };
}
