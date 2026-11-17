// Sizes for the illustration window: fitted to the window, or enlarged.
export type Size = { width: number; height: number };

export const MAX_FIT = 4;

export function drawnIn(box: Size, natural: Size): Size {
  if (!(natural.width > 0 && natural.height > 0)) return { width: box.width, height: box.height };
  const k = Math.min(box.width / natural.width, box.height / natural.height);
  return { width: k * natural.width, height: k * natural.height };
}

export function windowScales(natural: Size, area: Size, drawn?: Size | null): { fitted: number; enlarged: number } {
  const fit = Math.min(area.width / natural.width, area.height / natural.height, MAX_FIT);
  const fitted = Math.max(fit, drawn ? drawn.width / natural.width : 0);
  return { fitted, enlarged: Math.max(2 * fitted, 1) };
}

export function scaledSize(natural: Size, scale: number): Size {
  const px = (n: number) => Math.max(1, Math.floor(n * scale + 1e-6));
  return { width: px(natural.width), height: px(natural.height) };
}
