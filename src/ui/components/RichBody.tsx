import { useEffect, useRef, type ComponentProps } from "react";
import { remeasure } from "../hooks/remeasure";
import { drawnIn } from "../lib/illustrationScale";
import { cn } from "../lib/utils";
import { useIllustrationDialog } from "./IllustrationDialog";

// Renders prepared task HTML; every picture in it becomes a button that opens the full-size view.

export type RichBodyProps = Omit<ComponentProps<"div">, "children" | "dangerouslySetInnerHTML"> & {
  html: string;

  as?: "div" | "span";

  zoomLabel: string;
  brokenLabel: string;

  formulaLabel: string;

  tableLabel: string;
};

function markBox(box: HTMLElement, role: "group" | "region", label: string) {
  const scrolls = getComputedStyle(box).overflowX !== "visible";
  if (scrolls && box.scrollWidth > box.clientWidth + 1) {
    box.tabIndex = 0;
    box.setAttribute("role", role);
    box.setAttribute("aria-label", label);
  } else {
    box.removeAttribute("tabindex");
    box.removeAttribute("role");
    box.removeAttribute("aria-label");
  }
}

function wrapDisplay(root: HTMLElement) {
  root.querySelectorAll<Element>('math[display="block"]').forEach((math) => {
    if (math.parentElement?.classList.contains("formula")) return;
    const box = document.createElement("span");
    box.className = "formula formula-display";
    math.replaceWith(box);
    box.append(math);
  });
}

export function RichBody({ html, zoomLabel, brokenLabel, formulaLabel, tableLabel, className, as: Tag = "div", ...props }: RichBodyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dialog = useIllustrationDialog();
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      if (img.closest(".illustration-button")) return;
      const parent = img.parentElement;
      if (!parent) return;
      const standalone = !img.closest("td, th") && (parent === root || !parent.textContent?.trim());
      const button = document.createElement("button");
      button.type = "button";
      button.className = standalone ? "illustration-button illustration-block" : "illustration-button";
      button.setAttribute("aria-label", img.alt ? `${zoomLabel}: ${img.alt}` : zoomLabel);
      img.replaceWith(button);
      button.append(img);
      button.onclick = () => {
        const box = img.getBoundingClientRect();
        const drawn = drawnIn({ width: box.width, height: box.height }, { width: img.naturalWidth, height: img.naturalHeight });
        dialog?.open({ src: img.currentSrc || img.src, alt: img.alt, opener: button, drawn: drawn.width > 0 && drawn.height > 0 ? drawn : null });
      };
      img.onerror = () => {
        const note = document.createElement("span");
        note.className = "illustration-error";
        note.textContent = brokenLabel;
        button.replaceWith(note);
      };
    });
  }, [html, zoomLabel, brokenLabel, dialog]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    wrapDisplay(root);
    const boxes = [
      ...Array.from(root.querySelectorAll<HTMLElement>(".formula")).map((box) => ({ box, role: "group" as const, label: formulaLabel })),
      ...Array.from(root.querySelectorAll<HTMLElement>(".scroll-frame")).map((box) => ({ box, role: "region" as const, label: tableLabel })),
    ];
    if (boxes.length === 0) return;

    const targets = boxes.flatMap(({ box }) => (box.firstElementChild ? [box, box.firstElementChild] : [box]));
    return remeasure(() => boxes.forEach(({ box, role, label }) => markBox(box, role, label)), targets);
  }, [html, formulaLabel, tableLabel]);
  return <Tag ref={ref} className={cn("rich-body", className)} dangerouslySetInnerHTML={{ __html: html }} {...props} />;
}
