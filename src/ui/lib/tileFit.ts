// A row of text tiles fits when no text overflows its column and each takes one line, or two lines of at most two words.
export type TileBox = { scrollWidth: number; clientWidth: number; lines: number; words: number };

export function rowFits(boxes: TileBox[]): boolean {
  return boxes.length > 0 && boxes.every((b) => b.scrollWidth <= b.clientWidth + 1 && (b.lines <= 1 || (b.lines === 2 && b.words <= 2)));
}

export function lineCount(rects: { top: number; bottom: number }[]): number {
  let lines = 0;
  let line = { top: 0, bottom: 0 };
  for (const r of [...rects].sort((a, b) => a.top - b.top)) {
    const inside = Math.min(r.bottom, line.bottom) - Math.max(r.top, line.top);
    if (lines > 0 && inside > (r.bottom - r.top) / 2) {
      line = { top: Math.min(line.top, r.top), bottom: Math.max(line.bottom, r.bottom) };
    } else {
      lines++;
      line = { top: r.top, bottom: r.bottom };
    }
  }
  return lines;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
