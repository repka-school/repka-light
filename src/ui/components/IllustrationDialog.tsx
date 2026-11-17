import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { scaledSize, windowScales, type Size } from "../lib/illustrationScale";
import { SCREEN_TITLE_ID } from "./PageHeading";
import { Button } from "./ui/button";

// A full-size view of a task picture in a native <dialog>, with a fitted and an enlarged size.

export type IllustrationDialogLabels = { title: string; close: string; larger: string; whole: string; broken: string };

export type IllustrationOpening = { src: string; alt: string; opener?: HTMLElement | null; drawn?: Size | null };

type IllustrationDialogApi = { open: (opening: IllustrationOpening) => void };
const IllustrationDialogContext = createContext<IllustrationDialogApi | null>(null);

type Phase = "loading" | "loaded" | "failed";
type Shown = IllustrationOpening & { key: number };

type FocusBack = { opener: HTMLElement | null; root: Element | null; index: number };

function focusBack(opener: HTMLElement | null): FocusBack {
  const root = opener?.closest(".rich-body") ?? null;
  const index = root && opener ? Array.from(root.querySelectorAll(".illustration-button")).indexOf(opener) : -1;
  return { opener, root, index };
}

function returnFocus(back: FocusBack | null, headingId: string) {
  if (back?.opener?.isConnected) return back.opener.focus();
  const again = back?.root?.isConnected && back.index >= 0 ? back.root.querySelectorAll<HTMLElement>(".illustration-button")[back.index] : undefined;
  if (again) return again.focus();
  document.getElementById(headingId)?.focus({ preventScroll: true });
}

function measure(area: HTMLElement | null): Size | null {
  if (!area) return null;
  const rect = area.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? { width: rect.width, height: rect.height } : null;
}

export function IllustrationDialogProvider({ labels, id = "illustration-dialog", headingId = SCREEN_TITLE_ID, children }: { labels: IllustrationDialogLabels; id?: string; headingId?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const back = useRef<FocusBack | null>(null);
  const centre = useRef({ x: 0.5, y: 0.5 });
  const openings = useRef(0);
  const [shown, setShown] = useState<Shown | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [natural, setNatural] = useState<Size | null>(null);
  const [area, setArea] = useState<Size | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const open = useCallback(({ src, alt, opener, drawn }: IllustrationOpening) => {
    back.current = focusBack(opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null));
    centre.current = { x: 0.5, y: 0.5 };
    openings.current += 1;
    setShown({ src, alt, opener, drawn, key: openings.current });
    setPhase("loading");
    setNatural(null);
    setEnlarged(false);
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
  }, []);
  const close = () => ref.current?.close();
  const onClose = () => {
    if (ref.current?.open) return;
    setShown(null);
    returnFocus(back.current, headingId);
    back.current = null;
  };

  const loaded = (image: HTMLImageElement) => {
    setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    setPhase("loaded");
  };

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (shown && image?.complete && image.naturalWidth > 0) loaded(image);
  }, [shown]);

  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!shown || !element) return;
    setArea(measure(element));
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setArea(measure(element)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);

  const scales = phase === "loaded" && natural && natural.width > 0 && natural.height > 0 && area ? windowScales(natural, area, shown?.drawn) : null;
  const size = scales && natural ? scaledSize(natural, enlarged ? scales.enlarged : scales.fitted) : shown?.drawn && phase === "loading" ? scaledSize(shown.drawn, 1) : null;

  useLayoutEffect(() => {
    const element = areaRef.current;
    if (!element) return;
    element.scrollLeft = centre.current.x * element.scrollWidth - element.clientWidth / 2;
    element.scrollTop = centre.current.y * element.scrollHeight - element.clientHeight / 2;
    setOverflows(element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
  }, [size?.width, size?.height, area?.width, area?.height, phase]);

  const onScroll = (event: SyntheticEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollWidth > 0 && element.scrollHeight > 0) {
      centre.current = { x: (element.scrollLeft + element.clientWidth / 2) / element.scrollWidth, y: (element.scrollTop + element.clientHeight / 2) / element.scrollHeight };
    }
  };

  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    const dialog = ref.current;
    if (!dialog || event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside || box.width === 0) close();
  };

  const scrolling = overflows && phase === "loaded" ? { tabIndex: 0, role: "group", "aria-label": shown?.alt } : {};
  return (
    <IllustrationDialogContext.Provider value={{ open }}>
      {children}
      <dialog id={id} ref={ref} className="illustration-dialog" aria-labelledby={`${id}-title`} onClick={onClick} onClose={onClose}>
        <div className="dialog-top">
          <h2 id={`${id}-title`}>{labels.title}</h2>
          <div className="dialog-actions">
            <Button id={`${id}-size`} type="button" variant="outline" disabled={phase !== "loaded"} onClick={() => setEnlarged((e) => !e)}>
              {enlarged ? labels.whole : labels.larger}
            </Button>
            <Button id={`${id}-close`} ref={closeRef} type="button" variant="outline" onClick={close}>
              {labels.close}
            </Button>
          </div>
        </div>
        <div ref={areaRef} className="illustration-area" onScroll={onScroll} {...scrolling}>
          {shown && phase === "failed" ? <p className="illustration-error">{labels.broken}</p> : null}
          {shown && phase !== "failed" ? (
            <img
              key={shown.key}
              ref={imageRef}
              id={`${id}-image`}
              src={shown.src}
              alt={shown.alt}
              width={size?.width}
              height={size?.height}
              onLoad={(event) => loaded(event.currentTarget)}
              onError={() => setPhase("failed")}
            />
          ) : null}
        </div>
      </dialog>
    </IllustrationDialogContext.Provider>
  );
}

export function useIllustrationDialog(): IllustrationDialogApi | null {
  return useContext(IllustrationDialogContext);
}
