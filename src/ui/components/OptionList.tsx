import { cn } from "../lib/utils";
import { hasOptionText, OptionText, type OptionTextLabels } from "./OptionText";

// A read-only list of a question's options with the right and the chosen ones marked.

export function OptionList({
  choices,
  label,
  zoomLabel,
  brokenLabel,
  formulaLabel,
  tableLabel,
  placeholder,
  correct = [],
  mine = [],
  describe,
  className,
}: {
  choices: { value: string; label: string; html?: string }[];
  label: string;
  placeholder?: string;
  correct?: string[];
  mine?: string[];
  describe?: (state: { correct: boolean; wrong: boolean; mine: boolean }) => string;
  className?: string;
} & OptionTextLabels) {
  if (!placeholder && !hasOptionText(choices)) return null;
  return (
    <ul className={cn("option-list", className)} aria-label={label}>
      {choices.map((c) => {
        const isCorrect = correct.includes(c.value);
        const isMine = mine.includes(c.value);
        const isWrong = isMine && !isCorrect;
        const words = describe?.({ correct: isCorrect, wrong: isWrong, mine: isMine }) ?? "";
        return (
          <li key={c.value} className={cn("option-item", isCorrect && "is-correct", isWrong && "is-wrong")}>
            <span className="option-letter">
              {c.label}
              {(isCorrect || isWrong) && (
                <span className="option-mark" aria-hidden="true">
                  {isCorrect ? "✓" : "✗"}
                </span>
              )}
            </span>
            <span className="option-text">{placeholder && !c.html ? placeholder : <OptionText html={c.html ?? ""} zoomLabel={zoomLabel} brokenLabel={brokenLabel} formulaLabel={formulaLabel} tableLabel={tableLabel} />}</span>
            {words && <span className="sr-only">{words}</span>}
          </li>
        );
      })}
    </ul>
  );
}
