import type { ReactNode } from "react";
import { useTileFit } from "../hooks/useTileFit";
import { cn } from "../lib/utils";

// Answer options as large tiles: radios for one right answer, checkboxes for several.

export type Choice = { value: string; label: ReactNode; text?: ReactNode;  name?: string };

export type ChoiceState = { correct: boolean; wrong: boolean; mine: boolean };

export type ChoiceKind = "single" | "multi";

type Tiles = {
  name: string;
  legend: string;
  choices: Choice[];

  correct?: string[];

  wrong?: string[];

  mine?: string[];

  marks?: boolean;
  describe?: (choice: Choice, state: ChoiceState) => string;
  className?: string;
};

const box = <span className="choice-box" aria-hidden="true" />;

function face(c: Choice, mark: ReactNode, texts: boolean, hidden: boolean, multi = false): ReactNode {
  const aria = hidden ? true : undefined;
  if (texts) {
    return (
      <>
        <span className="choice-letter" aria-hidden={aria}>
          {multi && box}
          {c.label}
          {mark}
        </span>
        <span className="choice-text" aria-hidden={aria} data-testid="choice-text">
          {c.text}
        </span>
      </>
    );
  }
  if (multi) {
    return (
      <>
        <span className="choice-pick">
          {box}
          {c.label}
        </span>
        {mark}
      </>
    );
  }
  return hidden ? (
    <span aria-hidden="true">
      {c.label}
      {mark}
    </span>
  ) : (
    <>
      {c.label}
      {mark}
    </>
  );
}

function judged(c: Choice, { correct = [], wrong = [], mine = [], marks = true, describe }: Pick<Tiles, "correct" | "wrong" | "mine" | "marks" | "describe">) {
  const isCorrect = marks && correct.includes(c.value);
  const isWrong = marks && wrong.includes(c.value);
  const label = describe ? describe(c, { correct: isCorrect, wrong: isWrong, mine: mine.includes(c.value) }) : c.name;
  const mark = (isCorrect || isWrong) && (
    <span className="choice-mark" aria-hidden="true" data-testid="choice-mark">
      {isCorrect ? "✓" : "✗"}
    </span>
  );
  return { isCorrect, isWrong, label, mark };
}

function TileFrame({ legend, choices, className, disabled, multi = false, note, children }: { legend: string; choices: Choice[]; className?: string; disabled?: boolean; multi?: boolean; note?: { id: string; text: string }; children: (texts: boolean) => ReactNode }) {
  const texts = choices.length > 0 && choices.every((c) => c.text !== undefined);
  const { ref, fit } = useTileFit<HTMLDivElement>(choices.map((c) => c.name ?? c.value).join("|"), texts);
  const layout = texts ? (fit === "row" ? "has-text is-row" : "has-text is-stack") : "";
  const columns = multi ? ["is-multi", `is-count-${choices.length}`] : [choices.length === 6 && "is-six"];
  return (
    <fieldset className={cn("answer-fieldset", className)} disabled={disabled} aria-describedby={note?.id}>
      <legend>{legend}</legend>
      <div className="choices-frame">
        <div className={cn("choices", layout, ...columns)} data-fit={texts ? fit : "letters"}>
          {children(texts)}
        </div>
        {texts && (
          <div className={cn("choices has-text is-row choices-measure", ...columns)} ref={ref} aria-hidden="true">
            {choices.map((c) => (
              <span className="choice" key={c.value}>
                <span>
                  <span className="choice-letter">
                    {multi && box}
                    {c.label}
                    {multi && <span className="choice-mark">✓</span>}
                  </span>
                  <span className="choice-text">{c.text}</span>
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      {note && (
        <p className="choices-note" id={note.id}>
          {note.text}
        </p>
      )}
    </fieldset>
  );
}

export function ChoiceGroup({
  name,
  legend,
  choices,
  kind = "single",
  selected,
  onSelect,
  disabled,
  correct,
  wrong,
  mine,
  marks,
  locked = [],
  note,
  describe,
  className,
}: Tiles & {
  kind?: ChoiceKind;
  selected: string[];

  onSelect: (value: string) => void;
  disabled?: boolean;
  locked?: string[];

  note?: { id: string; text: string };
}) {
  const multi = kind === "multi";
  return (
    <TileFrame legend={legend} choices={choices} className={className} disabled={disabled} multi={multi} note={note}>
      {(texts) =>
        choices.map((c) => {
          const { isCorrect, isWrong, label, mark } = judged(c, { correct, wrong, mine, marks, describe });
          const isLocked = locked.includes(c.value);
          return (
            <label key={c.value} className={cn("choice", isCorrect && "is-correct", isWrong && "is-wrong", isLocked && "is-locked")}>
              <input type={multi ? "checkbox" : "radio"} name={name} value={c.value} checked={selected.includes(c.value)} disabled={isLocked} aria-label={label} onChange={() => onSelect(c.value)} />
              <span>{face(c, mark, texts, false, multi)}</span>
            </label>
          );
        })
      }
    </TileFrame>
  );
}

// The same tiles as a picture of an answered task: nothing to press and no
// focus stop. A screen reader gets each tile's name; the drawn face is hidden.
export function StaticChoices({ legend, choices, correct, wrong, mine, describe, className }: Omit<Tiles, "name" | "marks">) {
  return (
    <TileFrame legend={legend} choices={choices} className={cn("is-static", className)}>
      {(texts) =>
        choices.map((c) => {
          const { isCorrect, isWrong, label, mark } = judged(c, { correct, wrong, mine, describe });
          return (
            <span key={c.value} className={cn("choice is-static", isCorrect && "is-correct", isWrong && "is-wrong")} data-value={c.value}>
              <span>
                <span className="sr-only">{label}</span>
                {face(c, mark, texts, true)}
              </span>
            </span>
          );
        })
      }
    </TileFrame>
  );
}
