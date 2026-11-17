import { useLayoutEffect, useRef, useState } from "react";
import { lineCount, rowFits, wordCount } from "../lib/tileFit";
import { remeasure } from "./remeasure";

// Decides whether answer tiles with text fit in one row or must stack, by measuring a hidden copy of the row.

function seenText(element: Node): string {
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === 3) text += node.nodeValue ?? "";
    else if (node.nodeType === 1 && /^annotation(-xml)?$/i.test((node as Element).localName)) return;
    node.childNodes.forEach(walk);
  };
  walk(element);
  return text;
}

export function useTileFit<T extends HTMLElement>(key: string, active: boolean) {
  const ref = useRef<T>(null);
  const [fit, setFit] = useState<"row" | "stack">("row");
  useLayoutEffect(() => {
    const copy = ref.current;
    if (!active || !copy) return;
    const measure = () => {
      const boxes = Array.from(copy.querySelectorAll<HTMLElement>(".choice-text")).map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, lines: lineCount(Array.from(range.getClientRects?.() ?? [])), words: wordCount(seenText(el)) };
      });

      const heads = copy.classList.contains("is-multi") ? Array.from(copy.querySelectorAll<HTMLElement>(".choice-letter")).map((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, lines: 1, words: 1 })) : [];
      setFit(rowFits([...boxes, ...heads]) ? "row" : "stack");
    };
    return remeasure(measure, [copy]);
  }, [key, active]);
  return { ref, fit };
}
