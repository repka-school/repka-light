import { BookOpen } from "lucide-react";
import { DialogContent, DialogHeader, DialogTitle } from "@/ui/components/ui/dialog";
import { useRovingFocus } from "@/ui/hooks/useRovingFocus";
import { isQuestion, type Lesson } from "@/content/types";
import { cardState, questionNumber, type CardState, type State } from "@/lesson/session";
import { stateLabel, stateMark } from "@/lesson/words";
import { t } from "@/strings";

const numberClass: Record<CardState, string> = { unanswered: "unanswered", waiting: "waiting", first: "correct", second: "second", wrong: "incorrect" };

/**
 * The lesson's cards as numbered buttons, each showing how its question
 * stands: in a side rail on a wide screen, in a dialog on a narrow one.
 */
export function QuestionNavigator({ lesson, state, wide, onGoTo }: { lesson: Lesson; state: State; wide: boolean; onGoTo: (index: number) => void }) {
  const numbers = useRovingFocus<HTMLDivElement>(lesson.cards.length, state.index);
  const grid = (
    <div className="question-numbers" ref={numbers.ref} onKeyDown={numbers.onKeyDown}>
      {lesson.cards.map((card, i) => {
        const theory = !isQuestion(card);
        const cs = cardState(state.entries[i]);
        const mark = stateMark(cs);
        const number = questionNumber(lesson, i);
        return (
          <button
            type="button"
            key={card.id}
            id={`question-number-${i}`}
            {...numbers.item(i)}
            className={`question-number ${theory ? "theory" : numberClass[cs]}`}
            data-state={theory ? "theory" : cs}
            title={theory ? t.theory : undefined}
            aria-label={theory ? t.theory : `${t.question(number)}: ${stateLabel(cs)}`}
            aria-current={i === state.index ? "step" : undefined}
            onClick={() => onGoTo(i)}
          >
            {theory ? (
              <BookOpen className="theory-icon" aria-hidden="true" />
            ) : (
              <span>{number}</span>
            )}
            {!theory && mark && (
              <span className={cs === "second" ? "question-badge" : "question-status"} aria-hidden="true">
                {mark}
              </span>
            )}
            {!theory && cs === "waiting" && <span className="question-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
  if (wide) {
    return (
      <aside className="practice-rail">
        <nav className="question-navigation" aria-label={t.navigation}>
          <div className="navigation-heading">
            <h2>{t.navigation}</h2>
          </div>
          {grid}
        </nav>
      </aside>
    );
  }
  return (
    <DialogContent className="numbers-panel" closeLabel={t.close} aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{t.navigation}</DialogTitle>
      </DialogHeader>
      <nav className="question-navigation" aria-label={t.navigation}>
        {grid}
      </nav>
    </DialogContent>
  );
}
