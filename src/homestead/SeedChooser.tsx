// The seed chooser, shown in the place of a thing's card: its heading with
// the free experience, then a row for each quality with its picture, its
// name, what it takes to grow and one button, «Купить за N опыта». Experience
// is never earned twice, so a purchase is confirmed: the first tap turns the
// row, in place, into «Отмена» and «Купить», and «Купить» ignores taps for a
// moment after it appears, so the second tap of a double tap buys nothing. A
// seed that costs too much keeps its button in the Tab order: it is described
// by what is missing and says so when tapped.
import { useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { announce } from "@/ui/components/Announcer";
import { Button } from "@/ui/components/ui/button";
import { w } from "./strings";
import { bedsFull, QUALITIES, SEEDS, type Homestead, type Quality } from "./rules";
import { Seed } from "./Turnip";

export const CHOOSER_TITLE_ID = "homestead-chooser-title";
const buyId = (type: Quality) => `homestead-buy-${type}`;
const nameId = (type: Quality) => `homestead-seed-name-${type}`;
const shortId = (type: Quality) => `homestead-seed-short-${type}`;

/** How long «Купить» ignores taps after it appears: longer than the slowest usual double click. */
const CONFIRM_GUARD_MS = 500;

type RowProps = {
  type: Quality;
  free: number;
  /** When this row's confirm appeared (`performance.now()`), or null while it shows its button; one confirm is open at a time. */
  shownAt: number | null;
  onShow: (type: Quality | null) => void;
  onBuy: (type: Quality) => void;
};

function Row({ type, free, shownAt, onShow, onBuy }: RowProps) {
  const { price, total } = SEEDS[type];
  const lack = price - free;
  const action = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const confirming = shownAt !== null && lack <= 0;
  /** Back to the row's button, with focus on it. */
  const back = () => {
    flushSync(() => onShow(null));
    action.current?.focus();
  };
  const open = () => {
    if (lack > 0) return announce(w.chooser.short(lack));
    flushSync(() => onShow(type));
    confirmButton.current?.focus();
  };
  const confirm = () => {
    if (shownAt === null || performance.now() - shownAt < CONFIRM_GUARD_MS) return;
    back();
    onBuy(type);
  };
  // A held key's repeats never buy: only a new press does.
  const held = (event: KeyboardEvent) => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
  };
  return (
    <li className="homestead-chooser-row" data-quality={type}>
      <span className="homestead-chooser-art" aria-hidden="true">
        <Seed type={type} />
      </span>
      <span className="homestead-chooser-name">
        <b id={nameId(type)}>{w.chooser.name[type]}</b>
        <small>{w.chooser.takes(total)}</small>
      </span>
      {lack > 0 && (
        <span hidden id={shortId(type)}>
          {w.chooser.short(lack)}
        </span>
      )}
      {confirming ? (
        <span className="homestead-chooser-confirm">
          {/* «Купить» last, where the row's button was, so a double tap's second tap lands on it and is ignored. */}
          <Button type="button" size="sm" variant="outline" id={`homestead-buy-cancel-${type}`} onClick={back}>
            {w.chooser.cancel}
          </Button>
          <Button ref={confirmButton} type="button" size="sm" className="homestead-chooser-buy" id={`homestead-buy-confirm-${type}`} aria-describedby={nameId(type)} onKeyDown={held} onClick={confirm}>
            {w.chooser.buy}
          </Button>
        </span>
      ) : (
        <Button ref={action} type="button" size="sm" id={buyId(type)} className="homestead-chooser-action" aria-disabled={lack > 0 || undefined} aria-describedby={lack > 0 ? `${nameId(type)} ${shortId(type)}` : nameId(type)} onClick={open}>
          {w.chooser.action(price)}
        </Button>
      )}
    </li>
  );
}

type Props = { home: Homestead; free: number; onBuy: (type: Quality) => void; onClose: () => void };

export function SeedChooser({ home, free, onBuy, onClose }: Props) {
  const [open, setOpen] = useState<{ type: Quality; at: number } | null>(null);
  const show = (type: Quality | null) => setOpen(type ? { type, at: performance.now() } : null);
  const escape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  };
  return (
    <section className="homestead-chooser" aria-labelledby={CHOOSER_TITLE_ID} onKeyDown={escape}>
      <div className="homestead-chooser-head">
        <h2 id={CHOOSER_TITLE_ID} tabIndex={-1}>
          {w.chooser.title}
        </h2>
        <Button type="button" variant="outline" size="sm" className="homestead-close" id="homestead-chooser-close" aria-label={w.chooser.close} onClick={onClose}>
          ×
        </Button>
      </div>
      <p className="homestead-chooser-balance">{w.chooser.balance(free)}</p>
      {bedsFull(home) && <p className="homestead-note">{w.chooser.bedsFull}</p>}
      <ul className="homestead-chooser-rows">
        {QUALITIES.map((type) => (
          <Row key={type} type={type} free={free} shownAt={open?.type === type ? open.at : null} onShow={show} onBuy={onBuy} />
        ))}
      </ul>
    </section>
  );
}
